import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { User } from '../../services/auth.service';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink, AssetUrlPipe],
  template: `
    <header class="topbar">
      <div class="nav-arrows">
        <button class="nav-btn" (click)="goBack()" title="Go back">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <button class="nav-btn" (click)="goForward()" title="Go forward">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
          </svg>
        </button>
      </div>

      <div class="right-section">
        @if (user) {
          <div class="user-menu" (click)="toggleMenu()" [class.open]="menuOpen">
            <div class="avatar" [title]="user.username">
              @if (user.avatar) {
                <img [src]="user.avatar | assetUrl" [alt]="user.username" />
              } @else {
                <span>{{ user.username.charAt(0).toUpperCase() }}</span>
              }
            </div>
            <span class="username">{{ user.username }}</span>
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" [class.rotated]="menuOpen">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </div>

          @if (menuOpen) {
            <div class="dropdown-menu">
              <a routerLink="/library" class="menu-item" (click)="menuOpen = false">Your Library</a>
              @if (user.role === 'admin') {
                <a routerLink="/admin" class="menu-item" (click)="menuOpen = false">Admin Panel</a>
              }
              <div class="divider"></div>
              <button class="menu-item logout" (click)="logout()">Log out</button>
            </div>
          }
        }
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      height: 64px;
      background: rgba(18,18,18,0.95);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(10px);
    }

    .nav-arrows {
      display: flex;
      gap: 0.5rem;

      .nav-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(0,0,0,0.7);
        border: none;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s;
        &:hover { background: rgba(255,255,255,0.2); }
      }
    }

    .right-section {
      position: relative;
      display: flex;
      align-items: center;
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(0,0,0,0.7);
      border-radius: 500px;
      padding: 0.375rem 0.75rem 0.375rem 0.375rem;
      cursor: pointer;
      transition: background 0.2s;
      user-select: none;

      &:hover, &.open { background: rgba(255,255,255,0.1); }

      .avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #1DB954;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        img { width: 100%; height: 100%; object-fit: cover; }
        span { font-size: 0.75rem; font-weight: 700; color: #000; }
      }

      .username {
        font-size: 0.875rem;
        font-weight: 700;
        color: #fff;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      svg {
        color: #fff;
        transition: transform 0.2s;
        &.rotated { transform: rotate(180deg); }
      }
    }

    .dropdown-menu {
      position: absolute;
      top: calc(100% + 0.5rem);
      right: 0;
      background: #282828;
      border-radius: 4px;
      box-shadow: 0 16px 24px rgba(0,0,0,0.5);
      min-width: 180px;
      z-index: 200;
      overflow: hidden;

      .menu-item {
        display: block;
        padding: 0.75rem 1rem;
        color: #fff;
        font-size: 0.875rem;
        text-decoration: none;
        cursor: pointer;
        background: none;
        border: none;
        width: 100%;
        text-align: left;
        transition: background 0.1s;
        &:hover { background: rgba(255,255,255,0.1); }
        &.logout { color: #B3B3B3; &:hover { color: #fff; } }
      }

      .divider { height: 1px; background: rgba(255,255,255,0.1); margin: 0.25rem 0; }
    }
  `]
})
export class TopbarComponent implements OnInit {
  user: User | null = null;
  menuOpen = false;

  private destroyRef = inject(DestroyRef);

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.authService.currentUser$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(user => { this.user = user; });
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  goBack(): void { history.back(); }
  goForward(): void { history.forward(); }

  logout(): void {
    this.menuOpen = false;
    this.authService.logout();
  }
}
