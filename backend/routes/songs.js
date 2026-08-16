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

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Generate safe filename: timestamp-random
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    
    if (file.fieldname === 'audio') {
      return {
        folder: 'spotifyclone/audio',
        resource_type: 'video', // Audio must be uploaded as 'video' in Cloudinary
        public_id: safeName
      };
    } else {
      return {
        folder: 'spotifyclone/images',
        resource_type: 'image',
        public_id: safeName
      };
    }
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
// Trending score = (plays + 2*likes) * recency_decay
// recency_decay = 2^(-age_in_days / 7) — halves every 7 days
router.get('/trending', async (req, res) => {
  try {
    const now = new Date();
    const songs = await Song.aggregate([
      {
        $addFields: {
          ageMs: { $subtract: [now, '$createdAt'] },
          ageDays: { $divide: [{ $subtract: [now, '$createdAt'] }, 86400000] },
        }
      },
      {
        $addFields: {
          recencyDecay: {
            $pow: [2, { $multiply: [-1, { $divide: ['$ageDays', 7] }] }]
          }
        }
      },
      {
        $addFields: {
          trendingScore: {
            $multiply: [
              { $add: ['$plays', { $multiply: ['$likes', 2] }] },
              '$recencyDecay'
            ]
          }
        }
      },
      { $sort: { trendingScore: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'artists',
          localField: 'artist',
          foreignField: '_id',
          as: 'artist',
          pipeline: [{ $project: { name: 1, image: 1 } }]
        }
      },
      { $unwind: '$artist' },
      {
        $lookup: {
          from: 'albums',
          localField: 'album',
          foreignField: '_id',
          as: 'album',
          pipeline: [{ $project: { title: 1, coverUrl: 1 } }]
        }
      },
      {
        $addFields: {
          album: { $ifNull: [{ $arrayElemAt: ['$album', 0] }, null] }
        }
      },
      {
        $project: {
          ageMs: 0, ageDays: 0, recencyDecay: 0, trendingScore: 0
        }
      }
    ]);

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

    // Validate album BEFORE creating song
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
      ? req.files.audio[0].path // Cloudinary returns the secure URL in path
      : req.body.audioUrl;

    if (!audioUrl) {
      return res.status(400).json({ success: false, message: 'Audio file or URL is required' });
    }

    const coverUrl = req.files?.cover
      ? req.files.cover[0].path // Cloudinary returns the secure URL in path
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
])), async (req, res) => {
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
      song.audioUrl = req.files.audio[0].path;
    } else if (audioUrl) {
      song.audioUrl = audioUrl;
    }

    if (req.files?.cover) {
      song.coverUrl = req.files.cover[0].path;
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

    // Clean up replaced files from Cloudinary
    const extractPublicId = (url) => {
      if (!url) return null;
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      const folder = parts[parts.length - 2];
      return filename ? `${folder}/${filename.split('.')[0]}` : null;
    };

    if (req.files?.audio && oldAudioPath && oldAudioPath.includes('cloudinary.com')) {
      const publicId = extractPublicId(oldAudioPath);
      if (publicId) cloudinary.uploader.destroy(`spotifyclone/${publicId}`, { resource_type: 'video' }).catch(() => {});
    }
    if (req.files?.cover && oldCoverPath && oldCoverPath.includes('cloudinary.com')) {
      const publicId = extractPublicId(oldCoverPath);
      if (publicId) cloudinary.uploader.destroy(`spotifyclone/${publicId}`, { resource_type: 'image' }).catch(() => {});
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

    // Clean up replaced files from Cloudinary
    const extractPublicId = (url) => {
      if (!url) return null;
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      const folder = parts[parts.length - 2];
      return filename ? `${folder}/${filename.split('.')[0]}` : null;
    };

    if (song.audioUrl && song.audioUrl.includes('cloudinary.com')) {
      const publicId = extractPublicId(song.audioUrl);
      if (publicId) cloudinary.uploader.destroy(`spotifyclone/${publicId}`, { resource_type: 'video' }).catch(() => {});
    }
    if (song.coverUrl && song.coverUrl.includes('cloudinary.com')) {
      const publicId = extractPublicId(song.coverUrl);
      if (publicId) cloudinary.uploader.destroy(`spotifyclone/${publicId}`, { resource_type: 'image' }).catch(() => {});
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
