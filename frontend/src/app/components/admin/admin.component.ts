import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SongService, Song } from '../../services/song.service';
import { ArtistService, ArtistDetail } from '../../services/artist.service';
import { UserService } from '../../services/user.service';
import { User } from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="admin-page">
      <h1>Admin Panel</h1>

      <div class="tabs">
        <button [class.active]="activeTab === 'songs'" (click)="activeTab = 'songs'">Songs</button>
        <button [class.active]="activeTab === 'artists'" (click)="activeTab = 'artists'">Artists</button>
        <button [class.active]="activeTab === 'users'" (click)="activeTab = 'users'; loadUsers()">Users</button>
      </div>

      @if (successMsg) {
        <div class="alert success">{{ successMsg }}</div>
      }
      @if (errorMsg) {
        <div class="alert error">{{ errorMsg }}</div>
      }

      @if (activeTab === 'songs') {
        <div class="section">
          <h2>Add New Song</h2>
          <form [formGroup]="songForm" (ngSubmit)="addSong()" class="form-grid">
            <div class="form-group">
              <label>Title *</label>
              <input type="text" formControlName="title" placeholder="Song title" />
            </div>
            <div class="form-group">
              <label>Artist *</label>
              <select formControlName="artistId">
                <option value="">Select artist</option>
                @for (artist of artists; track artist._id) {
                  <option [value]="artist._id">{{ artist.name }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Audio File or URL *</label>
              <div class="file-url-group">
                <input type="file" (change)="onAudioSelected($event)" accept="audio/*" />
                <span class="or">OR</span>
                <input type="url" formControlName="audioUrl" placeholder="https://..." />
              </div>
            </div>
            <div class="form-group">
              <label>Cover Image File or URL</label>
              <div class="file-url-group">
                <input type="file" (change)="onCoverSelected($event)" accept="image/*" />
                <span class="or">OR</span>
                <input type="url" formControlName="coverUrl" placeholder="https://..." />
              </div>
            </div>
            <div class="form-group">
              <label>Duration (seconds) *</label>
              <input type="number" formControlName="duration" placeholder="240" min="1" />
            </div>
            <div class="form-group">
              <label>Genre</label>
              <input type="text" formControlName="genre" placeholder="Pop, Rock, Hip-Hop..." />
            </div>
            <button type="submit" class="submit-btn" [disabled]="songForm.invalid || isAddingSong">
              {{ isAddingSong ? 'Adding...' : 'Add Song' }}
            </button>
          </form>

          <h2 style="margin-top: 2rem;">All Songs</h2>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Cover</th>
                  <th>Title</th>
                  <th>Artist</th>
                  <th>Duration</th>
                  <th>Plays</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (song of songs; track song._id) {
                  <tr>
                    <td><img [src]="song.coverUrl" [alt]="song.title" class="thumb" /></td>
                    <td>{{ song.title }}</td>
                    <td>{{ song.artist.name }}</td>
                    <td>{{ formatDuration(song.duration) }}</td>
                    <td>{{ song.plays }}</td>
                    <td>
                      <button class="delete-btn" (click)="deleteSong(song._id)">Delete</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (activeTab === 'artists') {
        <div class="section">
          <h2>Add New Artist</h2>
          <form [formGroup]="artistForm" (ngSubmit)="addArtist()" class="form-grid">
            <div class="form-group">
              <label>Name *</label>
              <input type="text" formControlName="name" placeholder="Artist name" />
            </div>
            <div class="form-group">
              <label>Bio</label>
              <textarea formControlName="bio" placeholder="Artist biography" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label>Image URL</label>
              <input type="url" formControlName="image" placeholder="https://..." />
            </div>
            <button type="submit" class="submit-btn" [disabled]="artistForm.invalid || isAddingArtist">
              {{ isAddingArtist ? 'Adding...' : 'Add Artist' }}
            </button>
          </form>

          <h2 style="margin-top: 2rem;">All Artists</h2>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Followers</th>
                  <th>Songs</th>
                </tr>
              </thead>
              <tbody>
                @for (artist of artists; track artist._id) {
                  <tr>
                    <td><img [src]="artist.image" [alt]="artist.name" class="thumb" /></td>
                    <td>{{ artist.name }}</td>
                    <td>{{ artist.followers }}</td>
                    <td>{{ artist.songs.length || 0 }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (activeTab === 'users') {
        <div class="section">
          <h2>All Users</h2>
          @if (isLoadingUsers) {
            <div class="loading"><div class="spinner"></div></div>
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (user of users; track user._id) {
                    <tr>
                      <td>{{ user.username }}</td>
                      <td>{{ user.email }}</td>
                      <td><span class="role-badge" [class.admin]="user.role === 'admin'">{{ user.role }}</span></td>
                      <td>{{ user.createdAt | date: 'mediumDate' }}</td>
                      <td>
                        @if (user.role !== 'admin') {
                          <button class="delete-btn" (click)="deleteUser(user._id)">Delete</button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-page { padding: 1.5rem 2rem 2rem; min-height: 100%; }

    h1 { font-size: 2rem; font-weight: 700; color: #fff; margin-bottom: 1.5rem; }

    .tabs {
      display: flex; gap: 0.5rem; margin-bottom: 2rem;
      button {
        padding: 0.5rem 1.5rem;
        border-radius: 4px;
        background: #282828;
        color: #B3B3B3;
        border: none;
        font-weight: 600;
        cursor: pointer;
        &.active { background: #1DB954; color: #000; }
        &:hover:not(.active) { background: #3E3E3E; color: #fff; }
      }
    }

    .alert {
      padding: 0.75rem 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
      font-size: 0.875rem;
      &.success { background: rgba(29,185,84,0.1); color: #1DB954; border: 1px solid rgba(29,185,84,0.3); }
      &.error { background: rgba(233,20,41,0.1); color: #E91429; border: 1px solid rgba(233,20,41,0.3); }
    }

    .section h2 { font-size: 1.25rem; font-weight: 700; color: #fff; margin-bottom: 1rem; }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
      background: #181818;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 1rem;

      .form-group {
        label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 600; color: #fff; }
        input, select, textarea {
          width: 100%;
          padding: 0.75rem;
          background: #282828;
          border: 1px solid transparent;
          border-radius: 4px;
          color: #fff;
          font-size: 0.875rem;
          &::placeholder { color: #727272; }
          &:focus { outline: none; border-color: #fff; }
        }
        select option { background: #282828; }
        textarea { resize: vertical; }
        .file-url-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          input[type="file"] { padding: 0.5rem; flex: 1; }
          .or { font-size: 0.75rem; color: #B3B3B3; font-weight: 700; }
        }
      }

      .submit-btn {
        grid-column: 1 / -1;
        padding: 0.75rem 2rem;
        background: #1DB954;
        color: #000;
        border: none;
        border-radius: 500px;
        font-weight: 700;
        cursor: pointer;
        width: fit-content;
        &:hover:not(:disabled) { background: #1ed760; }
        &:disabled { opacity: 0.6; cursor: not-allowed; }
      }
    }

    .table-wrapper { overflow-x: auto; }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      th, td {
        padding: 0.75rem 1rem;
        text-align: left;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        font-size: 0.875rem;
      }
      th { color: #B3B3B3; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; }
      td { color: #fff; }
      tr:hover td { background: rgba(255,255,255,0.05); }

      .thumb { width: 40px; height: 40px; border-radius: 4px; object-fit: cover; }

      .delete-btn {
        padding: 0.375rem 0.75rem;
        background: transparent;
        border: 1px solid #E91429;
        color: #E91429;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        &:hover { background: rgba(233,20,41,0.1); }
      }

      .role-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 700;
        background: rgba(255,255,255,0.1);
        &.admin { background: rgba(29,185,84,0.2); color: #1DB954; }
      }
    }

    .loading {
      display: flex; justify-content: center; padding: 2rem;
      .spinner { width: 32px; height: 32px; border: 2px solid rgba(255,255,255,0.1); border-top-color: #1DB954; border-radius: 50%; animation: spin 0.8s linear infinite; }
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class AdminComponent implements OnInit {
  activeTab: 'songs' | 'artists' | 'users' = 'songs';
  songs: Song[] = [];
  artists: ArtistDetail[] = [];
  users: User[] = [];
  isLoadingUsers = false;
  isAddingSong = false;
  isAddingArtist = false;
  successMsg = '';
  errorMsg = '';
  
  audioFile: File | null = null;
  coverFile: File | null = null;

  songForm: FormGroup;
  artistForm: FormGroup;

  constructor(
    private songService: SongService,
    private artistService: ArtistService,
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.songForm = this.fb.group({
      title: ['', Validators.required],
      artistId: ['', Validators.required],
      audioUrl: [''],
      coverUrl: [''],
      duration: ['', [Validators.required, Validators.min(1)]],
      genre: ['']
    });

    this.artistForm = this.fb.group({
      name: ['', Validators.required],
      bio: [''],
      image: ['']
    });
  }

  ngOnInit(): void {
    this.loadSongs();
    this.loadArtists();
  }

  loadSongs(): void {
    this.songService.getSongs(1, 50).subscribe({
      next: res => { this.songs = res.songs; }
    });
  }

  loadArtists(): void {
    this.artistService.getAll().subscribe({
      next: artists => { this.artists = artists; }
    });
  }

  loadUsers(): void {
    if (this.users.length > 0) return;
    this.isLoadingUsers = true;
    this.userService.getAllUsers().subscribe({
      next: res => { this.users = res.users; this.isLoadingUsers = false; },
      error: () => { this.isLoadingUsers = false; }
    });
  }

  onAudioSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.audioFile = input.files[0];
      this.songForm.get('audioUrl')?.setValue(''); // Clear URL if file selected
    }
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.coverFile = input.files[0];
      this.songForm.get('coverUrl')?.setValue(''); // Clear URL if file selected
    }
  }

  addSong(): void {
    const { title, artistId, audioUrl, coverUrl, duration, genre } = this.songForm.value;
    
    // Validate either file or URL is present
    if (!this.audioFile && !audioUrl) {
      this.errorMsg = 'Audio file or URL is required';
      return;
    }
    
    if (this.songForm.invalid) {
      this.errorMsg = 'Please fill all required fields correctly.';
      return;
    }
    
    this.isAddingSong = true;
    this.errorMsg = '';

    const formData = new FormData();
    formData.append('title', title);
    formData.append('artistId', artistId);
    formData.append('duration', duration.toString());
    
    if (this.audioFile) {
      formData.append('audio', this.audioFile);
    } else if (audioUrl) {
      formData.append('audioUrl', audioUrl);
    }
    
    if (this.coverFile) {
      formData.append('cover', this.coverFile);
    } else if (coverUrl) {
      formData.append('coverUrl', coverUrl);
    }
    
    if (genre) formData.append('genre', genre);

    this.songService.createSong(formData).subscribe({
      next: song => {
        this.songs.unshift(song);
        this.songForm.reset();
        this.audioFile = null;
        this.coverFile = null;
        // Reset file inputs manually
        const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
        fileInputs.forEach(input => input.value = '');
        
        this.successMsg = `Song "${song.title}" added successfully!`;
        this.isAddingSong = false;
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: err => {
        this.errorMsg = err.error?.message || 'Failed to add song';
        this.isAddingSong = false;
      }
    });
  }

  deleteSong(id: string): void {
    if (!confirm('Delete this song?')) return;
    this.songService.deleteSong(id).subscribe({
      next: () => {
        this.songs = this.songs.filter(s => s._id !== id);
        this.successMsg = 'Song deleted successfully';
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: err => { this.errorMsg = err.error?.message || 'Failed to delete song'; }
    });
  }

  addArtist(): void {
    if (this.artistForm.invalid) return;
    this.isAddingArtist = true;
    this.errorMsg = '';

    this.artistService.create(this.artistForm.value).subscribe({
      next: artist => {
        this.artists.unshift(artist);
        this.artistForm.reset();
        this.successMsg = `Artist "${artist.name}" added successfully!`;
        this.isAddingArtist = false;
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: err => {
        this.errorMsg = err.error?.message || 'Failed to add artist';
        this.isAddingArtist = false;
      }
    });
  }

  deleteUser(id: string): void {
    if (!confirm('Delete this user?')) return;
    this.userService.deleteUser(id).subscribe({
      next: () => {
        this.users = this.users.filter(u => u._id !== id);
        this.successMsg = 'User deleted successfully';
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: err => { this.errorMsg = err.error?.message || 'Failed to delete user'; }
    });
  }

  formatDuration(seconds: number): string {
    return this.songService.formatDuration(seconds);
  }
}
