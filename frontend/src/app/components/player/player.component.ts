import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PlayerService, RepeatMode } from '../../services/player.service';
import { SongService, Song } from '../../services/song.service';
import { AuthService } from '../../services/auth.service';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule, RouterLink, AssetUrlPipe],
  template: `
    <div class="player-bar">
      <!-- Currently Playing -->
      <div class="now-playing">
        @if (currentSong) {
          <div class="song-thumb">
            <img [src]="currentSong.coverUrl | assetUrl" [alt]="currentSong.title" />
          </div>
          <div class="song-info">
            <p class="song-title">{{ currentSong.title }}</p>
            <a [routerLink]="['/artist', currentSong.artist._id]" class="song-artist">
              {{ currentSong.artist.name }}
            </a>
          </div>
          <button
            class="like-btn player-icon-btn"
            [class.liked]="isLiked"
            [disabled]="isLikeLoading"
            (click)="toggleLike()"
            title="Save to your Liked Songs"
          >
            <svg viewBox="0 0 24 24" [attr.fill]="isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        }
      </div>

      <!-- Player Controls -->
      <div class="player-center">
        <div class="controls">
          <button
            class="player-icon-btn"
            [class.active]="isShuffle"
            (click)="toggleShuffle()"
            title="Shuffle"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
            </svg>
          </button>

          <button class="player-icon-btn" (click)="previous()" title="Previous">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
            </svg>
          </button>

          <button class="play-pause-btn" (click)="togglePlay()" [disabled]="isLoading">
            @if (isLoading) {
              <div class="loading-ring"></div>
            } @else if (isPlaying) {
              <svg viewBox="0 0 24 24" fill="var(--bg-primary)" width="22" height="22">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" fill="var(--bg-primary)" width="22" height="22" style="margin-left: 2px;">
                <path d="M8 5v14l11-7z"/>
              </svg>
            }
          </button>

          <button class="player-icon-btn" (click)="next()" title="Next">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/>
            </svg>
          </button>

          <button
            class="player-icon-btn repeat-btn"
            [class.active]="repeatMode !== 'off'"
            (click)="toggleRepeat()"
            [title]="'Repeat: ' + repeatMode"
          >
            @if (repeatMode === 'one') {
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
              </svg>
            }
          </button>
        </div>

        <div class="progress-bar-wrapper">
          <span class="time">{{ formatTime(currentTime) }}</span>
          <div class="progress-track" (click)="onSeek($event)">
            <div class="progress-filled" [style.width.%]="progressPercent">
              <div class="progress-thumb"></div>
            </div>
          </div>
          <span class="time">{{ formatTime(duration) }}</span>
        </div>
      </div>

      <!-- Volume Controls -->
      <div class="volume-section">
        <button class="player-icon-btn" (click)="toggleMute()" title="Volume">
          @if (isMuted || volume === 0) {
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          } @else if (volume < 0.5) {
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
            </svg>
          } @else {
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          }
        </button>
        <div class="volume-track" (click)="onVolumeChange($event)">
          <div class="volume-filled" [style.width.%]="(isMuted ? 0 : volume) * 100">
            <div class="volume-thumb"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .player-bar {
      background: var(--bg-secondary);
      border-top: 1px solid var(--border-color);
      height: 90px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      align-items: center;
      padding: 0 1rem;
      gap: 1rem;
    }

    .now-playing {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;

      .song-thumb {
        width: 56px;
        height: 56px;
        flex-shrink: 0;
        border-radius: 4px;
        overflow: hidden;
        img { width: 100%; height: 100%; object-fit: cover; }
      }

      .song-info {
        min-width: 0;
        flex: 1;

        .song-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-bottom: 0.125rem;
        }

        .song-artist {
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
    }

    .player-icon-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0.375rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: color 0.1s;
      &:hover { color: var(--text-primary); }
      &.active { color: #1DB954; }
      &.liked { color: #1DB954; }
    }

    .player-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .play-pause-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--text-primary);
      border: none;
      color: var(--bg-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.1s, background 0.1s;
      flex-shrink: 0;
      &:hover { transform: scale(1.05); }
      &:disabled { opacity: 0.7; cursor: not-allowed; }
    }

    .loading-ring {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(0,0,0,0.3);
      border-top-color: var(--bg-primary);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .progress-bar-wrapper {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      max-width: 500px;

      .time {
        font-size: 0.6875rem;
        color: var(--text-secondary);
        min-width: 32px;
        text-align: center;
      }
    }

    .progress-track {
      flex: 1;
      height: 4px;
      background: var(--bg-elevated);
      border-radius: 2px;
      cursor: pointer;
      position: relative;

      &:hover {
        .progress-filled { background: #1DB954; }
        .progress-thumb { opacity: 1; }
      }

      .progress-filled {
        height: 100%;
        background: var(--text-secondary);
        border-radius: 2px;
        position: relative;
        transition: background 0.1s;

        .progress-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--text-primary);
          position: absolute;
          right: -6px;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0;
          transition: opacity 0.1s;
        }
      }
    }

    .volume-section {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .volume-track {
      width: 93px;
      height: 4px;
      background: var(--bg-elevated);
      border-radius: 2px;
      cursor: pointer;
      position: relative;

      &:hover {
        .volume-filled { background: #1DB954; }
        .volume-thumb { opacity: 1; }
      }

      .volume-filled {
        height: 100%;
        background: var(--text-secondary);
        border-radius: 2px;
        position: relative;
        transition: background 0.1s;
        max-width: 100%;

        .volume-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--text-primary);
          position: absolute;
          right: -6px;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0;
          transition: opacity 0.1s;
        }
      }
    }
  `]
})
export class PlayerComponent implements OnInit, OnDestroy {
  currentSong: Song | null = null;
  isPlaying = false;
  isLoading = false;
  isShuffle = false;
  repeatMode: RepeatMode = 'off';
  currentTime = 0;
  duration = 0;
  volume = 1;
  isMuted = false;
  progressPercent = 0;
  isLiked = false;
  isLikeLoading = false;

  private subs: Subscription[] = [];

  constructor(
    private playerService: PlayerService,
    public songService: SongService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.playerService.currentIndex$.subscribe(() => {
        this.currentSong = this.playerService.currentSong;
        this.isLiked = this.currentSong ? this.authService.isLiked(this.currentSong._id) : false;
      }),
      this.authService.likedSongIds$.subscribe(ids => {
        this.isLiked = this.currentSong ? ids.has(this.currentSong._id) : false;
      }),
      this.playerService.isPlaying$.subscribe(p => { this.isPlaying = p; }),
      this.playerService.isLoading$.subscribe(l => { this.isLoading = l; }),
      this.playerService.isShuffle$.subscribe(s => { this.isShuffle = s; }),
      this.playerService.repeatMode$.subscribe(r => { this.repeatMode = r; }),
      this.playerService.currentTime$.subscribe(t => {
        this.currentTime = t;
        this.progressPercent = this.duration > 0 ? (t / this.duration) * 100 : 0;
      }),
      this.playerService.duration$.subscribe(d => { this.duration = d; }),
      this.playerService.volume$.subscribe(v => { this.volume = v; }),
      this.playerService.isMuted$.subscribe(m => { this.isMuted = m; })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  togglePlay(): void { this.playerService.togglePlay(); }
  previous(): void { this.playerService.previous(); }
  next(): void { this.playerService.next(); }
  toggleShuffle(): void { this.playerService.toggleShuffle(); }
  toggleRepeat(): void { this.playerService.toggleRepeat(); }
  toggleMute(): void { this.playerService.toggleMute(); }

  toggleLike(): void {
    if (!this.currentSong || this.isLikeLoading) return;
    const song = this.currentSong;
    this.isLikeLoading = true;
    this.songService.like(song._id).subscribe({
      next: res => {
        this.isLiked = res.liked;
        this.authService.updateLikedSongs(song._id, res.liked);
        this.isLikeLoading = false;
      },
      error: () => { this.isLikeLoading = false; }
    });
  }

  onSeek(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    this.playerService.seek(pct * this.duration);
  }

  onVolumeChange(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const vol = Math.max(0, Math.min(1, x / rect.width));
    this.playerService.setVolume(vol);
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
