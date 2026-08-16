import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AlbumService, AlbumDetail } from '../../services/album.service';
import { PlayerService } from '../../services/player.service';
import { SongCardComponent } from '../shared/song-card/song-card.component';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';

@Component({
  selector: 'app-album',
  standalone: true,
  imports: [CommonModule, RouterLink, SongCardComponent, AssetUrlPipe],
  template: `
    <div class="album-page">
      @if (isLoading) {
        <div class="loading"><div class="spinner"></div></div>
      } @else if (!album) {
        <div class="error-state">
          <h2>Album not found</h2>
          <a routerLink="/home">Back to Home</a>
        </div>
      } @else {
        <div class="album-header" [style.background]="headerGradient">
          <div class="album-cover">
            <img [src]="album.coverUrl | assetUrl" [alt]="album.title" />
          </div>
          <div class="album-info">
            <span class="type">Album</span>
            <h1>{{ album.title }}</h1>
            <div class="meta">
              <a [routerLink]="['/artist', album.artist._id]" class="artist-link">{{ album.artist.name }}</a>
              <span>•</span>
              <span>{{ album.releaseDate | date: 'yyyy' }}</span>
              <span>•</span>
              <span>{{ album.songs.length }} songs</span>
            </div>
          </div>
        </div>

        <div class="album-controls">
          @if (album.songs.length > 0) {
            <button class="play-btn" (click)="playAll()">
              <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          }
        </div>

        @if (album.songs.length === 0) {
          <div class="empty-album">
            <p>No songs in this album yet.</p>
          </div>
        } @else {
          <div class="songs-header">
            <span class="col-index">#</span>
            <span class="col-title">Title</span>
            <span class="col-album">Genre</span>
            <span class="col-duration">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z"/>
              </svg>
            </span>
          </div>
          <div class="songs-list">
            @for (song of album.songs; track song._id; let i = $index) {
              <app-song-card [song]="song" [songs]="album.songs" [index]="i" [showArtist]="false" />
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .album-page { min-height: 100%; }

    .loading {
      display: flex; justify-content: center; padding: 4rem;
      .spinner { width: 40px; height: 40px; border: 3px solid var(--border-color); border-top-color: #1DB954; border-radius: 50%; animation: spin 0.8s linear infinite; }
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .error-state { text-align: center; padding: 4rem; h2 { color: var(--text-primary); margin-bottom: 1rem; } a { color: #1DB954; text-decoration: underline; } }

    .album-header {
      display: flex;
      align-items: flex-end;
      gap: 1.5rem;
      padding: 2rem;
      min-height: 280px;

      .album-cover {
        flex-shrink: 0;
        width: 180px;
        height: 180px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; }
      }

      .album-info {
        flex: 1;
        .type { font-size: 0.75rem; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.1em; }
        h1 { font-size: 3rem; font-weight: 900; color: var(--text-primary); margin: 0.5rem 0; line-height: 1.1; }
        .meta {
          display: flex; align-items: center; gap: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;
          .artist-link { color: var(--text-primary); font-weight: 700; text-decoration: none; &:hover { text-decoration: underline; } }
        }
      }
    }

    .album-controls {
      display: flex;
      align-items: center;
      padding: 1.5rem 2rem;

      .play-btn {
        width: 56px; height: 56px;
        border-radius: 50%;
        background: #1DB954;
        border: none;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        color: #000;
        transition: transform 0.1s;
        &:hover { transform: scale(1.05); background: #1ed760; }
      }
    }

    .songs-header {
      display: grid;
      grid-template-columns: 40px 1fr 1fr 60px;
      gap: 1rem;
      padding: 0.5rem 2rem;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-secondary);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 0.5rem;
    }

    .songs-list { padding: 0 1rem; }
    .empty-album { padding: 2rem; color: var(--text-secondary); }
  `]
})
export class AlbumComponent implements OnInit {
  album: AlbumDetail | null = null;
  isLoading = true;
  isPlaying = false;
  headerGradient = 'linear-gradient(to bottom, var(--album-gradient-start), var(--bg-primary))';

  constructor(
    private route: ActivatedRoute,
    private albumService: AlbumService,
    private playerService: PlayerService
  ) {}

  ngOnInit(): void {
    // Subscribe (not a one-time snapshot) so navigating between two /album/:id
    // routes - e.g. from one album's artist link to another album - refreshes correctly.
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) return;
      this.loadAlbum(id);
    });
  }

  private loadAlbum(id: string): void {
    this.isLoading = true;
    this.album = null;
    this.albumService.getById(id).subscribe({
      next: album => { this.album = album; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  playAll(): void {
    if (this.album?.songs.length) {
      this.playerService.playQueue(this.album.songs);
    }
  }
}
