import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PlaylistService, Playlist } from '../../services/playlist.service';
import { UserService } from '../../services/user.service';
import { Song } from '../../services/song.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SongCardComponent } from '../shared/song-card/song-card.component';
import { PlaylistCardComponent } from '../shared/playlist-card/playlist-card.component';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SongCardComponent, PlaylistCardComponent],
  template: `
    <div class="library-page">
      <div class="library-header">
        <h1>Your Library</h1>
        <button class="create-btn" (click)="showCreateModal = true" title="Create playlist">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
      </div>

      <div class="tabs">
        <button [class.active]="activeTab === 'playlists'" (click)="activeTab = 'playlists'">Playlists</button>
        <button [class.active]="activeTab === 'liked'" (click)="activeTab = 'liked'; loadLiked()">Liked Songs</button>
      </div>

      @if (activeTab === 'playlists') {
        @if (isLoading) {
          <div class="loading"><div class="spinner"></div></div>
        } @else if (playlists.length === 0) {
          <div class="empty-state">
            <div class="empty-icon">🎵</div>
            <h3>Create your first playlist</h3>
            <p>It's easy, we'll help you.</p>
            <button class="btn-primary" (click)="showCreateModal = true">Create playlist</button>
          </div>
        } @else {
          <div class="playlists-grid">
            @for (playlist of playlists; track playlist._id) {
              <app-playlist-card [playlist]="playlist" />
            }
          </div>
        }
      }

      @if (activeTab === 'liked') {
        @if (isLoadingLiked) {
          <div class="loading"><div class="spinner"></div></div>
        } @else if (likedSongs.length === 0) {
          <div class="empty-state">
            <div class="empty-icon">💚</div>
            <h3>Songs you like will appear here</h3>
            <p>Save songs by tapping the heart icon.</p>
          </div>
        } @else {
          <div class="liked-header">
            <div class="liked-cover">
              <svg viewBox="0 0 24 24" fill="#1DB954" width="48" height="48">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <div class="liked-info">
              <span>Playlist</span>
              <h2>Liked Songs</h2>
              <p>{{ likedSongs.length }} songs</p>
            </div>
          </div>
          <div class="songs-list">
            @for (song of likedSongs; track song._id; let i = $index) {
              <app-song-card [song]="song" [songs]="likedSongs" [index]="i" />
            }
          </div>
        }
      }

      @if (showCreateModal) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Create Playlist</h2>
              <button class="close-btn" (click)="closeModal()">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <form [formGroup]="createForm" (ngSubmit)="createPlaylist()">
              <div class="form-group">
                <label>Playlist name</label>
                <input type="text" formControlName="name" placeholder="My Playlist #1" />
              </div>
              <div class="form-group">
                <label>Description <span class="optional">(optional)</span></label>
                <textarea formControlName="description" placeholder="Add an optional description" rows="3"></textarea>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="closeModal()">Cancel</button>
                <button type="submit" class="btn-create" [disabled]="createForm.invalid || isCreating">
                  {{ isCreating ? 'Creating...' : 'Create' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .library-page {
      padding: 1.5rem 2rem 2rem;
      min-height: 100%;
    }

    .library-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;

      h1 { font-size: 2rem; font-weight: 700; color: #fff; }

      .create-btn {
        width: 36px; height: 36px;
        border-radius: 50%;
        background: transparent;
        color: #B3B3B3;
        display: flex; align-items: center; justify-content: center;
        &:hover { color: #fff; background: rgba(255,255,255,0.1); }
      }
    }

    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 2rem;

      button {
        padding: 0.5rem 1rem;
        border-radius: 500px;
        background: transparent;
        color: #B3B3B3;
        font-size: 0.875rem;
        font-weight: 700;
        border: 1px solid #727272;
        transition: all 0.2s;

        &.active, &:hover {
          background: #fff;
          color: #000;
          border-color: #fff;
        }
      }
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 3rem;
      .spinner {
        width: 40px; height: 40px;
        border: 3px solid rgba(255,255,255,0.1);
        border-top-color: #1DB954;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      .empty-icon { font-size: 4rem; margin-bottom: 1rem; }
      h3 { font-size: 1.25rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; }
      p { color: #B3B3B3; margin-bottom: 1.5rem; }
    }

    .btn-primary {
      padding: 0.75rem 2rem;
      background: #1DB954;
      color: #000;
      border: none;
      border-radius: 500px;
      font-weight: 700;
      font-size: 0.875rem;
      cursor: pointer;
      &:hover { background: #1ed760; }
    }

    .playlists-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 1.5rem;
    }

    .liked-header {
      display: flex;
      align-items: flex-end;
      gap: 1.5rem;
      padding: 2rem;
      background: linear-gradient(to bottom, #4a235a, #121212);
      border-radius: 8px;
      margin-bottom: 1.5rem;

      .liked-cover {
        width: 100px;
        height: 100px;
        background: linear-gradient(135deg, #450af5, #c4efd9);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .liked-info {
        span { font-size: 0.75rem; color: #fff; text-transform: uppercase; }
        h2 { font-size: 2rem; font-weight: 700; color: #fff; margin: 0.25rem 0; }
        p { color: #B3B3B3; font-size: 0.875rem; }
      }
    }

    .songs-list { display: flex; flex-direction: column; }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: #282828;
      border-radius: 8px;
      padding: 1.5rem;
      width: 100%;
      max-width: 480px;

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.5rem;
        h2 { font-size: 1.25rem; font-weight: 700; color: #fff; }
        .close-btn { background: none; border: none; color: #B3B3B3; cursor: pointer; padding: 0.25rem; &:hover { color: #fff; } }
      }

      .form-group {
        margin-bottom: 1rem;
        label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 600; color: #fff; .optional { color: #B3B3B3; font-weight: 400; } }
        input, textarea {
          width: 100%;
          padding: 0.75rem;
          background: #3E3E3E;
          border: 1px solid transparent;
          border-radius: 4px;
          color: #fff;
          font-size: 0.875rem;
          resize: vertical;
          &::placeholder { color: #727272; }
          &:focus { outline: none; border-color: #fff; }
        }
      }

      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.5rem;

        .btn-cancel {
          padding: 0.75rem 1.5rem;
          background: transparent;
          color: #fff;
          border: 1px solid #727272;
          border-radius: 500px;
          font-weight: 700;
          cursor: pointer;
          &:hover { border-color: #fff; }
        }

        .btn-create {
          padding: 0.75rem 1.5rem;
          background: #1DB954;
          color: #000;
          border: none;
          border-radius: 500px;
          font-weight: 700;
          cursor: pointer;
          &:hover:not(:disabled) { background: #1ed760; }
          &:disabled { opacity: 0.6; cursor: not-allowed; }
        }
      }
    }
  `]
})
export class LibraryComponent implements OnInit {
  playlists: Playlist[] = [];
  likedSongs: Song[] = [];
  activeTab: 'playlists' | 'liked' = 'playlists';
  isLoading = true;
  isLoadingLiked = false;
  showCreateModal = false;
  isCreating = false;
  createForm: FormGroup;

  constructor(
    private playlistService: PlaylistService,
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(300)]
    });
  }

  ngOnInit(): void {
    this.loadPlaylists();
  }

  loadPlaylists(): void {
    this.isLoading = true;
    this.playlistService.getMyPlaylists().subscribe({
      next: playlists => { this.playlists = playlists; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  loadLiked(): void {
    if (this.likedSongs.length > 0) return;
    this.isLoadingLiked = true;
    this.userService.getLikedSongs().subscribe({
      next: songs => { this.likedSongs = songs; this.isLoadingLiked = false; },
      error: () => { this.isLoadingLiked = false; }
    });
  }

  createPlaylist(): void {
    if (this.createForm.invalid) return;
    this.isCreating = true;
    const { name, description } = this.createForm.value;

    this.playlistService.create({ name, description }).subscribe({
      next: playlist => {
        this.playlists.unshift(playlist);
        this.closeModal();
        this.isCreating = false;
      },
      error: () => { this.isCreating = false; }
    });
  }

  closeModal(): void {
    this.showCreateModal = false;
    this.createForm.reset();
  }

  onPlaylistDeleted(id: string): void {
    this.playlists = this.playlists.filter(p => p._id !== id);
  }
}
