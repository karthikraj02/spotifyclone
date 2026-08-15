const express = require('express');
const mongoose = require('mongoose');
const Playlist = require('../models/Playlist');
const Song = require('../models/Song');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && String(id).length === 24;

// GET /api/playlists - Get user's playlists
router.get('/', auth, async (req, res) => {
  try {
    const playlists = await Playlist.find({ owner: req.user._id })
      .populate({ path: 'songs', populate: { path: 'artist', select: 'name' } })
      .sort({ createdAt: -1 });
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/playlists - Create playlist
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Playlist name is required' });
    }

    const playlist = await Playlist.create({
      name: name.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      owner: req.user._id,
      isPublic: isPublic !== undefined ? isPublic : true
    });

    await User.findByIdAndUpdate(req.user._id, {
      $push: { playlists: playlist._id }
    });

    res.status(201).json(playlist);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: Object.values(error.errors).map(e => e.message).join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/playlists/:id
router.get('/:id', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid playlist ID' });
    }

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
      return res.status(404).json({ success: false, message: 'Playlist not found' });
    }

    if (!playlist.isPublic && playlist.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied to private playlist' });
    }

    res.json(playlist);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/playlists/:id
router.put('/:id', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid playlist ID' });
    }

    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ success: false, message: 'Playlist not found' });
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this playlist' });
    }

    const { name, description, isPublic, coverUrl } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Playlist name cannot be empty' });
      }
      playlist.name = name.trim();
    }
    if (description !== undefined) playlist.description = typeof description === 'string' ? description.trim() : '';
    if (isPublic !== undefined) playlist.isPublic = isPublic;
    if (coverUrl) playlist.coverUrl = coverUrl;

    await playlist.save();
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/playlists/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid playlist ID' });
    }

    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ success: false, message: 'Playlist not found' });
    }

    if (playlist.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this playlist' });
    }

    await playlist.deleteOne();

    // Use playlist.owner (not req.user._id) to correctly update the actual owner's playlists array
    // This is critical when an admin deletes another user's playlist (Phase 6 fix)
    await User.findByIdAndUpdate(playlist.owner, {
      $pull: { playlists: playlist._id }
    });

    res.json({ success: true, message: 'Playlist deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/playlists/:id/songs
router.post('/:id/songs', auth, async (req, res) => {
  try {
    const { songId } = req.body;
    if (!songId || !isValidObjectId(songId)) {
      return res.status(400).json({ success: false, message: 'Valid Song ID is required' });
    }

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid playlist ID' });
    }

    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ success: false, message: 'Playlist not found' });
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this playlist' });
    }

    // Verify song exists before adding (Phase 6 fix)
    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({ success: false, message: 'Song not found' });
    }

    if (playlist.songs.some(id => id.toString() === songId)) {
      return res.status(409).json({ success: false, message: 'Song already in playlist' });
    }

    playlist.songs.push(songId);
    await playlist.save();

    const updated = await Playlist.findById(playlist._id)
      .populate({ path: 'songs', populate: { path: 'artist', select: 'name' } });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/playlists/:id/songs/:songId
router.delete('/:id/songs/:songId', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.songId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ success: false, message: 'Playlist not found' });
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this playlist' });
    }

    playlist.songs = playlist.songs.filter(
      id => id.toString() !== req.params.songId
    );
    await playlist.save();

    res.json({ success: true, message: 'Song removed from playlist' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
