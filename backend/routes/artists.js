const express = require('express');
const Artist = require('../models/Artist');
const Song = require('../models/Song');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/artists
router.get('/', async (req, res) => {
  try {
    const artists = await Artist.find()
      .select('name image bio followers')
      .sort({ followers: -1 });
    res.json(artists);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/artists/search?q= - must be before /:id to avoid route conflict
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') return res.json([]);

    // Escape special regex characters to prevent regex injection
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const artists = await Artist.find({ name: new RegExp(escaped, 'i') })
      .select('name image bio followers')
      .limit(20);
    res.json(artists);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/artists/:id
router.get('/:id', async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id)
      .populate({
        path: 'songs',
        populate: { path: 'album', select: 'title coverUrl' },
        options: { sort: { plays: -1 } }
      })
      .populate('albums', 'title coverUrl releaseDate genre');

    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    res.json(artist);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Artist not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/artists (admin)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, bio, image } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Artist name is required' });
    }

    const artist = await Artist.create({
      name,
      bio: bio || '',
      image: image || `https://picsum.photos/seed/${encodeURIComponent(name)}/300/300`
    });

    res.status(201).json(artist);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Artist with this name already exists' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(error.errors).map(e => e.message).join(', ') });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
