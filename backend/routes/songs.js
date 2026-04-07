const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Song = require('../models/Song');
const Artist = require('../models/Artist');
const Album = require('../models/Album');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = file.fieldname === 'audio'
      ? path.join(__dirname, '../uploads/audio')
      : path.join(__dirname, '../uploads/images');
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'audio') {
    cb(null, /audio\/(mpeg|wav|ogg|mp3)/.test(file.mimetype));
  } else {
    cb(null, /image\/(jpeg|jpg|png|gif|webp)/.test(file.mimetype));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

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
    res.status(500).json({ message: 'Server error' });
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
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/songs/search?q=
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const regex = new RegExp(q.trim(), 'i');
    const songs = await Song.find({
      $or: [{ title: regex }, { genre: regex }]
    })
      .populate('artist', 'name image')
      .populate('album', 'title coverUrl')
      .limit(30);

    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/songs/:id
router.get('/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id)
      .populate('artist', 'name image bio followers')
      .populate('album', 'title coverUrl releaseDate');
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }
    res.json(song);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Song not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/songs/:id/stream
router.get('/:id/stream', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    if (song.audioUrl.startsWith('http')) {
      return res.redirect(song.audioUrl);
    }

    const filePath = path.join(__dirname, '..', song.audioUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Audio file not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'audio/mpeg'
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Song not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/songs (admin)
router.post('/', adminAuth, upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, artistId, albumId, duration, genre } = req.body;

    if (!title || !artistId || !duration) {
      return res.status(400).json({ message: 'Title, artistId, and duration are required' });
    }

    const artist = await Artist.findById(artistId);
    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    const audioUrl = req.files?.audio
      ? `/uploads/audio/${req.files.audio[0].filename}`
      : req.body.audioUrl;

    if (!audioUrl) {
      return res.status(400).json({ message: 'Audio file or URL is required' });
    }

    const coverUrl = req.files?.cover
      ? `/uploads/images/${req.files.cover[0].filename}`
      : (req.body.coverUrl || `https://picsum.photos/seed/${Date.now()}/300/300`);

    const song = await Song.create({
      title,
      artist: artistId,
      album: albumId || null,
      duration: Number(duration),
      audioUrl,
      coverUrl,
      genre: genre || 'Unknown'
    });

    artist.songs.push(song._id);
    await artist.save();

    if (albumId) {
      const album = await Album.findById(albumId);
      if (album) {
        album.songs.push(song._id);
        await album.save();
      }
    }

    const populated = await Song.findById(song._id)
      .populate('artist', 'name image')
      .populate('album', 'title coverUrl');

    res.status(201).json(populated);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(error.errors).map(e => e.message).join(', ') });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/songs/:id (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    await Artist.updateMany({ songs: song._id }, { $pull: { songs: song._id } });
    await Album.updateMany({ songs: song._id }, { $pull: { songs: song._id } });

    await song.deleteOne();
    res.json({ message: 'Song deleted successfully' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Song not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/songs/:id/like
router.post('/:id/like', auth, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    const user = await User.findById(req.user._id);
    const alreadyLiked = user.likedSongs.includes(song._id);

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
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Song not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/songs/:id/play
router.post('/:id/play', auth, async (req, res) => {
  try {
    const song = await Song.findByIdAndUpdate(
      req.params.id,
      { $inc: { plays: 1 } },
      { new: true }
    );
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
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
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Song not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
