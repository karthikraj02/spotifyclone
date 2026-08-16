const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Song = require('../models/Song');
const Artist = require('../models/Artist');
const Album = require('../models/Album');
const User = require('../models/User');
const Playlist = require('../models/Playlist');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && String(id).length === 24;

// MIME type map for audio streaming
const AUDIO_MIME_TYPES = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.webm': 'audio/webm'
};

// Uploads directory (resolved once)
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = file.fieldname === 'audio'
      ? path.join(UPLOADS_DIR, 'audio')
      : path.join(UPLOADS_DIR, 'images');
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Generate safe filename: timestamp-random.ext
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'audio') {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.webm'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file type. Only MP3, WAV, OGG, M4A, FLAC, AAC, and WebM are allowed.'));
    }
  } else {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Multer error handler wrapper
const handleUpload = (uploadMiddleware) => (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, message: 'File too large. Maximum size is 50MB.' });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err) {
      return res.status(415).json({ success: false, message: err.message });
    }
    next();
  });
};

// File signature ("magic bytes") checks - a malicious file can be trivially renamed
// to end in .mp3 or .jpg to slip past an extension-only check, so this reads the
// first few real bytes on disk and confirms they match a known container format
// for the field the file was uploaded under before the upload is accepted.
const matchesSignature = (buf, ext) => {
  if (buf.length < 4) return false;
  const b = buf;
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
    case '.png':
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
    case '.gif':
      return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38;
    case '.webp':
      return b.length >= 12 && b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP';
    case '.mp3':
      return (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) || // ID3 tag
             (b[0] === 0xFF && (b[1] & 0xE0) === 0xE0); // MPEG frame sync
    case '.wav':
      return b.length >= 12 && b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WAVE';
    case '.ogg':
      return b.slice(0, 4).toString('ascii') === 'OggS';
    case '.flac':
      return b.slice(0, 4).toString('ascii') === 'fLaC';
    case '.m4a':
      return b.length >= 8 && b.slice(4, 8).toString('ascii') === 'ftyp';
    case '.aac':
      return b[0] === 0xFF && (b[1] & 0xF6) === 0xF0; // ADTS sync word
    case '.webm':
      return b[0] === 0x1A && b[1] === 0x45 && b[2] === 0xDF && b[3] === 0xA3; // EBML header
    default:
      return false;
  }
};

const verifyUploadedFileSignatures = (req, res, next) => {
  if (!req.files) return next();

  const allFiles = [...(req.files.audio || []), ...(req.files.cover || [])];
  for (const file of allFiles) {
    let fd;
    try {
      const ext = path.extname(file.originalname).toLowerCase();
      fd = fs.openSync(file.path, 'r');
      const buf = Buffer.alloc(16);
      fs.readSync(fd, buf, 0, 16, 0);
      fs.closeSync(fd);
      fd = undefined;

      if (!matchesSignature(buf, ext)) {
        // Clean up every file from this request, not just the bad one
        for (const f of allFiles) {
          try { fs.unlinkSync(f.path); } catch (_) { /* best-effort cleanup */ }
        }
        return res.status(415).json({
          success: false,
          message: `The uploaded file for "${file.fieldname}" does not match its extension (${ext}). The file content does not look like a valid ${ext} file.`
        });
      }
    } catch (e) {
      if (fd !== undefined) { try { fs.closeSync(fd); } catch (_) { /* ignore */ } }
      return res.status(400).json({ success: false, message: 'Could not read uploaded file' });
    }
  }
  next();
};

// GET /api/songs - Get all songs (paginated)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [songs, total] = await Promise.all([
      Song.find()
        .populate('artist', 'name image')
        .populate('album', 'title coverUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Song.countDocuments()
    ]);

    res.json({
      songs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/songs/trending
router.get('/trending', async (req, res) => {
  try {
    const songs = await Song.find()
      .populate('artist', 'name image')
      .populate('album', 'title coverUrl')
      .sort({ plays: -1 })
      .limit(20);
    res.json(songs);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/songs/search?q=
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.json([]);
    }

    // Escape special regex characters to prevent regex injection
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    const songs = await Song.find({
      $or: [{ title: regex }, { genre: regex }]
    })
      .populate('artist', 'name image')
      .populate('album', 'title coverUrl')
      .limit(30);

    res.json(songs);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/songs/:id
router.get('/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid song ID' });
    }
    const song = await Song.findById(req.params.id)
      .populate('artist', 'name image bio followers')
      .populate('album', 'title coverUrl releaseDate');
    if (!song) {
      return res.status(404).json({ success: false, message: 'Song not found' });
    }
    res.json(song);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/songs/:id/stream
router.get('/:id/stream', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Song not found' });
    }
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ success: false, message: 'Song not found' });
    }

    // If audioUrl is external, redirect
    if (song.audioUrl.startsWith('http')) {
      return res.redirect(song.audioUrl);
    }

    // Resolve and validate file path (prevent path traversal)
    const filePath = path.resolve(__dirname, '..', song.audioUrl.replace(/^\//, ''));
    const normalizedUploads = path.resolve(UPLOADS_DIR);
    if (!filePath.startsWith(normalizedUploads)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Audio file not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    // Determine MIME type from file extension
    const ext = path.extname(filePath).toLowerCase();
    const contentType = AUDIO_MIME_TYPES[ext] || 'application/octet-stream';

    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Validate range
      if (isNaN(start) || start < 0 || start >= fileSize || end < start || end >= fileSize) {
        res.writeHead(416, {
          'Content-Range': `bytes */${fileSize}`,
          'Accept-Ranges': 'bytes'
        });
        return res.end();
      }

      const chunkSize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/songs (admin)
router.post('/', adminAuth, handleUpload(upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
])), verifyUploadedFileSignatures, async (req, res) => {
  try {
    const { title, artistId, albumId, duration, genre } = req.body;

    if (!title || !artistId || !duration) {
      return res.status(400).json({ success: false, message: 'Title, artistId, and duration are required' });
    }

    if (typeof artistId !== 'string' || !isValidObjectId(artistId)) {
      return res.status(400).json({ success: false, message: 'Invalid artistId' });
    }

    const parsedDuration = Number(duration);
    if (isNaN(parsedDuration) || parsedDuration <= 0 || !isFinite(parsedDuration)) {
      return res.status(400).json({ success: false, message: 'Duration must be a positive number' });
    }

    // Validate artist exists
    const artist = await Artist.findById(artistId);
    if (!artist) {
      return res.status(404).json({ success: false, message: 'Artist not found' });
    }

    // Validate album BEFORE creating song (Phase 5 fix)
    let album = null;
    if (albumId) {
      if (typeof albumId !== 'string' || !isValidObjectId(albumId)) {
        return res.status(400).json({ success: false, message: 'Invalid albumId' });
      }
      album = await Album.findById(albumId);
      if (!album) {
        return res.status(404).json({ success: false, message: 'Album not found' });
      }
      // Verify album belongs to the selected artist
      if (album.artist.toString() !== artistId) {
        return res.status(400).json({ success: false, message: 'Album does not belong to the selected artist' });
      }
    }

    const audioUrl = req.files?.audio
      ? `/uploads/audio/${req.files.audio[0].filename}`
      : req.body.audioUrl;

    if (!audioUrl) {
      return res.status(400).json({ success: false, message: 'Audio file or URL is required' });
    }

    const coverUrl = req.files?.cover
      ? `/uploads/images/${req.files.cover[0].filename}`
      : (req.body.coverUrl || `https://picsum.photos/seed/${Date.now()}/300/300`);

    const song = await Song.create({
      title: title.trim(),
      artist: artistId,
      album: albumId || null,
      duration: parsedDuration,
      audioUrl,
      coverUrl,
      genre: genre ? genre.trim() : 'Unknown'
    });

    // Update references
    artist.songs.push(song._id);
    await artist.save();

    if (album) {
      album.songs.push(song._id);
      await album.save();
    }

    const populated = await Song.findById(song._id)
      .populate('artist', 'name image')
      .populate('album', 'title coverUrl');

    res.status(201).json(populated);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: Object.values(error.errors).map(e => e.message).join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/songs/:id (admin) - edit metadata; audio/cover files are replaced separately if provided
router.put('/:id', adminAuth, handleUpload(upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
])), verifyUploadedFileSignatures, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid song ID' });
    }

    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ success: false, message: 'Song not found' });
    }

    const { title, artistId, albumId, duration, genre, audioUrl, coverUrl } = req.body;

    let newArtist = null;
    if (artistId !== undefined) {
      if (typeof artistId !== 'string' || !isValidObjectId(artistId)) {
        return res.status(400).json({ success: false, message: 'Invalid artistId' });
      }
      newArtist = await Artist.findById(artistId);
      if (!newArtist) {
        return res.status(404).json({ success: false, message: 'Artist not found' });
      }
    }

    let newAlbum = undefined; // undefined = "not touching this field"
    if (albumId !== undefined) {
      if (albumId === null || albumId === '') {
        newAlbum = null; // explicit clear
      } else {
        if (typeof albumId !== 'string' || !isValidObjectId(albumId)) {
          return res.status(400).json({ success: false, message: 'Invalid albumId' });
        }
        newAlbum = await Album.findById(albumId);
        if (!newAlbum) {
          return res.status(404).json({ success: false, message: 'Album not found' });
        }
        const effectiveArtistId = artistId || song.artist.toString();
        if (newAlbum.artist.toString() !== effectiveArtistId) {
          return res.status(400).json({ success: false, message: 'Album does not belong to the selected artist' });
        }
      }
    }

    const oldArtistId = song.artist.toString();
    const oldAlbumId = song.album ? song.album.toString() : null;

    if (title !== undefined) song.title = title.trim();
    if (duration !== undefined) {
      const parsedDuration = Number(duration);
      if (isNaN(parsedDuration) || parsedDuration <= 0 || !isFinite(parsedDuration)) {
        return res.status(400).json({ success: false, message: 'Duration must be a positive number' });
      }
      song.duration = parsedDuration;
    }
    if (genre !== undefined) song.genre = genre ? genre.trim() : 'Unknown';
    if (artistId !== undefined) song.artist = artistId;
    if (newAlbum !== undefined) song.album = newAlbum ? newAlbum._id : null;

    // Replace files only if new ones were uploaded; delete the old local file afterwards.
    const oldAudioPath = song.audioUrl;
    const oldCoverPath = song.coverUrl;

    if (req.files?.audio) {
      song.audioUrl = `/uploads/audio/${req.files.audio[0].filename}`;
    } else if (audioUrl) {
      song.audioUrl = audioUrl;
    }

    if (req.files?.cover) {
      song.coverUrl = `/uploads/images/${req.files.cover[0].filename}`;
    } else if (coverUrl) {
      song.coverUrl = coverUrl;
    }

    await song.save();

    // Keep Artist.songs / Album.songs reference arrays in sync if artist/album changed
    if (artistId !== undefined && artistId !== oldArtistId) {
      await Promise.all([
        Artist.updateOne({ _id: oldArtistId }, { $pull: { songs: song._id } }),
        Artist.updateOne({ _id: artistId }, { $addToSet: { songs: song._id } })
      ]);
    }
    if (newAlbum !== undefined) {
      const newAlbumId = newAlbum ? newAlbum._id.toString() : null;
      if (newAlbumId !== oldAlbumId) {
        if (oldAlbumId) await Album.updateOne({ _id: oldAlbumId }, { $pull: { songs: song._id } });
        if (newAlbumId) await Album.updateOne({ _id: newAlbumId }, { $addToSet: { songs: song._id } });
      }
    }

    // Clean up replaced local files (best-effort; ignore errors)
    if (req.files?.audio && oldAudioPath && !oldAudioPath.startsWith('http')) {
      const p = path.resolve(__dirname, '..', oldAudioPath.replace(/^\//, ''));
      if (p.startsWith(path.resolve(UPLOADS_DIR)) && fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (_) { /* best-effort cleanup */ }
      }
    }
    if (req.files?.cover && oldCoverPath && !oldCoverPath.startsWith('http')) {
      const p = path.resolve(__dirname, '..', oldCoverPath.replace(/^\//, ''));
      if (p.startsWith(path.resolve(UPLOADS_DIR)) && fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (_) { /* best-effort cleanup */ }
      }
    }

    const populated = await Song.findById(song._id)
      .populate('artist', 'name image')
      .populate('album', 'title coverUrl');

    res.json(populated);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: Object.values(error.errors).map(e => e.message).join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/songs/:id (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid song ID' });
    }
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ success: false, message: 'Song not found' });
    }

    // Clean all references (Phase 7 fix)
    await Promise.all([
      Artist.updateMany({ songs: song._id }, { $pull: { songs: song._id } }),
      Album.updateMany({ songs: song._id }, { $pull: { songs: song._id } }),
      User.updateMany({ likedSongs: song._id }, { $pull: { likedSongs: song._id } }),
      User.updateMany(
        { 'recentlyPlayed.song': song._id },
        { $pull: { recentlyPlayed: { song: song._id } } }
      ),
      Playlist.updateMany({ songs: song._id }, { $pull: { songs: song._id } })
    ]);

    // Delete uploaded files if local
    if (!song.audioUrl.startsWith('http')) {
      const audioPath = path.resolve(__dirname, '..', song.audioUrl.replace(/^\//, ''));
      if (audioPath.startsWith(path.resolve(UPLOADS_DIR)) && fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    }
    if (song.coverUrl && !song.coverUrl.startsWith('http')) {
      const coverPath = path.resolve(__dirname, '..', song.coverUrl.replace(/^\//, ''));
      if (coverPath.startsWith(path.resolve(UPLOADS_DIR)) && fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
      }
    }

    await song.deleteOne();
    res.json({ success: true, message: 'Song deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/songs/:id/like
// Uses atomic, conditional updates instead of read-modify-write so that two rapid/concurrent
// like requests for the same user+song can't push a duplicate array entry or double-increment
// the like counter (the previous implementation loaded both documents, mutated them in memory,
// and saved - a classic race condition under double-clicks or flaky networks retrying a request).
router.post('/:id/like', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid song ID' });
    }

    const songExists = await Song.exists({ _id: req.params.id });
    if (!songExists) {
      return res.status(404).json({ success: false, message: 'Song not found' });
    }

    const userId = req.user._id;
    const songId = req.params.id;

    // Attempt to like: only matches (and only increments) if not already liked
    const likeResult = await User.updateOne(
      { _id: userId, likedSongs: { $ne: songId } },
      { $addToSet: { likedSongs: songId } }
    );

    if (likeResult.modifiedCount > 0) {
      const updatedSong = await Song.findByIdAndUpdate(songId, { $inc: { likes: 1 } }, { new: true });
      return res.json({ liked: true, likes: updatedSong.likes });
    }

    // Not liked-just-now, so treat this click as an unlike
    const unlikeResult = await User.updateOne(
      { _id: userId, likedSongs: songId },
      { $pull: { likedSongs: songId } }
    );

    if (unlikeResult.modifiedCount > 0) {
      const updatedSong = await Song.findOneAndUpdate(
        { _id: songId, likes: { $gt: 0 } },
        { $inc: { likes: -1 } },
        { new: true }
      );
      return res.json({ liked: false, likes: updatedSong ? updatedSong.likes : 0 });
    }

    // Lost a race with another identical request in-flight; just report current state
    const currentSong = await Song.findById(songId).select('likes');
    res.json({ liked: false, likes: currentSong ? currentSong.likes : 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/songs/:id/play
router.post('/:id/play', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid song ID' });
    }
    const song = await Song.findByIdAndUpdate(
      req.params.id,
      { $inc: { plays: 1 } },
      { new: true }
    );
    if (!song) {
      return res.status(404).json({ success: false, message: 'Song not found' });
    }

    const user = await User.findById(req.user._id);
    user.recentlyPlayed = user.recentlyPlayed.filter(
      rp => rp.song.toString() !== song._id.toString()
    );
    user.recentlyPlayed.unshift({ song: song._id, playedAt: new Date() });
    user.recentlyPlayed = user.recentlyPlayed.slice(0, 50);
    await user.save();

    res.json({ plays: song.plays });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
