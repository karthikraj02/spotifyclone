const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Playlist = require('../models/Playlist');
const Song = require('../models/Song');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && String(id).length === 24;

// GET /api/users/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('likedSongs', 'title artist album coverUrl duration plays likes')
      .populate('playlists', 'name coverUrl songs isPublic');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/users/me
router.put('/me', auth, async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const updates = {};

    if (username) {
      if (typeof username !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid username' });
      }
      const existing = await User.findOne({
        username: username.trim(),
        _id: { $ne: req.user._id }
      });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Username already taken' });
      }
      updates.username = username;
    }

    if (avatar !== undefined) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json(user);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: Object.values(error.errors).map(e => e.message).join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/users/me/recently-played
router.get('/me/recently-played', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'recentlyPlayed.song',
        populate: [
          { path: 'artist', select: 'name image' },
          { path: 'album', select: 'title coverUrl' }
        ]
      });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const recentlyPlayed = user.recentlyPlayed
      .filter(rp => rp.song)
      .slice(0, 20);

    res.json(recentlyPlayed);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/users/me/liked-songs
router.get('/me/liked-songs', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'likedSongs',
        populate: [
          { path: 'artist', select: 'name image' },
          { path: 'album', select: 'title coverUrl' }
        ]
      });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json(user.likedSongs);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/users (admin)
router.get('/', adminAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments()
    ]);

    res.json({
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/users/:id (admin) — Phase 8: comprehensive cleanup
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Clean up owned playlists
    await Playlist.deleteMany({ owner: user._id });

    // Decrement like counts for songs the user had liked
    if (user.likedSongs && user.likedSongs.length > 0) {
      await Song.updateMany(
        { _id: { $in: user.likedSongs } },
        { $inc: { likes: -1 } }
      );
    }

    await user.deleteOne();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

