const express = require('express');
const mongoose = require('mongoose');
const Artist = require('../models/Artist');
const Song = require('../models/Song');
const Album = require('../models/Album');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && String(id).length === 24;

// GET /api/artists
// Returns songsCount/albumsCount instead of the full songs/albums arrays - the admin
// and browse UIs only ever need the counts, and loading every song/album document
// referenced by every artist here would be wasteful once the catalog grows.
router.get('/', async (req, res) => {
  try {
    const artists = await Artist.aggregate([
      {
        $project: {
          name: 1,
          image: 1,
          bio: 1,
          followers: 1,
          songsCount: { $size: '$songs' },
          albumsCount: { $size: '$albums' }
        }
      },
      { $sort: { followers: -1 } }
    ]);
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

// GET /api/artists/:id/follow-status - whether the current user follows this artist
router.get('/:id/follow-status', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid artist ID' });
    }
    const following = (req.user.followedArtists || []).some(
      id => id.toString() === req.params.id
    );
    res.json({ following });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/artists/:id/follow - toggle follow/unfollow for the current user
router.post('/:id/follow', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid artist ID' });
    }

    const artist = await Artist.findById(req.params.id);
    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    const alreadyFollowing = (req.user.followedArtists || []).some(
      id => id.toString() === req.params.id
    );

    if (alreadyFollowing) {
      await Promise.all([
        User.updateOne({ _id: req.user._id }, { $pull: { followedArtists: artist._id } }),
        Artist.updateOne({ _id: artist._id, followers: { $gt: 0 } }, { $inc: { followers: -1 } })
      ]);
    } else {
      // $addToSet keeps this idempotent even under concurrent double-clicks
      await Promise.all([
        User.updateOne({ _id: req.user._id }, { $addToSet: { followedArtists: artist._id } }),
        Artist.updateOne({ _id: artist._id }, { $inc: { followers: 1 } })
      ]);
    }

    const updatedArtist = await Artist.findById(artist._id).select('followers');
    res.json({ following: !alreadyFollowing, followers: updatedArtist.followers });
  } catch (error) {
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

    res.status(201).json({
      ...artist.toObject(),
      songsCount: artist.songs.length,
      albumsCount: artist.albums.length
    });
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

// PUT /api/artists/:id (admin)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid artist ID' });
    }

    const artist = await Artist.findById(req.params.id);
    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    const { name, bio, image } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: 'Artist name cannot be empty' });
      }
      artist.name = name.trim();
    }
    if (bio !== undefined) artist.bio = typeof bio === 'string' ? bio.trim() : artist.bio;
    if (image !== undefined && image) artist.image = image;

    await artist.save();
    res.json({
      ...artist.toObject(),
      songsCount: artist.songs.length,
      albumsCount: artist.albums.length
    });
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

// DELETE /api/artists/:id (admin)
// Blocks deletion while the artist still has songs or albums attached, rather than
// silently cascading and leaving Song/Album documents pointing at a missing artist.
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid artist ID' });
    }

    const artist = await Artist.findById(req.params.id);
    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    if (artist.songs.length > 0 || artist.albums.length > 0) {
      return res.status(409).json({
        message: 'Cannot delete an artist that still has songs or albums. Delete those first.'
      });
    }

    await Promise.all([
      artist.deleteOne(),
      User.updateMany({ followedArtists: artist._id }, { $pull: { followedArtists: artist._id } })
    ]);

    res.json({ success: true, message: 'Artist deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
