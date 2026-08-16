require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const Song = require('./models/Song');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const UPLOADS_DIR = path.resolve(__dirname, 'uploads');

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const songs = await Song.find();
    console.log(`Found ${songs.length} songs. Checking for local files...`);

    let updatedCount = 0;

    for (let song of songs) {
      let needsSave = false;

      // Migrate Audio
      if (song.audioUrl && !song.audioUrl.startsWith('http')) {
        const localPath = path.resolve(__dirname, song.audioUrl.replace(/^\//, ''));
        if (fs.existsSync(localPath)) {
          console.log(`Uploading audio for song "${song.title}"...`);
          try {
            const result = await cloudinary.uploader.upload(localPath, {
              resource_type: 'video',
              folder: 'spotifyclone/audio'
            });
            song.audioUrl = result.secure_url;
            needsSave = true;
            console.log(`  -> Audio uploaded: ${result.secure_url}`);
          } catch (err) {
            console.error(`  -> Failed to upload audio: ${err.message}`);
          }
        } else {
          console.log(`Local audio file not found for "${song.title}": ${localPath}`);
        }
      }

      // Migrate Cover
      if (song.coverUrl && !song.coverUrl.startsWith('http')) {
        const localPath = path.resolve(__dirname, song.coverUrl.replace(/^\//, ''));
        if (fs.existsSync(localPath)) {
          console.log(`Uploading cover for song "${song.title}"...`);
          try {
            const result = await cloudinary.uploader.upload(localPath, {
              resource_type: 'image',
              folder: 'spotifyclone/images'
            });
            song.coverUrl = result.secure_url;
            needsSave = true;
            console.log(`  -> Cover uploaded: ${result.secure_url}`);
          } catch (err) {
            console.error(`  -> Failed to upload cover: ${err.message}`);
          }
        } else {
          console.log(`Local cover file not found for "${song.title}": ${localPath}`);
        }
      }

      if (needsSave) {
        await song.save();
        updatedCount++;
      }
    }

    console.log(`Migration complete! Updated ${updatedCount} songs.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
