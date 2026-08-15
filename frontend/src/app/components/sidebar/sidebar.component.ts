import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PlaylistService, Playlist } from '../../services/playlist.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="sidebar">
      <div class="logo">
        <a routerLink="/home">
          <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <span>Spotify</span>
        </a>
      </div>

      <ul class="nav-main">
        <li>
          <a routerLink="/home" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            Home
          </a>
        </li>
        <li>
          <a routerLink="/search" routerLinkActive="active" class="nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Search
          </a>
        </li>
        <li>
          <a routerLink="/library" routerLinkActive="active" class="nav-link">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            Your Library
          </a>
        </li>
        @if (isAdmin) {
          <li>
            <a routerLink="/admin" routerLinkActive="active" class="nav-link">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
              Admin
            </a>
          </li>
        }
      </ul>

      <div class="library-section">
        <div class="library-header">
          <span>Playlists</span>
          <button class="add-btn" routerLink="/library" title="Create playlist">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
        </div>

        <ul class="playlist-list">
          @if (isLoadingPlaylists) {
            @for (i of [1,2,3]; track i) {
              <li class="skeleton"></li>
            }
          } @else {
            @for (playlist of playlists; track playlist._id) {
              <li>
                <a [routerLink]="['/playlist', playlist._id]" routerLinkActive="active" class="playlist-link">
                  {{ playlist.name }}
                </a>
              </li>
            }
          }
        </ul>
      </div>
    </nav>
  `,
  styles: [`
    .sidebar {
      background: #000;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 1.5rem 0 0;
      overflow-y: auto;
    }

    .logo {
      padding: 0 1.5rem 1.5rem;
      a {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        text-decoration: none;
        color: #fff;
        svg { color: #fff; }
        span { font-size: 1.25rem; font-weight: 700; }
      }
    }

    .nav-main {
      list-style: none;
      padding: 0 0.5rem;
      margin-bottom: 1.5rem;

      li { margin-bottom: 0.25rem; }

      .nav-link {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.625rem 1rem;
        border-radius: 4px;
        color: #B3B3B3;
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 600;
        transition: color 0.1s;

        &:hover { color: #fff; }
        &.active { color: #fff; }
      }
    }

    .library-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 0 0.5rem;

      .library-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 1rem 0.75rem;

        span { font-size: 0.875rem; font-weight: 700; color: #B3B3B3; text-transform: uppercase; letter-spacing: 0.1em; }

        .add-btn {
          background: none;
          border: none;
          color: #B3B3B3;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          border-radius: 50%;
          &:hover { color: #fff; background: rgba(255,255,255,0.1); }
        }
      }

      .playlist-list {
        list-style: none;
        overflow-y: auto;
        flex: 1;
        padding-bottom: 1rem;

        li {
          .playlist-link {
            display: block;
            padding: 0.5rem 1rem;
            color: #B3B3B3;
            text-decoration: none;
            font-size: 0.875rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            border-radius: 4px;
            transition: color 0.1s;
            &:hover { color: #fff; }
            &.active { color: #fff; }
          }
        }

        .skeleton {
          height: 20px;
          background: #282828;
          border-radius: 4px;
          margin: 0.5rem 1rem;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      }
    }
  `]
})
export class SidebarComponent implements OnInit {
  playlists: Playlist[] = [];
  isLoadingPlaylists = true;
  isAdmin = false;

  constructor(private playlistService: PlaylistService, private authService: AuthService) {}

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.isAdmin = user?.role === 'admin';

    this.playlistService.getMyPlaylists().subscribe({
      next: playlists => { this.playlists = playlists; this.isLoadingPlaylists = false; },
      error: () => { this.isLoadingPlaylists = false; }
    });
  }
}
