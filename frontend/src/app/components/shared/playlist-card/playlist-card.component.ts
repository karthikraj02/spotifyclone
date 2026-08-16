import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Playlist } from '../../../services/playlist.service';
import { PlayerService } from '../../../services/player.service';
import { AssetUrlPipe } from '../../../pipes/asset-url.pipe';

@Component({
  selector: 'app-playlist-card',
  standalone: true,
  imports: [CommonModule, RouterLink, AssetUrlPipe],
  template: `
    <div class="playlist-card" (mouseenter)="isHovered = true" (mouseleave)="isHovered = false">
      <a [routerLink]="['/playlist', playlist._id]" class="card-link">
        <div class="cover-wrapper">
          <img [src]="playlist.coverUrl | assetUrl" [alt]="playlist.name" />
          @if (isHovered && playlist.songs.length > 0) {
            <button class="play-fab" (click)="playPlaylist($event)">
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          }
        </div>
        <p class="name">{{ playlist.name }}</p>
        <span class="meta">{{ playlist.songs.length }} songs</span>
      </a>
    </div>
  `,
  styles: [`
    .playlist-card {
      position: relative;

      .card-link {
        display: block;
        background: #181818;
        border-radius: 8px;
        padding: 1rem;
        cursor: pointer;
        transition: background 0.2s;
        text-decoration: none;
        color: inherit;
        &:hover { background: #282828; }
      }

      .cover-wrapper {
        position: relative;
        width: 100%;
        aspect-ratio: 1;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 0.75rem;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);

        img { width: 100%; height: 100%; object-fit: cover; }

        .play-fab {
          position: absolute;
          bottom: 0.5rem;
          right: 0.5rem;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #1DB954;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          animation: fadeIn 0.1s ease;
          color: #000;
          transition: transform 0.1s;
          &:hover { transform: scale(1.05); background: #1ed760; }
        }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; } }
      }

      .name {
        font-weight: 700;
        font-size: 0.875rem;
        color: #fff;
        margin-bottom: 0.25rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .meta {
        font-size: 0.75rem;
        color: #B3B3B3;
      }
    }
  `]
})
export class PlaylistCardComponent {
  @Input() playlist!: Playlist;
  isHovered = false;

  constructor(private playerService: PlayerService) {}

  playPlaylist(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.playlist.songs.length) {
      this.playerService.playQueue(this.playlist.songs);
    }
  }
}
