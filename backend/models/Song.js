const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Song title is required'],
    trim: true
  },
  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist',
    required: [true, 'Artist is required']
  },
  album: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Album',
    default: null
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be positive']
  },
  audioUrl: {
    type: String,
    required: [true, 'Audio URL is required']
  },
  coverUrl: {
    type: String,
    default: 'https://picsum.photos/seed/song/300/300'
  },
  genre: {
    type: String,
    trim: true,
    default: 'Unknown'
  },
  plays: {
    type: Number,
    default: 0,
    min: 0
  },
  likes: {
    type: Number,
    default: 0,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

songSchema.index({ title: 'text', genre: 'text' });
songSchema.index({ artist: 1 });
songSchema.index({ album: 1 });
songSchema.index({ plays: -1 });

module.exports = mongoose.model('Song', songSchema);
