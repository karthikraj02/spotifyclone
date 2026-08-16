import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArtistService, ArtistDetail } from '../../services/artist.service';
import { PlayerService } from '../../services/player.service';
import { AuthService } from '../../services/auth.service';
import { SongCardComponent } from '../shared/song-card/song-card.component';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';

@Component({
  selector: 'app-artist',
  standalone: true,
  imports: [CommonModule, RouterLink, SongCardComponent, AssetUrlPipe],
  template: `
    <div class="artist-page">
      @if (isLoading) {
        <div class="loading"><div class="spinner"></div></div>
      } @else if (!artist) {
        <div class="error-state"><h2>Artist not found</h2></div>
      } @else {
        <div class="artist-hero" [style.background]="heroGradient">
          <div class="hero-image">
            <img [src]="artist.image | assetUrl" [alt]="artist.name" />
          </div>
          <div class="hero-info">
            <span class="type">Artist</span>
            <h1>{{ artist.name }}</h1>
            <p class="followers">{{ artist.followers | number }} followers</p>
          </div>
        </div>

        <div class="artist-controls">
          @if (artist.songs.length > 0) {
            <button class="play-btn" (click)="playAll()">
              <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          }
          <button
            class="follow-btn"
            [class.following]="isFollowing"
            [disabled]="isFollowLoading"
            (click)="toggleFollow()"
          >
            {{ isFollowing ? 'Following' : 'Follow' }}
          </button>
        </div>

        @if (artist.bio) {
          <section class="bio-section">
            <h2>About</h2>
            <p>{{ artist.bio }}</p>
          </section>
        }

        @if (artist.songs.length > 0) {
          <section class="songs-section">
            <h2>Popular</h2>
            <div class="songs-list">
              @for (song of artist.songs.slice(0, showAllSongs ? undefined : 5); track song._id; let i = $index) {
                <app-song-card [song]="song" [songs]="artist.songs" [index]="i" />
              }
            </div>
            @if (artist.songs.length > 5) {
              <button class="show-more-btn" (click)="showAllSongs = !showAllSongs">
                {{ showAllSongs ? 'Show less' : 'See more' }}
              </button>
            }
          </section>
        }

        @if (artist.albums.length > 0) {
          <section class="albums-section">
            <h2>Albums</h2>
            <div class="albums-grid">
              @for (album of artist.albums; track album._id) {
                <a [routerLink]="['/album', album._id]" class="album-card">
                  <div class="album-cover">
                    <img [src]="album.coverUrl | assetUrl" [alt]="album.title" />
                  </div>
                  <p class="album-title">{{ album.title }}</p>
                  <span class="album-year">{{ album.releaseDate | date: 'yyyy' }} • Album</span>
                </a>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .artist-page { min-height: 100%; }

    .loading {
      display: flex; justify-content: center; padding: 4rem;
      .spinner { width: 40px; height: 40px; border: 3px solid var(--border-color); border-top-color: #1DB954; border-radius: 50%; animation: spin 0.8s linear infinite; }
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .error-state { text-align: center; padding: 4rem; h2 { color: var(--text-primary); } }

    .artist-hero {
      position: relative;
      min-height: 340px;
      display: flex;
      align-items: flex-end;
      padding: 2rem;

      .hero-image {
        position: absolute;
        inset: 0;
        overflow: hidden;
        img { width: 100%; height: 100%; object-fit: cover; }
        &::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%);
        }
      }

      .hero-info {
        position: relative;
        z-index: 1;
        .type { font-size: 0.75rem; font-weight: 700; color: var(--text-primary); text-transform: uppercase; }
        h1 { font-size: 4rem; font-weight: 900; color: var(--text-primary); margin: 0.25rem 0; }
        .followers { color: rgba(255,255,255,0.7); font-size: 0.875rem; }
      }
    }

    .artist-controls {
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
        &:hover { transform: scale(1.05); background: #1ed760; }
      }

      .follow-btn {
        padding: 0.5rem 1.25rem;
        border-radius: 500px;
        background: transparent;
        border: 1px solid var(--text-muted);
        color: var(--text-primary);
        font-weight: 700;
        font-size: 0.875rem;
        cursor: pointer;
        transition: border-color 0.1s;
        &:hover:not(:disabled) { border-color: var(--text-primary); }
        &:disabled { opacity: 0.6; cursor: not-allowed; }
        &.following { border-color: #1DB954; color: #1DB954; }
      }
    }

    .bio-section, .songs-section, .albums-section {
      padding: 0 2rem 2rem;

      h2 { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem; }
    }

    .bio-section p { color: var(--text-secondary); line-height: 1.6; }

    .songs-list { display: flex; flex-direction: column; }

    .show-more-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 0.875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      cursor: pointer;
      padding: 1rem 1rem;
      &:hover { color: var(--text-primary); }
    }

    .albums-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 1.5rem;
    }

    .album-card {
      background: var(--bg-secondary);
      border-radius: 8px;
      padding: 1rem;
      cursor: pointer;
      transition: background 0.2s;
      display: block;
      text-decoration: none;
      color: inherit;
      &:hover { background: var(--bg-tertiary); }

      .album-cover {
        width: 100%;
        aspect-ratio: 1;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 0.75rem;
        img { width: 100%; height: 100%; object-fit: cover; }
      }

      .album-title { font-weight: 700; font-size: 0.875rem; color: var(--text-primary); margin-bottom: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .album-year { font-size: 0.75rem; color: var(--text-secondary); }
    }
  `]
})
export class ArtistComponent implements OnInit {
  artist: ArtistDetail | null = null;
  isLoading = true;
  showAllSongs = false;
  heroGradient = 'linear-gradient(to bottom, var(--artist-gradient-start), var(--bg-primary))';
  isFollowing = false;
  isFollowLoading = false;

  constructor(
    private route: ActivatedRoute,
    private artistService: ArtistService,
    private playerService: PlayerService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Subscribe rather than read the route snapshot once: this component is reused
    // by Angular's default router strategy when navigating between two /artist/:id
    // routes (e.g. clicking a different artist link from this same page), so a
    // one-time snapshot read would leave the page showing the previous artist.
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) return;
      this.loadArtist(id);
    });
  }

  private loadArtist(id: string): void {
    this.isLoading = true;
    this.showAllSongs = false;
    this.artist = null;

    this.artistService.getById(id).subscribe({
      next: artist => {
        this.artist = artist;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });

    if (this.authService.isLoggedIn()) {
      this.artistService.getFollowStatus(id).subscribe({
        next: res => { this.isFollowing = res.following; },
        error: () => { /* non-critical - leave default state */ }
      });
    }
  }

  playAll(): void {
    if (this.artist?.songs.length) {
      this.playerService.playQueue(this.artist.songs);
    }
  }

  toggleFollow(): void {
    if (!this.artist || this.isFollowLoading) return;
    this.isFollowLoading = true;
    this.artistService.toggleFollow(this.artist._id).subscribe({
      next: res => {
        this.isFollowing = res.following;
        if (this.artist) this.artist.followers = res.followers;
        this.isFollowLoading = false;
      },
      error: () => { this.isFollowLoading = false; }
    });
  }
}
