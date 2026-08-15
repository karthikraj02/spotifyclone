const mongoose = require('mongoose');

const artistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Artist name is required'],
    trim: true,
    unique: true
  },
  bio: {
    type: String,
    trim: true,
    default: ''
  },
  image: {
    type: String,
    default: 'https://picsum.photos/seed/artist/300/300'
  },
  songs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song'
  }],
  albums: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Album'
  }],
  followers: {
    type: Number,
    default: 0,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

artistSchema.index({ name: 'text' });

module.exports = mongoose.model('Artist', artistSchema);
