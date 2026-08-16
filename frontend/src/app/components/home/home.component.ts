import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SongService, Song } from '../../services/song.service';
import { PlaylistService, Playlist } from '../../services/playlist.service';
import { ArtistService, ArtistListItem } from '../../services/artist.service';
import { PlayerService } from '../../services/player.service';
import { AuthService } from '../../services/auth.service';
import { SongCardComponent } from '../shared/song-card/song-card.component';
import { PlaylistCardComponent } from '../shared/playlist-card/playlist-card.component';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, SongCardComponent, PlaylistCardComponent, AssetUrlPipe],
  template: `
    <div class="home-page">
      <div class="greeting-section">
        <h1>Good {{ timeOfDay }}, {{ username }}!</h1>
        @if (recentPlaylists.length > 0) {
          <div class="quick-picks">
            @for (playlist of recentPlaylists; track playlist._id) {
              <a [routerLink]="['/playlist', playlist._id]" class="quick-pick-item">
                <img [src]="playlist.coverUrl | assetUrl" [alt]="playlist.name" />
                <span>{{ playlist.name }}</span>
                <button class="play-fab" (click)="playPlaylist(playlist, $event)">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
              </a>
            }
          </div>
        }
      </div>

      <section class="section">
        <div class="section-header">
          <h2>Trending Now</h2>
        </div>
        @if (isLoadingTrending) {
          <div class="loading-row">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="skeleton-card"></div>
            }
          </div>
        } @else {
          <div class="songs-grid">
            @for (song of trendingSongs; track song._id) {
              <app-song-card [song]="song" [songs]="trendingSongs" />
            }
          </div>
        }
      </section>

      <section class="section">
        <div class="section-header">
          <h2>Your Playlists</h2>
          <a routerLink="/library" class="see-all">See all</a>
        </div>
        @if (isLoadingPlaylists) {
          <div class="loading-row">
            @for (i of [1,2,3,4]; track i) {
              <div class="skeleton-card"></div>
            }
          </div>
        } @else if (playlists.length === 0) {
          <div class="empty-state">
            <p>No playlists yet. Create your first playlist!</p>
          </div>
        } @else {
          <div class="cards-grid">
            @for (playlist of playlists.slice(0, 6); track playlist._id) {
              <app-playlist-card [playlist]="playlist" />
            }
          </div>
        }
      </section>

      <section class="section">
        <div class="section-header">
          <h2>Featured Artists</h2>
        </div>
        @if (isLoadingArtists) {
          <div class="loading-row">
            @for (i of [1,2,3,4]; track i) {
              <div class="skeleton-card"></div>
            }
          </div>
        } @else {
          <div class="artists-grid">
            @for (artist of artists.slice(0, 8); track artist._id) {
              <a [routerLink]="['/artist', artist._id]" class="artist-card">
                <div class="artist-img-wrapper">
                  <img [src]="artist.image | assetUrl" [alt]="artist.name" />
                </div>
                <p class="artist-name">{{ artist.name }}</p>
                <span class="artist-label">Artist</span>
              </a>
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .home-page {
      padding: 1.5rem 2rem 2rem;
      background: linear-gradient(180deg, #1a3a2a 0%, #121212 30%);
      min-height: 100%;
    }

    .greeting-section {
      margin-bottom: 2rem;
      h1 {
        font-size: 2rem;
        font-weight: 700;
        color: #fff;
        margin-bottom: 1.5rem;
      }
    }

    .quick-picks {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.5rem;
    }

    .quick-pick-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(255,255,255,0.1);
      border-radius: 4px;
      overflow: hidden;
      cursor: pointer;
      transition: background 0.2s;
      position: relative;
      text-decoration: none;
      color: #fff;

      &:hover {
        background: rgba(255,255,255,0.2);
        .play-fab { opacity: 1; transform: translateY(0); }
      }

      img {
        width: 56px;
        height: 56px;
        object-fit: cover;
        flex-shrink: 0;
      }

      span {
        font-weight: 700;
        font-size: 0.875rem;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding-right: 0.5rem;
      }

      .play-fab {
        position: absolute;
        right: 0.75rem;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #1DB954;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        cursor: pointer;
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 0.2s, transform 0.2s;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        color: #000;
      }
    }

    .section {
      margin-bottom: 3rem;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;

      h2 { font-size: 1.5rem; font-weight: 700; color: #fff; }

      .see-all {
        font-size: 0.75rem;
        font-weight: 700;
        color: #B3B3B3;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        text-decoration: none;
        &:hover { color: #fff; text-decoration: underline; }
      }
    }

    .songs-grid, .cards-grid, .artists-grid {
      display: grid;
      gap: 1rem;
    }

    .songs-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
    .cards-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
    .artists-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }

    .loading-row {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 1rem;
    }

    .skeleton-card {
      background: #282828;
      border-radius: 8px;
      height: 200px;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .empty-state {
      color: #B3B3B3;
      padding: 2rem 0;
    }

    .artist-card {
      background: #181818;
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
      cursor: pointer;
      transition: background 0.2s;
      text-decoration: none;
      display: block;

      &:hover { background: #282828; }

      .artist-img-wrapper {
        width: 100%;
        aspect-ratio: 1;
        border-radius: 50%;
        overflow: hidden;
        margin: 0 auto 0.75rem;
        max-width: 120px;

        img { width: 100%; height: 100%; object-fit: cover; }
      }

      .artist-name {
        font-weight: 700;
        font-size: 0.875rem;
        color: #fff;
        margin-bottom: 0.25rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .artist-label {
        font-size: 0.75rem;
        color: #B3B3B3;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  trendingSongs: Song[] = [];
  playlists: Playlist[] = [];
  recentPlaylists: Playlist[] = [];
  artists: ArtistListItem[] = [];
  isLoadingTrending = true;
  isLoadingPlaylists = true;
  isLoadingArtists = true;
  timeOfDay = 'day';
  username = '';

  constructor(
    private songService: SongService,
    private playlistService: PlaylistService,
    private artistService: ArtistService,
    private playerService: PlayerService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const hour = new Date().getHours();
    this.timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    this.username = this.authService.currentUser()?.username || 'there';

    this.songService.getTrending().subscribe({
      next: songs => { this.trendingSongs = songs; this.isLoadingTrending = false; },
      error: () => { this.isLoadingTrending = false; }
    });

    this.playlistService.getMyPlaylists().subscribe({
      next: playlists => {
        this.playlists = playlists;
        this.recentPlaylists = playlists.slice(0, 6);
        this.isLoadingPlaylists = false;
      },
      error: () => { this.isLoadingPlaylists = false; }
    });

    this.artistService.getAll().subscribe({
      next: artists => { this.artists = artists; this.isLoadingArtists = false; },
      error: () => { this.isLoadingArtists = false; }
    });
  }

  playPlaylist(playlist: Playlist, event: Event): void {
    event.preventDefault();
    if (playlist.songs?.length) {
      this.playerService.playQueue(playlist.songs);
    }
  }
}
