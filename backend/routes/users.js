const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Playlist = require('../models/Playlist');
const Song = require('../models/Song');
const Artist = require('../models/Artist');
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

// GET /api/users/me/followed-artists
router.get('/me/followed-artists', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('followedArtists', 'name image bio followers');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json(user.followedArtists || []);
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

// PATCH /api/users/:id/role (admin) - promote/demote a user
router.patch('/:id/role', adminAuth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const { role } = req.body;
    if (role !== 'admin' && role !== 'user') {
      return res.status(400).json({ success: false, message: "Role must be 'admin' or 'user'" });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot change your own role' });
    }

    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent demoting the last remaining admin, which would lock everyone out of /admin
    if (target.role === 'admin' && role === 'user') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot demote the last remaining admin' });
      }
    }

    target.role = role;
    await target.save();

    res.json({ success: true, user: target });
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

    // Decrement follower counts for artists the user followed
    if (user.followedArtists && user.followedArtists.length > 0) {
      await Artist.updateMany(
        { _id: { $in: user.followedArtists }, followers: { $gt: 0 } },
        { $inc: { followers: -1 } }
      );
    }

    await user.deleteOne();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/users/track-time
router.post('/track-time', auth, async (req, res) => {
  try {
    const { device } = req.body; // e.g. "Windows / Chrome" from frontend
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const currentDaily = user.dailyListenTime.get(today) || 0;

    user.lastActiveAt = new Date();
    user.totalListenTime += 60; // 60 seconds
    user.dailyListenTime.set(today, currentDaily + 60);

    // Track device if provided and changed
    if (device && device !== user.device) {
      user.device = device;
    }

    await user.save({ validateBeforeSave: false }); // Skip validation just in case

    res.status(200).json({ success: true });
  } catch (error) {
    // Fail silently so it doesn't spam errors on heartbeat
    console.error('Tracking error:', error);
    res.status(500).json({ success: false });
  }
});

// GET /api/users (Admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const users = await User.find({})
      .select('username email avatar createdAt lastActiveAt device totalListenTime dailyListenTime isVerified role')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching users' });
  }
});

module.exports = router;

