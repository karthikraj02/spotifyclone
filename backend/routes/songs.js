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
])), async (req, res) => {
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
router.post('/:id/like', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid song ID' });
    }
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ success: false, message: 'Song not found' });
    }

    const user = await User.findById(req.user._id);
    const alreadyLiked = user.likedSongs.some(id => id.toString() === song._id.toString());

    if (alreadyLiked) {
      user.likedSongs = user.likedSongs.filter(id => id.toString() !== song._id.toString());
      song.likes = Math.max(0, song.likes - 1);
    } else {
      user.likedSongs.push(song._id);
      song.likes += 1;
    }

    await Promise.all([user.save(), song.save()]);
    res.json({ liked: !alreadyLiked, likes: song.likes });
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
