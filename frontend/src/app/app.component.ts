import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TopbarComponent } from './components/topbar/topbar.component';
import { PlayerComponent } from './components/player/player.component';
import { ToastComponent } from './components/shared/toast/toast.component';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, SidebarComponent, TopbarComponent, PlayerComponent, ToastComponent],
  template: `
    <div class="app-container" [class.auth-layout]="isAuthPage">
      @if (!isAuthPage) {
        <div class="mobile-overlay" [class.active]="isSidebarOpen" (click)="toggleSidebar()"></div>
        <app-sidebar class="sidebar" [class.open]="isSidebarOpen"></app-sidebar>
        <div class="main-wrapper">
          <app-topbar class="topbar" (menuToggled)="toggleSidebar()"></app-topbar>
          <main class="main-content">
            <router-outlet></router-outlet>
          </main>
        </div>
        <app-player class="player-bar"></app-player>
      } @else {
        <router-outlet></router-outlet>
      }
    </div>
    <app-toast></app-toast>
  `,
  styles: [`
    .app-container {
      display: grid;
      grid-template-columns: 240px 1fr;
      grid-template-rows: 1fr 90px;
      grid-template-areas:
        "sidebar main"
        "player player";
      height: 100vh;
      background: var(--bg-primary);
      overflow: hidden;

      &.auth-layout {
        display: block;
        height: 100vh;
        overflow-y: auto;
      }

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
        grid-template-areas:
          "main"
          "player";
      }
    }

    .mobile-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 250;
      opacity: 0;
      transition: opacity 0.3s;
      
      &.active {
        display: block;
        opacity: 1;
      }
    }

    .sidebar {
      grid-area: sidebar;
      overflow-y: auto;
      
      @media (max-width: 768px) {
        position: fixed;
        left: -240px;
        top: 0;
        bottom: 90px; /* Leave space for player if player is always visible */
        width: 240px;
        z-index: 300;
        transition: transform 0.3s ease;
        background: var(--bg-primary); /* Ensure it's opaque */
        
        &.open {
          transform: translateX(240px);
        }
      }
    }

    .main-wrapper {
      grid-area: main;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .topbar {
      flex-shrink: 0;
      z-index: 100;
    }

    .main-content {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }

    .player-bar {
      grid-area: player;
      z-index: 200;
      
      @media (max-width: 768px) {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
      }
    }
  `]
})
export class AppComponent implements OnInit {
  isAuthPage = false;
  isSidebarOpen = false;
  private destroyRef = inject(DestroyRef);

  constructor(
    private router: Router,
    private themeService: ThemeService
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe((event: any) => {
      this.isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password'].some(path => event.urlAfterRedirects.includes(path));
      this.isSidebarOpen = false; // Close sidebar on navigation
    });
  }

  ngOnInit() {}

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}
