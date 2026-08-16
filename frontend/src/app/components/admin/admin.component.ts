import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SongService, Song } from '../../services/song.service';
import { ArtistService, ArtistListItem } from '../../services/artist.service';
import { AlbumService, AlbumListItem } from '../../services/album.service';
import { UserService } from '../../services/user.service';
import { User, AuthService } from '../../services/auth.service';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AssetUrlPipe],
  template: `
    <div class="admin-page">
      <h1>Admin Panel</h1>

      <div class="tabs">
        <button [class.active]="activeTab === 'songs'" (click)="activeTab = 'songs'">Songs</button>
        <button [class.active]="activeTab === 'artists'" (click)="activeTab = 'artists'">Artists</button>
        <button [class.active]="activeTab === 'albums'" (click)="activeTab = 'albums'; loadAlbums()">Albums</button>
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
          <h2>{{ editingSongId ? 'Edit Song' : 'Add New Song' }}</h2>
          <form [formGroup]="songForm" (ngSubmit)="saveSong()" class="form-grid">
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
              <label>Audio File or URL {{ editingSongId ? '' : '*' }}</label>
              <div class="file-url-group">
                <input type="file" (change)="onAudioSelected($event)" accept="audio/*" />
                <span class="or">OR</span>
                <input type="url" formControlName="audioUrl" placeholder="https://..." />
              </div>
              @if (editingSongId) {
                <span class="hint">Leave the file/URL as-is to keep the current audio.</span>
              }
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
            <div class="form-actions">
              <button type="submit" class="submit-btn" [disabled]="songForm.invalid || isSavingSong">
                {{ isSavingSong ? 'Saving...' : (editingSongId ? 'Update Song' : 'Add Song') }}
              </button>
              @if (editingSongId) {
                <button type="button" class="cancel-btn" (click)="cancelEditSong()">Cancel</button>
              }
            </div>
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
                    <td><img [src]="song.coverUrl | assetUrl" [alt]="song.title" class="thumb" /></td>
                    <td>{{ song.title }}</td>
                    <td>{{ song.artist.name }}</td>
                    <td>{{ formatDuration(song.duration) }}</td>
                    <td>{{ song.plays }}</td>
                    <td class="actions-cell">
                      <button class="edit-btn" (click)="editSong(song)">Edit</button>
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
          <h2>{{ editingArtistId ? 'Edit Artist' : 'Add New Artist' }}</h2>
          <form [formGroup]="artistForm" (ngSubmit)="saveArtist()" class="form-grid">
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
            <div class="form-actions">
              <button type="submit" class="submit-btn" [disabled]="artistForm.invalid || isSavingArtist">
                {{ isSavingArtist ? 'Saving...' : (editingArtistId ? 'Update Artist' : 'Add Artist') }}
              </button>
              @if (editingArtistId) {
                <button type="button" class="cancel-btn" (click)="cancelEditArtist()">Cancel</button>
              }
            </div>
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
                  <th>Albums</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (artist of artists; track artist._id) {
                  <tr>
                    <td><img [src]="artist.image | assetUrl" [alt]="artist.name" class="thumb" /></td>
                    <td>{{ artist.name }}</td>
                    <td>{{ artist.followers }}</td>
                    <td>{{ artist.songsCount || 0 }}</td>
                    <td>{{ artist.albumsCount || 0 }}</td>
                    <td class="actions-cell">
                      <button class="edit-btn" (click)="editArtist(artist)">Edit</button>
                      <button class="delete-btn" (click)="deleteArtist(artist._id)">Delete</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (activeTab === 'albums') {
        <div class="section">
          <h2>{{ editingAlbumId ? 'Edit Album' : 'Add New Album' }}</h2>
          <form [formGroup]="albumForm" (ngSubmit)="saveAlbum()" class="form-grid">
            <div class="form-group">
              <label>Title *</label>
              <input type="text" formControlName="title" placeholder="Album title" />
            </div>
            <div class="form-group">
              <label>Artist *</label>
              <select formControlName="artistId" [class.disabled]="!!editingAlbumId">
                <option value="">Select artist</option>
                @for (artist of artists; track artist._id) {
                  <option [value]="artist._id">{{ artist.name }}</option>
                }
              </select>
              @if (editingAlbumId) {
                <span class="hint">The artist of an existing album can't be changed here - delete and re-add if needed.</span>
              }
            </div>
            <div class="form-group">
              <label>Cover Image URL</label>
              <input type="url" formControlName="coverUrl" placeholder="https://..." />
            </div>
            <div class="form-group">
              <label>Release Date</label>
              <input type="date" formControlName="releaseDate" />
            </div>
            <div class="form-group">
              <label>Genre</label>
              <input type="text" formControlName="genre" placeholder="Pop, Rock, Hip-Hop..." />
            </div>
            <div class="form-actions">
              <button type="submit" class="submit-btn" [disabled]="albumForm.invalid || isSavingAlbum">
                {{ isSavingAlbum ? 'Saving...' : (editingAlbumId ? 'Update Album' : 'Add Album') }}
              </button>
              @if (editingAlbumId) {
                <button type="button" class="cancel-btn" (click)="cancelEditAlbum()">Cancel</button>
              }
            </div>
          </form>

          <h2 style="margin-top: 2rem;">All Albums</h2>
          @if (isLoadingAlbums) {
            <div class="loading"><div class="spinner"></div></div>
          } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Cover</th>
                    <th>Title</th>
                    <th>Artist</th>
                    <th>Release Date</th>
                    <th>Genre</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (album of albums; track album._id) {
                    <tr>
                      <td><img [src]="album.coverUrl | assetUrl" [alt]="album.title" class="thumb" /></td>
                      <td>{{ album.title }}</td>
                      <td>{{ album.artist.name }}</td>
                      <td>{{ album.releaseDate | date: 'mediumDate' }}</td>
                      <td>{{ album.genre }}</td>
                      <td class="actions-cell">
                        <button class="edit-btn" (click)="editAlbum(album)">Edit</button>
                        <button class="delete-btn" (click)="deleteAlbum(album._id)">Delete</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
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
                      <td class="actions-cell">
                        @if (user._id !== currentUserId) {
                          @if (user.role === 'admin') {
                            <button class="role-btn" [disabled]="isUpdatingRole === user._id" (click)="setRole(user, 'user')">Remove Admin</button>
                          } @else {
                            <button class="role-btn" [disabled]="isUpdatingRole === user._id" (click)="setRole(user, 'admin')">Make Admin</button>
                          }
                          @if (user.role !== 'admin') {
                            <button class="delete-btn" (click)="deleteUser(user._id)">Delete</button>
                          }
                        } @else {
                          <span class="you-badge">You</span>
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
          &:focus { outline: none; border-color: #1DB954; }
          &.disabled { opacity: 0.5; pointer-events: none; }
        }
        textarea { resize: vertical; }
        .hint { display: block; margin-top: 0.375rem; font-size: 0.75rem; color: #727272; }
      }

      .file-url-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        input[type="file"] {
          flex: 1;
          padding: 0.5rem;
          font-size: 0.75rem;
        }
        input[type="url"] { flex: 1; }
        .or { color: #727272; font-size: 0.75rem; font-weight: 700; }
      }

      .form-actions {
        display: flex;
        align-items: flex-end;
        gap: 0.75rem;
      }

      .submit-btn {
        padding: 0.75rem 1.5rem;
        background: #1DB954;
        color: #000;
        border: none;
        border-radius: 500px;
        font-weight: 700;
        cursor: pointer;
        height: fit-content;
        width: fit-content;
        &:hover:not(:disabled) { background: #1ed760; }
        &:disabled { opacity: 0.6; cursor: not-allowed; }
      }

      .cancel-btn {
        padding: 0.75rem 1.5rem;
        background: transparent;
        color: #fff;
        border: 1px solid #727272;
        border-radius: 500px;
        font-weight: 700;
        cursor: pointer;
        height: fit-content;
        width: fit-content;
        &:hover { border-color: #fff; }
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

      .actions-cell { display: flex; gap: 0.5rem; flex-wrap: wrap; }

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

      .edit-btn {
        padding: 0.375rem 0.75rem;
        background: transparent;
        border: 1px solid #727272;
        color: #fff;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        &:hover { border-color: #fff; }
      }

      .role-btn {
        padding: 0.375rem 0.75rem;
        background: transparent;
        border: 1px solid #1DB954;
        color: #1DB954;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        &:hover:not(:disabled) { background: rgba(29,185,84,0.1); }
        &:disabled { opacity: 0.6; cursor: not-allowed; }
      }

      .you-badge {
        font-size: 0.75rem;
        color: #727272;
        font-style: italic;
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
  activeTab: 'songs' | 'artists' | 'albums' | 'users' = 'songs';
  songs: Song[] = [];
  artists: ArtistListItem[] = [];
  albums: AlbumListItem[] = [];
  users: User[] = [];
  currentUserId: string | undefined;

  isLoadingUsers = false;
  isLoadingAlbums = false;
  isSavingSong = false;
  isSavingArtist = false;
  isSavingAlbum = false;
  isUpdatingRole: string | null = null;
  successMsg = '';
  errorMsg = '';

  editingSongId: string | null = null;
  editingArtistId: string | null = null;
  editingAlbumId: string | null = null;

  audioFile: File | null = null;
  coverFile: File | null = null;

  songForm: FormGroup;
  artistForm: FormGroup;
  albumForm: FormGroup;

  constructor(
    private songService: SongService,
    private artistService: ArtistService,
    private albumService: AlbumService,
    private userService: UserService,
    private authService: AuthService,
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

    this.albumForm = this.fb.group({
      title: ['', Validators.required],
      artistId: ['', Validators.required],
      coverUrl: [''],
      releaseDate: [''],
      genre: ['']
    });
  }

  ngOnInit(): void {
    this.currentUserId = this.authService.currentUser()?._id;
    this.loadSongs();
    this.loadArtists();
  }

  private flashSuccess(msg: string): void {
    this.successMsg = msg;
    setTimeout(() => this.successMsg = '', 3000);
  }

  // ---------- Songs ----------

  loadSongs(): void {
    this.songService.getSongs(1, 50).subscribe({
      next: res => { this.songs = res.songs; }
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

  editSong(song: Song): void {
    this.editingSongId = song._id;
    this.audioFile = null;
    this.coverFile = null;
    this.errorMsg = '';
    this.songForm.setValue({
      title: song.title,
      artistId: song.artist._id,
      audioUrl: song.audioUrl.startsWith('http') ? song.audioUrl : song.audioUrl,
      coverUrl: song.coverUrl.startsWith('http') ? song.coverUrl : song.coverUrl,
      duration: song.duration,
      genre: song.genre
    });
  }

  cancelEditSong(): void {
    this.resetSongForm();
  }

  private resetSongForm(): void {
    this.editingSongId = null;
    this.songForm.reset();
    this.audioFile = null;
    this.coverFile = null;
    const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
    fileInputs.forEach(input => input.value = '');
  }

  saveSong(): void {
    const { title, artistId, audioUrl, coverUrl, duration, genre } = this.songForm.value;

    // Validate either file or URL is present (existing URL counts when editing)
    if (!this.audioFile && !audioUrl) {
      this.errorMsg = 'Audio file or URL is required';
      return;
    }

    if (this.songForm.invalid) {
      this.errorMsg = 'Please fill all required fields correctly.';
      return;
    }

    this.isSavingSong = true;
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

    const isEditing = !!this.editingSongId;
    const request$ = isEditing
      ? this.songService.updateSong(this.editingSongId!, formData)
      : this.songService.createSong(formData);

    request$.subscribe({
      next: song => {
        if (isEditing) {
          const idx = this.songs.findIndex(s => s._id === song._id);
          if (idx >= 0) this.songs[idx] = song;
        } else {
          this.songs.unshift(song);
        }
        this.flashSuccess(`Song "${song.title}" ${isEditing ? 'updated' : 'added'} successfully!`);
        this.resetSongForm();
        this.isSavingSong = false;
      },
      error: err => {
        this.errorMsg = err.error?.message || `Failed to ${isEditing ? 'update' : 'add'} song`;
        this.isSavingSong = false;
      }
    });
  }

  deleteSong(id: string): void {
    if (!confirm('Delete this song?')) return;
    this.songService.deleteSong(id).subscribe({
      next: () => {
        this.songs = this.songs.filter(s => s._id !== id);
        this.flashSuccess('Song deleted successfully');
      },
      error: err => { this.errorMsg = err.error?.message || 'Failed to delete song'; }
    });
  }

  // ---------- Artists ----------

  loadArtists(): void {
    this.artistService.getAll().subscribe({
      next: artists => { this.artists = artists; }
    });
  }

  editArtist(artist: ArtistListItem): void {
    this.editingArtistId = artist._id;
    this.errorMsg = '';
    this.artistForm.setValue({
      name: artist.name,
      bio: artist.bio || '',
      image: artist.image || ''
    });
  }

  cancelEditArtist(): void {
    this.editingArtistId = null;
    this.artistForm.reset();
  }

  saveArtist(): void {
    if (this.artistForm.invalid) return;
    this.isSavingArtist = true;
    this.errorMsg = '';

    const isEditing = !!this.editingArtistId;
    const request$ = isEditing
      ? this.artistService.update(this.editingArtistId!, this.artistForm.value)
      : this.artistService.create(this.artistForm.value);

    request$.subscribe({
      next: artist => {
        if (isEditing) {
          const idx = this.artists.findIndex(a => a._id === artist._id);
          if (idx >= 0) this.artists[idx] = artist;
        } else {
          this.artists.unshift(artist);
        }
        this.flashSuccess(`Artist "${artist.name}" ${isEditing ? 'updated' : 'added'} successfully!`);
        this.editingArtistId = null;
        this.artistForm.reset();
        this.isSavingArtist = false;
      },
      error: err => {
        this.errorMsg = err.error?.message || `Failed to ${isEditing ? 'update' : 'add'} artist`;
        this.isSavingArtist = false;
      }
    });
  }

  deleteArtist(id: string): void {
    if (!confirm('Delete this artist? This will fail if they still have songs or albums attached.')) return;
    this.artistService.delete(id).subscribe({
      next: () => {
        this.artists = this.artists.filter(a => a._id !== id);
        this.flashSuccess('Artist deleted successfully');
      },
      error: err => { this.errorMsg = err.error?.message || 'Failed to delete artist'; }
    });
  }

  // ---------- Albums ----------

  loadAlbums(): void {
    if (this.albums.length > 0) return;
    this.isLoadingAlbums = true;
    this.albumService.getAll().subscribe({
      next: albums => { this.albums = albums; this.isLoadingAlbums = false; },
      error: () => { this.isLoadingAlbums = false; }
    });
  }

  editAlbum(album: AlbumListItem): void {
    this.editingAlbumId = album._id;
    this.errorMsg = '';
    this.albumForm.setValue({
      title: album.title,
      artistId: album.artist._id,
      coverUrl: album.coverUrl || '',
      releaseDate: album.releaseDate ? album.releaseDate.substring(0, 10) : '',
      genre: album.genre || ''
    });
  }

  cancelEditAlbum(): void {
    this.editingAlbumId = null;
    this.albumForm.reset();
  }

  saveAlbum(): void {
    if (this.albumForm.invalid) return;
    this.isSavingAlbum = true;
    this.errorMsg = '';

    const { title, artistId, coverUrl, releaseDate, genre } = this.albumForm.value;
    const isEditing = !!this.editingAlbumId;

    const request$ = isEditing
      ? this.albumService.update(this.editingAlbumId!, { title, coverUrl, releaseDate, genre })
      : this.albumService.create({ title, artistId, coverUrl, releaseDate, genre });

    request$.subscribe({
      next: album => {
        if (isEditing) {
          const idx = this.albums.findIndex(a => a._id === album._id);
          if (idx >= 0) this.albums[idx] = album;
        } else {
          this.albums.unshift(album);
          // Reflect the new album in the artist's album count without a full reload
          const artist = this.artists.find(a => a._id === artistId);
          if (artist) artist.albumsCount = (artist.albumsCount || 0) + 1;
        }
        this.flashSuccess(`Album "${album.title}" ${isEditing ? 'updated' : 'added'} successfully!`);
        this.editingAlbumId = null;
        this.albumForm.reset();
        this.isSavingAlbum = false;
      },
      error: err => {
        this.errorMsg = err.error?.message || `Failed to ${isEditing ? 'update' : 'add'} album`;
        this.isSavingAlbum = false;
      }
    });
  }

  deleteAlbum(id: string): void {
    if (!confirm('Delete this album? Its songs will be kept but unlinked from the album.')) return;
    this.albumService.delete(id).subscribe({
      next: () => {
        const removed = this.albums.find(a => a._id === id);
        this.albums = this.albums.filter(a => a._id !== id);
        if (removed) {
          const artist = this.artists.find(a => a._id === removed.artist._id);
          if (artist && artist.albumsCount > 0) artist.albumsCount -= 1;
        }
        this.flashSuccess('Album deleted successfully');
      },
      error: err => { this.errorMsg = err.error?.message || 'Failed to delete album'; }
    });
  }

  // ---------- Users ----------

  loadUsers(): void {
    if (this.users.length > 0) return;
    this.isLoadingUsers = true;
    this.userService.getAllUsers().subscribe({
      next: res => { this.users = res.users; this.isLoadingUsers = false; },
      error: () => { this.isLoadingUsers = false; }
    });
  }

  setRole(user: User, role: 'admin' | 'user'): void {
    this.isUpdatingRole = user._id;
    this.userService.updateRole(user._id, role).subscribe({
      next: res => {
        const idx = this.users.findIndex(u => u._id === user._id);
        if (idx >= 0) this.users[idx] = res.user;
        this.flashSuccess(`${user.username} is now ${role === 'admin' ? 'an admin' : 'a regular user'}.`);
        this.isUpdatingRole = null;
      },
      error: err => {
        this.errorMsg = err.error?.message || 'Failed to update role';
        this.isUpdatingRole = null;
      }
    });
  }

  deleteUser(id: string): void {
    if (!confirm('Delete this user?')) return;
    this.userService.deleteUser(id).subscribe({
      next: () => {
        this.users = this.users.filter(u => u._id !== id);
        this.flashSuccess('User deleted successfully');
      },
      error: err => { this.errorMsg = err.error?.message || 'Failed to delete user'; }
    });
  }

  formatDuration(seconds: number): string {
    return this.songService.formatDuration(seconds);
  }
}
