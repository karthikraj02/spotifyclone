import { Component, Input, Output, EventEmitter, OnInit, DestroyRef, inject, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Song, SongService } from '../../../services/song.service';
import { PlayerService } from '../../../services/player.service';
import { AuthService } from '../../../services/auth.service';
import { PlaylistService, Playlist } from '../../../services/playlist.service';
import { ToastService } from '../../../services/toast.service';
import { AssetUrlPipe } from '../../../pipes/asset-url.pipe';

@Component({
  selector: 'app-song-card',
  standalone: true,
  imports: [CommonModule, RouterLink, AssetUrlPipe],
  template: `
    <div
      class="song-card"
      [class.active]="isCurrentSong"
      (click)="play()"
      (mouseenter)="isHovered = true"
      (mouseleave)="isHovered = false"
    >
      <div class="song-index">
        @if (isHovered || isCurrentSong) {
          @if (isCurrentSong && isPlaying) {
            <button class="icon-btn" (click)="togglePlay($event)">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            </button>
          } @else {
            <button class="icon-btn" (click)="play($event)">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          }
        } @else {
          @if (isCurrentSong) {
            <span class="playing-indicator">
              <span></span><span></span><span></span>
            </span>
          } @else {
            <span class="index-num">{{ (index ?? 0) + 1 }}</span>
          }
        }
      </div>

      <div class="song-cover">
        <img [src]="song.coverUrl | assetUrl" [alt]="song.title" />
      </div>

      <div class="song-meta">
        <span class="song-title" [class.accent]="isCurrentSong">{{ song.title }}</span>
        @if (showArtist !== false) {
          <a [routerLink]="['/artist', song.artist._id]" class="song-artist" (click)="$event.stopPropagation()">
            {{ song.artist.name }}
          </a>
        }
      </div>

      @if (song.album) {
        <div class="song-album">
          <a [routerLink]="['/album', song.album._id]" class="album-name" (click)="$event.stopPropagation()">
            {{ song.album.title }}
          </a>
        </div>
      }

      <div class="song-actions">
        <div class="add-to-playlist-wrapper">
          <button
            class="add-btn icon-btn"
            (click)="toggleAddMenu($event)"
            title="Add to playlist"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
          </button>
          @if (showAddMenu) {
            <div class="add-menu" (click)="$event.stopPropagation()">
              @if (isLoadingPlaylists) {
                <div class="add-menu-empty">Loading playlists…</div>
              } @else if (myPlaylists.length === 0) {
                <div class="add-menu-empty">No playlists yet - create one in your Library.</div>
              } @else {
                @for (pl of myPlaylists; track pl._id) {
                  <button class="add-menu-item" (click)="addToPlaylist(pl)">{{ pl.name }}</button>
                }
              }
            </div>
          }
        </div>
        <button
          class="like-btn icon-btn"
          [class.liked]="isLiked"
          (click)="toggleLike($event)"
          title="Like song"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            @if (isLiked) {
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            } @else {
              <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/>
            }
          </svg>
        </button>
        <span class="duration">{{ songService.formatDuration(song.duration) }}</span>
        @if (showRemove) {
          <button class="remove-btn icon-btn" (click)="onRemove($event)" title="Remove from playlist">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .song-card {
      display: grid;
      grid-template-columns: 40px 40px 1fr 1fr auto;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.1s;
      color: #B3B3B3;

      &:hover { background: rgba(255,255,255,0.1); }
      &.active { .song-title { color: #1DB954 !important; } }

      @media (max-width: 768px) {
        grid-template-columns: 40px 40px 1fr auto;
        .song-album { display: none; }
      }
    }

    .song-index {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;

      .index-num { font-size: 0.875rem; color: #B3B3B3; }

      .playing-indicator {
        display: flex;
        align-items: flex-end;
        gap: 2px;
        height: 14px;

        span {
          width: 3px;
          background: #1DB954;
          border-radius: 1px;
          animation: equalizer 0.8s ease-in-out infinite;

          &:nth-child(1) { height: 8px; animation-delay: 0s; }
          &:nth-child(2) { height: 14px; animation-delay: 0.2s; }
          &:nth-child(3) { height: 5px; animation-delay: 0.4s; }
        }
      }

      @keyframes equalizer {
        0%, 100% { transform: scaleY(1); }
        50% { transform: scaleY(0.5); }
      }

      .icon-btn {
        background: none;
        border: none;
        color: #fff;
        cursor: pointer;
        padding: 0.25rem;
        display: flex;
        border-radius: 50%;
        &:hover { transform: scale(1.1); }
      }
    }

    .song-cover {
      width: 40px;
      height: 40px;
      border-radius: 4px;
      overflow: hidden;
      flex-shrink: 0;
      img { width: 100%; height: 100%; object-fit: cover; }
    }

    .song-meta {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      overflow: hidden;

      .song-title {
        font-size: 0.9rem;
        font-weight: 500;
        color: #fff;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        &.accent { color: #1DB954; }
      }

      .song-artist {
        font-size: 0.75rem;
        color: #B3B3B3;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-decoration: none;
        &:hover { color: #fff; text-decoration: underline; }
      }
    }

    .song-album {
      .album-name {
        font-size: 0.875rem;
        color: #B3B3B3;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: block;
        text-decoration: none;
        &:hover { color: #fff; text-decoration: underline; }
      }
    }

    .song-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      .icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.1s;
      }

      .like-btn {
        color: #B3B3B3;
        &.liked { color: #1DB954; opacity: 1 !important; }
        &:hover { color: #fff; }
      }

      .add-btn { color: #B3B3B3; &:hover { color: #fff; } }

      .remove-btn { color: #B3B3B3; &:hover { color: #E91429; } }

      .duration {
        font-size: 0.875rem;
        color: #B3B3B3;
        min-width: 36px;
        text-align: right;
      }
    }

    .add-to-playlist-wrapper {
      position: relative;
    }

    .add-menu {
      position: absolute;
      right: 0;
      top: calc(100% + 4px);
      background: #282828;
      border-radius: 4px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      min-width: 180px;
      max-height: 240px;
      overflow-y: auto;
      z-index: 50;
      padding: 0.25rem 0;
    }

    .add-menu-item {
      display: block;
      width: 100%;
      text-align: left;
      background: none;
      border: none;
      color: #fff;
      font-size: 0.8125rem;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      &:hover { background: rgba(255,255,255,0.1); }
    }

    .add-menu-empty {
      padding: 0.5rem 0.75rem;
      font-size: 0.75rem;
      color: #B3B3B3;
      max-width: 200px;
      white-space: normal;
    }

    .song-card:hover .song-actions .icon-btn { opacity: 1; }
  `]
})
export class SongCardComponent implements OnInit {
  @Input() song!: Song;
  @Input() songs: Song[] = [];
  @Input() index?: number;
  @Input() showArtist: boolean = true;
  @Input() showRemove = false;
  @Output() removed = new EventEmitter<string>();

  isHovered = false;
  isLiked = false;
  isCurrentSong = false;
  isPlaying = false;

  showAddMenu = false;
  isLoadingPlaylists = false;
  myPlaylists: Playlist[] = [];
  private playlistsLoaded = false;

  private destroyRef = inject(DestroyRef);
  private elementRef = inject(ElementRef);

  constructor(
    public songService: SongService,
    private playerService: PlayerService,
    private authService: AuthService,
    private playlistService: PlaylistService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Use centralized liked state from AuthService (Phase 9 fix)
    this.isLiked = this.authService.isLiked(this.song._id);

    this.authService.likedSongIds$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(ids => {
      this.isLiked = ids.has(this.song._id);
    });

    this.playerService.currentIndex$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.isCurrentSong = this.playerService.currentSong?._id === this.song._id;
    });

    this.playerService.isPlaying$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(playing => {
      this.isPlaying = playing && this.isCurrentSong;
    });
  }

  play(event?: Event): void {
    event?.stopPropagation();
    if (this.songs.length > 0) {
      this.playerService.playSong(this.song, this.songs);
    } else {
      this.playerService.playSong(this.song);
    }
  }

  togglePlay(event: Event): void {
    event.stopPropagation();
    this.playerService.togglePlay();
  }

  toggleLike(event: Event): void {
    event.stopPropagation();
    this.songService.like(this.song._id).subscribe({
      next: res => {
        this.isLiked = res.liked;
        this.song.likes = res.likes;
        // Update centralized liked state
        this.authService.updateLikedSongs(this.song._id, res.liked);
      }
    });
  }

  onRemove(event: Event): void {
    event.stopPropagation();
    this.removed.emit(this.song._id);
  }

  toggleAddMenu(event: Event): void {
    event.stopPropagation();
    this.showAddMenu = !this.showAddMenu;
    if (this.showAddMenu && !this.playlistsLoaded) {
      this.isLoadingPlaylists = true;
      this.playlistService.getMyPlaylists().subscribe({
        next: playlists => {
          this.myPlaylists = playlists;
          this.playlistsLoaded = true;
          this.isLoadingPlaylists = false;
        },
        error: () => { this.isLoadingPlaylists = false; }
      });
    }
  }

  addToPlaylist(playlist: Playlist): void {
    this.playlistService.addSong(playlist._id, this.song._id).subscribe({
      next: () => {
        this.toastService.show(`Added to "${playlist.name}"`, 'info', 3000);
        this.showAddMenu = false;
      },
      error: (err) => {
        // A 409 here means the song is already in that playlist - not really an
        // error from the user's point of view, so give a friendlier message.
        if (err.status === 409) {
          this.toastService.show(`Already in "${playlist.name}"`, 'info', 3000);
        }
        this.showAddMenu = false;
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showAddMenu && !this.elementRef.nativeElement.contains(event.target)) {
      this.showAddMenu = false;
    }
  }
}
