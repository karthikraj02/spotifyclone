const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Playlist name is required'],
    trim: true,
    maxlength: [100, 'Playlist name must not exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [300, 'Description must not exceed 300 characters'],
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required']
  },
  songs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song'
  }],
  coverUrl: {
    type: String,
    default: 'https://picsum.photos/seed/playlist/300/300'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

playlistSchema.index({ owner: 1 });

module.exports = mongoose.model('Playlist', playlistSchema);
