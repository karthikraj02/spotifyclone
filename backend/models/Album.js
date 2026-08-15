const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Album title is required'],
    trim: true
  },
  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist',
    required: [true, 'Artist is required']
  },
  songs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song'
  }],
  coverUrl: {
    type: String,
    default: 'https://picsum.photos/seed/album/300/300'
  },
  releaseDate: {
    type: Date,
    default: Date.now
  },
  genre: {
    type: String,
    trim: true,
    default: 'Unknown'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

albumSchema.index({ artist: 1 });

module.exports = mongoose.model('Album', albumSchema);
