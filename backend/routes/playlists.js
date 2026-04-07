const express = require('express');
const Playlist = require('../models/Playlist');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/playlists - Get user's playlists
router.get('/', auth, async (req, res) => {
  try {
    const playlists = await Playlist.find({ owner: req.user._id })
      .populate({ path: 'songs', populate: { path: 'artist', select: 'name' } })
      .sort({ createdAt: -1 });
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/playlists - Create playlist
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Playlist name is required' });
    }

    const playlist = await Playlist.create({
      name,
      description: description || '',
      owner: req.user._id,
      isPublic: isPublic !== undefined ? isPublic : true
    });

    await User.findByIdAndUpdate(req.user._id, {
      $push: { playlists: playlist._id }
    });

    res.status(201).json(playlist);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(error.errors).map(e => e.message).join(', ') });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/playlists/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate('owner', 'username avatar')
      .populate({
        path: 'songs',
        populate: [
          { path: 'artist', select: 'name image' },
          { path: 'album', select: 'title coverUrl' }
        ]
      });

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (!playlist.isPublic && playlist.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied to private playlist' });
    }

    res.json(playlist);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/playlists/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this playlist' });
    }

    const { name, description, isPublic, coverUrl } = req.body;
    if (name) playlist.name = name;
    if (description !== undefined) playlist.description = description;
    if (isPublic !== undefined) playlist.isPublic = isPublic;
    if (coverUrl) playlist.coverUrl = coverUrl;

    await playlist.save();
    res.json(playlist);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/playlists/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (playlist.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this playlist' });
    }

    await playlist.deleteOne();
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { playlists: playlist._id }
    });

    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/playlists/:id/songs
router.post('/:id/songs', auth, async (req, res) => {
  try {
    const { songId } = req.body;
    if (!songId) {
      return res.status(400).json({ message: 'Song ID is required' });
    }

    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this playlist' });
    }

    if (playlist.songs.includes(songId)) {
      return res.status(409).json({ message: 'Song already in playlist' });
    }

    playlist.songs.push(songId);
    await playlist.save();

    const updated = await Playlist.findById(playlist._id)
      .populate({ path: 'songs', populate: { path: 'artist', select: 'name' } });

    res.json(updated);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Playlist or song not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/playlists/:id/songs/:songId
router.delete('/:id/songs/:songId', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this playlist' });
    }

    playlist.songs = playlist.songs.filter(
      id => id.toString() !== req.params.songId
    );
    await playlist.save();

    res.json({ message: 'Song removed from playlist' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
