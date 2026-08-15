const express = require('express');
const Album = require('../models/Album');
const Artist = require('../models/Artist');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/albums
router.get('/', async (req, res) => {
  try {
    const albums = await Album.find()
      .populate('artist', 'name image')
      .sort({ releaseDate: -1 });
    res.json(albums);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/albums/:id
router.get('/:id', async (req, res) => {
  try {
    const album = await Album.findById(req.params.id)
      .populate('artist', 'name image bio followers')
      .populate({
        path: 'songs',
        populate: { path: 'artist', select: 'name' }
      });

    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }

    res.json(album);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Album not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/albums (admin)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { title, artistId, coverUrl, releaseDate, genre } = req.body;

    if (!title || !artistId) {
      return res.status(400).json({ message: 'Title and artistId are required' });
    }

    if (typeof artistId !== 'string') {
      return res.status(400).json({ message: 'Invalid artistId' });
    }

    const artist = await Artist.findById(artistId);
    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    const album = await Album.create({
      title,
      artist: artistId,
      coverUrl: coverUrl || `https://picsum.photos/seed/${encodeURIComponent(title)}/300/300`,
      releaseDate: releaseDate ? new Date(releaseDate) : new Date(),
      genre: genre || 'Unknown'
    });

    artist.albums.push(album._id);
    await artist.save();

    const populated = await Album.findById(album._id).populate('artist', 'name image');
    res.status(201).json(populated);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(error.errors).map(e => e.message).join(', ') });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
