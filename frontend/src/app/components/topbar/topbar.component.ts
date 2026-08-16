import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { User } from '../../services/auth.service';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';
import { ThemeService, Theme } from '../../services/theme.service';

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
        <button class="theme-toggle" (click)="toggleTheme()" [title]="'Switch to ' + (currentTheme === 'dark' ? 'light' : 'dark') + ' mode'">
          @if (currentTheme === 'dark') {
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
            </svg>
          } @else {
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 0 0 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
            </svg>
          }
        </button>

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
      background: var(--bg-secondary);
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
        background: var(--bg-tertiary);
        border: none;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s;
        &:hover { background: var(--bg-elevated); }
      }
    }

    .right-section {
      position: relative;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .theme-toggle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--bg-tertiary);
      border: none;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s, transform 0.2s;
      &:hover { background: var(--bg-elevated); transform: scale(1.05); }
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--bg-tertiary);
      border-radius: 500px;
      padding: 0.375rem 0.75rem 0.375rem 0.375rem;
      cursor: pointer;
      transition: background 0.2s;
      user-select: none;

      &:hover, &.open { background: var(--bg-elevated); }

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
        color: var(--text-primary);
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      svg {
        color: var(--text-primary);
        transition: transform 0.2s;
        &.rotated { transform: rotate(180deg); }
      }
    }

    .dropdown-menu {
      position: absolute;
      top: calc(100% + 0.5rem);
      right: 0;
      background: var(--bg-tertiary);
      border-radius: 4px;
      box-shadow: 0 16px 24px rgba(0,0,0,0.5);
      min-width: 180px;
      z-index: 200;
      overflow: hidden;

      .menu-item {
        display: block;
        padding: 0.75rem 1rem;
        color: var(--text-primary);
        font-size: 0.875rem;
        text-decoration: none;
        cursor: pointer;
        background: none;
        border: none;
        width: 100%;
        text-align: left;
        transition: background 0.1s;
        &:hover { background: var(--border-color); }
        &.logout { color: var(--text-secondary); &:hover { color: var(--text-primary); } }
      }

      .divider { height: 1px; background: var(--border-color); margin: 0.25rem 0; }
    }
  `]
})
export class TopbarComponent implements OnInit {
  user: User | null = null;
  menuOpen = false;
  currentTheme: Theme = 'dark';

  private destroyRef = inject(DestroyRef);

  constructor(
    private authService: AuthService, 
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(user => { this.user = user; });

    this.themeService.theme$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(theme => { this.currentTheme = theme; });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
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
