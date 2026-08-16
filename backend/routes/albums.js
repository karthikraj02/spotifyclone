const express = require('express');
const mongoose = require('mongoose');
const Album = require('../models/Album');
const Artist = require('../models/Artist');
const Song = require('../models/Song');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && String(id).length === 24;

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

// PUT /api/albums/:id (admin)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid album ID' });
    }

    const album = await Album.findById(req.params.id);
    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }

    const { title, coverUrl, releaseDate, genre } = req.body;
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ message: 'Album title cannot be empty' });
      }
      album.title = title.trim();
    }
    if (coverUrl) album.coverUrl = coverUrl;
    if (releaseDate) album.releaseDate = new Date(releaseDate);
    if (genre !== undefined) album.genre = genre ? genre.trim() : 'Unknown';

    await album.save();
    const populated = await Album.findById(album._id).populate('artist', 'name image');
    res.json(populated);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(error.errors).map(e => e.message).join(', ') });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/albums/:id (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid album ID' });
    }

    const album = await Album.findById(req.params.id);
    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }

    // Detach songs rather than deleting them - an album disappearing shouldn't
    // silently delete a user's music, just unlink it from this album.
    await Promise.all([
      Song.updateMany({ album: album._id }, { $set: { album: null } }),
      Artist.updateOne({ _id: album.artist }, { $pull: { albums: album._id } }),
      album.deleteOne()
    ]);

    res.json({ success: true, message: 'Album deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
