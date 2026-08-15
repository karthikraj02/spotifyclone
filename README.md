# Spotify Clone - MEAN Stack

A full-stack Spotify clone built with the MEAN stack (MongoDB, Express.js, Angular, Node.js) featuring a dark Spotify-like UI and comprehensive music streaming functionality.

## Features

- 🎵 **Music Playback** - Play, pause, skip, shuffle, repeat modes
- 🔍 **Search** - Real-time search for songs and artists
- 📱 **Responsive Layout** - Sidebar, topbar, and bottom player bar
- 🔐 **Authentication** - JWT-based login/register
- ❤️ **Like Songs** - Save and manage liked songs
- 📋 **Playlists** - Create, edit, delete playlists; add/remove songs
- 🎤 **Artist Pages** - Artist profiles with songs and albums
- 👤 **User Library** - Liked songs and personal playlists
- 🛡️ **Admin Panel** - Manage songs, artists, and users
- 🎨 **Spotify-like Dark Theme** - Authentic green accent colors

## Tech Stack

### Backend
- **Node.js** + **Express.js** - REST API server
- **MongoDB** + **Mongoose** - Database & ODM
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing

### Frontend
- **Angular 17+** - Standalone components (no NgModules)
- **SCSS** - Dark theme styling
- **RxJS** - Reactive state management with BehaviorSubject
- **Angular Router** - Client-side routing with lazy loading

## Project Structure

```
spotifyclone/
├── backend/
│   ├── server.js          # Express app entry point
│   ├── config/
│   │   └── db.js          # MongoDB connection
│   ├── models/
│   │   ├── User.js
│   │   ├── Song.js
│   │   ├── Playlist.js
│   │   ├── Artist.js
│   │   └── Album.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── songs.js
│   │   ├── playlists.js
│   │   ├── artists.js
│   │   ├── albums.js
│   │   └── users.js
│   ├── middleware/
│   │   └── auth.js        # JWT authentication middleware
│   └── uploads/           # Uploaded audio and images
└── frontend/
    └── src/
        └── app/
            ├── components/ # All UI components
            ├── services/   # Data & state services
            ├── guards/     # Route protection
            └── interceptors/ # HTTP interceptors
```

## Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **MongoDB** >= 6.x (local or MongoDB Atlas)

## Setup & Installation

### 1. Clone and Navigate

```bash
cd spotifyclone
```

### 2. Backend Setup

```bash
cd backend
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

npm run dev   # Development with nodemon
# or
npm start     # Production
```

The backend server starts on **http://localhost:5000**

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start     # Starts Angular dev server
```

The Angular app starts on **http://localhost:4200**

## Environment Variables (Backend)

Create a `.env` file in `backend/`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/spotifyclone
JWT_SECRET=your_very_strong_secret_key_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:4200
NODE_ENV=development
```

## API Endpoints

### Authentication
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user profile |

### Songs
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/songs` | Get all songs (paginated) |
| GET | `/api/songs/trending` | Get trending songs |
| GET | `/api/songs/search?q=` | Search songs |
| GET | `/api/songs/:id` | Get song by ID |
| GET | `/api/songs/:id/stream` | Stream audio file |
| POST | `/api/songs` | Upload new song (admin) |
| DELETE | `/api/songs/:id` | Delete song (admin) |
| POST | `/api/songs/:id/like` | Like/unlike song |
| POST | `/api/songs/:id/play` | Record a play |

### Playlists
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/playlists` | Get user's playlists |
| POST | `/api/playlists` | Create playlist |
| GET | `/api/playlists/:id` | Get playlist by ID |
| PUT | `/api/playlists/:id` | Update playlist |
| DELETE | `/api/playlists/:id` | Delete playlist |
| POST | `/api/playlists/:id/songs` | Add song to playlist |
| DELETE | `/api/playlists/:id/songs/:songId` | Remove song from playlist |

### Artists & Albums
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/artists` | Get all artists |
| GET | `/api/artists/:id` | Get artist with songs/albums |
| POST | `/api/artists` | Create artist (admin) |
| GET | `/api/albums` | Get all albums |
| GET | `/api/albums/:id` | Get album with songs |
| POST | `/api/albums` | Create album (admin) |

### Users
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users/me` | Get user profile |
| PUT | `/api/users/me` | Update profile |
| GET | `/api/users/me/recently-played` | Get recently played |
| GET | `/api/users/me/liked-songs` | Get liked songs |
| GET | `/api/users` | Get all users (admin) |
| DELETE | `/api/users/:id` | Delete user (admin) |

## Seeding Data (Optional)

To populate the database with sample data, you can make admin API calls or use a seed script:

```bash
cd backend
node seed.js  # If seed script is present
```

## Creating an Admin User

After registering, update a user's role in MongoDB:

```javascript
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

Then use the Admin Panel at `/admin` to add artists and songs.

## Color Palette

```scss
$bg-primary:       #121212;  // Main background
$bg-secondary:     #181818;  // Card backgrounds
$bg-tertiary:      #282828;  // Elevated surfaces
$accent-green:     #1DB954;  // Spotify green
$accent-hover:     #1ed760;  // Hover state
$text-primary:     #FFFFFF;  // Primary text
$text-secondary:   #B3B3B3;  // Secondary text
$text-muted:       #727272;  // Muted text
```

## License

MIT
