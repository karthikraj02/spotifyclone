import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PlaylistService, Playlist } from '../../services/playlist.service';
import { PlayerService } from '../../services/player.service';
import { AuthService } from '../../services/auth.service';
import { SongCardComponent } from '../shared/song-card/song-card.component';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';

@Component({
  selector: 'app-playlist',
  standalone: true,
  imports: [CommonModule, RouterLink, SongCardComponent, AssetUrlPipe],
  template: `
    <div class="playlist-page">
      @if (isLoading) {
        <div class="loading"><div class="spinner"></div></div>
      } @else if (!playlist) {
        <div class="error-state">
          <h2>Playlist not found</h2>
          <a routerLink="/library">Back to Library</a>
        </div>
      } @else {
        <div class="playlist-header" [style.background]="headerGradient">
          <div class="playlist-cover">
            <img [src]="playlist.coverUrl | assetUrl" [alt]="playlist.name" />
          </div>
          <div class="playlist-info">
            <span class="type">{{ playlist.isPublic ? 'Public' : 'Private' }} Playlist</span>
            <h1>{{ playlist.name }}</h1>
            @if (playlist.description) {
              <p class="description">{{ playlist.description }}</p>
            }
            <div class="meta">
              <span class="owner">{{ playlist.owner.username }}</span>
              <span>•</span>
              <span>{{ playlist.songs.length }} songs</span>
            </div>
          </div>
        </div>

        <div class="playlist-controls">
          @if (playlist.songs.length > 0) {
            <button class="play-btn" (click)="playAll()">
              <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          }
          @if (isOwner) {
            <button class="more-btn" (click)="showDeleteConfirm = true" title="Delete playlist">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          }
        </div>

        @if (playlist.songs.length === 0) {
          <div class="empty-playlist">
            <p>No songs in this playlist yet.</p>
          </div>
        } @else {
          <div class="songs-header">
            <span class="col-index">#</span>
            <span class="col-title">Title</span>
            <span class="col-album">Album</span>
            <span class="col-duration">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z"/>
              </svg>
            </span>
          </div>
          <div class="songs-list">
            @for (song of playlist.songs; track song._id; let i = $index) {
              <app-song-card
                [song]="song"
                [songs]="playlist.songs"
                [index]="i"
                [showRemove]="isOwner"
                (removed)="removeSong(song._id)"
              />
            }
          </div>
        }

        @if (showDeleteConfirm) {
          <div class="modal-overlay" (click)="showDeleteConfirm = false">
            <div class="modal" (click)="$event.stopPropagation()">
              <h2>Delete Playlist</h2>
              <p>Are you sure you want to delete "{{ playlist.name }}"? This action cannot be undone.</p>
              <div class="modal-actions">
                <button (click)="showDeleteConfirm = false">Cancel</button>
                <button class="danger" (click)="deletePlaylist()">Delete</button>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .playlist-page { min-height: 100%; }

    .loading {
      display: flex; justify-content: center; padding: 4rem;
      .spinner { width: 40px; height: 40px; border: 3px solid var(--border-color); border-top-color: #1DB954; border-radius: 50%; animation: spin 0.8s linear infinite; }
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .error-state { text-align: center; padding: 4rem; h2 { color: var(--text-primary); margin-bottom: 1rem; } a { color: #1DB954; text-decoration: underline; } }

    .playlist-header {
      display: flex;
      align-items: flex-end;
      gap: 1.5rem;
      padding: 2rem;
      min-height: 280px;

      .playlist-cover {
        flex-shrink: 0;
        width: 180px;
        height: 180px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);

        img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; }
      }

      .playlist-info {
        flex: 1;

        .type { font-size: 0.75rem; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.1em; }
        h1 { font-size: 3rem; font-weight: 900; color: var(--text-primary); margin: 0.5rem 0; line-height: 1.1; }
        .description { color: var(--text-secondary); margin-bottom: 0.5rem; font-size: 0.875rem; }
        .meta { display: flex; align-items: center; gap: 0.5rem; color: var(--text-secondary); font-size: 0.875rem; .owner { color: var(--text-primary); font-weight: 700; } }
      }
    }

    .playlist-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
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

      .more-btn {
        width: 40px; height: 40px;
        background: transparent;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        &:hover { color: #E91429; background: rgba(233,20,41,0.1); }
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
    .empty-playlist { padding: 2rem; color: var(--text-secondary); }

    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.7);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: var(--bg-tertiary);
      border-radius: 8px;
      padding: 2rem;
      max-width: 400px;
      width: 100%;

      h2 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.75rem; }
      p { color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 0.875rem; }

      .modal-actions {
        display: flex; justify-content: flex-end; gap: 0.75rem;
        button {
          padding: 0.75rem 1.5rem;
          border-radius: 500px;
          font-weight: 700;
          cursor: pointer;
          background: transparent;
          color: var(--text-primary);
          border: 1px solid var(--text-muted);
          &:hover { border-color: var(--text-primary); }
          &.danger { background: #E91429; border-color: #E91429; &:hover { background: #c01225; } }
        }
      }
    }
  `]
})
export class PlaylistComponent implements OnInit {
  playlist: Playlist | null = null;
  isLoading = true;
  isOwner = false;
  headerGradient = 'linear-gradient(to bottom, #2d4a6e, var(--bg-primary))';
  showDeleteConfirm = false;

  constructor(
    private route: ActivatedRoute,
    private playlistService: PlaylistService,
    private playerService: PlayerService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Subscribe to paramMap (not a one-time snapshot read) so navigating from one
    // playlist to another reuses this component correctly instead of showing stale data.
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) return;
      this.loadPlaylist(id);
    });
  }

  private loadPlaylist(id: string): void {
    this.isLoading = true;
    this.playlist = null;
    this.showDeleteConfirm = false;

    this.playlistService.getById(id).subscribe({
      next: playlist => {
        this.playlist = playlist;
        this.isOwner = playlist.owner?._id === this.authService.currentUser()?._id;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  playAll(): void {
    if (this.playlist?.songs.length) {
      this.playerService.playQueue(this.playlist.songs);
    }
  }

  removeSong(songId: string): void {
    if (!this.playlist) return;
    this.playlistService.removeSong(this.playlist._id, songId).subscribe({
      next: () => {
        if (this.playlist) {
          this.playlist.songs = this.playlist.songs.filter(s => s._id !== songId);
        }
      }
    });
  }

  deletePlaylist(): void {
    if (!this.playlist) return;
    this.playlistService.delete(this.playlist._id).subscribe({
      next: () => {
        history.back();
      }
    });
  }
}
