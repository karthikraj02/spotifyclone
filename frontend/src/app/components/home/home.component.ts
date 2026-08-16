import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SongService, Song } from '../../services/song.service';
import { PlaylistService, Playlist } from '../../services/playlist.service';
import { ArtistService, ArtistListItem } from '../../services/artist.service';
import { PlayerService } from '../../services/player.service';
import { AuthService } from '../../services/auth.service';
import { PlaylistCardComponent } from '../shared/playlist-card/playlist-card.component';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, PlaylistCardComponent, AssetUrlPipe],
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
          <div class="trending-grid">
            @for (song of trendingSongs; track song._id; let idx = $index) {
              <div
                class="trending-card"
                [class.active]="currentSongId === song._id"
                (click)="playSong(song)"
                (mouseenter)="hoveredSongId = song._id"
                (mouseleave)="hoveredSongId = ''"
              >
                <div class="trending-cover">
                  <img [src]="song.coverUrl | assetUrl" [alt]="song.title" />
                  <div class="trending-overlay">
                    <button class="trending-play-btn" (click)="playSong(song); $event.stopPropagation()">
                      @if (currentSongId === song._id && isPlaying) {
                        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                        </svg>
                      } @else {
                        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      }
                    </button>
                  </div>
                  <span class="trending-rank">#{{ idx + 1 }}</span>
                </div>
                <div class="trending-info">
                  <p class="trending-title" [class.accent]="currentSongId === song._id">{{ song.title }}</p>
                  <a [routerLink]="['/artist', song.artist._id]" class="trending-artist" (click)="$event.stopPropagation()">
                    {{ song.artist.name }}
                  </a>
                </div>
              </div>
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
      background: linear-gradient(180deg, var(--hero-gradient-start) 0%, var(--bg-primary) 30%);
      min-height: 100%;
      
      @media (max-width: 768px) {
        padding: 1rem 1rem 6rem; /* Extra bottom padding for player */
      }
    }

    .greeting-section {
      margin-bottom: 2rem;
      h1 {
        font-size: 2rem;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 1.5rem;
        
        @media (max-width: 768px) {
          font-size: 1.5rem;
        }
      }
    }

    .quick-picks {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.5rem;
      
      @media (max-width: 768px) {
        grid-template-columns: 1fr 1fr;
      }
    }

    .quick-pick-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: var(--border-color);
      border-radius: 4px;
      overflow: hidden;
      cursor: pointer;
      transition: background 0.2s;
      position: relative;
      text-decoration: none;
      color: var(--text-primary);

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

      h2 { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); }

      .see-all {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        text-decoration: none;
        &:hover { color: var(--text-primary); text-decoration: underline; }
      }
    }

    /* Trending cards grid */
    .trending-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 1rem;
      
      @media (max-width: 768px) {
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 0.75rem;
      }
    }

    .trending-card {
      background: var(--bg-secondary);
      border-radius: 8px;
      padding: 0.75rem;
      cursor: pointer;
      transition: background 0.2s;
      position: relative;

      &:hover {
        background: var(--bg-tertiary);
        .trending-overlay { opacity: 1; }
        .trending-play-btn { transform: translateY(0); opacity: 1; }
      }
    }

    .trending-cover {
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 0.75rem;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .trending-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.3);
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
        padding: 0.5rem;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .trending-play-btn {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: #1DB954;
        color: #000;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        transform: translateY(8px);
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s, background 0.15s;

        &:hover { background: #1ed760; transform: scale(1.05) translateY(0); }
      }

      .trending-rank {
        position: absolute;
        top: 0.5rem;
        left: 0.5rem;
        background: rgba(0,0,0,0.65);
        color: #fff;
        font-size: 0.7rem;
        font-weight: 700;
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
        backdrop-filter: blur(4px);
      }
    }

    .trending-info {
      overflow: hidden;

      .trending-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-bottom: 0.2rem;

        &.accent { color: #1DB954; }
      }

      .trending-artist {
        font-size: 0.75rem;
        color: var(--text-secondary);
        text-decoration: none;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: block;

        &:hover { color: var(--text-primary); text-decoration: underline; }
      }
    }

    .cards-grid, .artists-grid {
      display: grid;
      gap: 1rem;
      
      @media (max-width: 768px) {
        gap: 0.75rem;
      }
    }

    .cards-grid { 
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); 
      @media (max-width: 768px) {
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      }
    }
    .artists-grid { 
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); 
      @media (max-width: 768px) {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      }
    }

    .loading-row {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 1rem;
    }

    .skeleton-card {
      background: var(--bg-tertiary);
      border-radius: 8px;
      height: 200px;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .empty-state {
      color: var(--text-secondary);
      padding: 2rem 0;
    }

    .artist-card {
      background: var(--bg-secondary);
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
      cursor: pointer;
      transition: background 0.2s;
      text-decoration: none;
      display: block;

      &:hover { background: var(--bg-tertiary); }

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
        color: var(--text-primary);
        margin-bottom: 0.25rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .artist-label {
        font-size: 0.75rem;
        color: var(--text-secondary);
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
  currentSongId = '';
  isPlaying = false;
  hoveredSongId = '';

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

    // Track current song for active state
    this.playerService.currentIndex$.subscribe(() => {
      this.currentSongId = this.playerService.currentSong?._id || '';
    });
    this.playerService.isPlaying$.subscribe(p => this.isPlaying = p);
  }

  playSong(song: Song): void {
    this.playerService.playSong(song, this.trendingSongs);
  }

  playPlaylist(playlist: Playlist, event: Event): void {
    event.preventDefault();
    if (playlist.songs?.length) {
      this.playerService.playQueue(playlist.songs);
    }
  }
}
