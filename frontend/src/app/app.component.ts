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
        <app-sidebar class="sidebar"></app-sidebar>
        <div class="main-wrapper">
          <app-topbar class="topbar"></app-topbar>
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
    }

    .sidebar {
      grid-area: sidebar;
      overflow-y: auto;
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
    }
  `]
})
export class AppComponent implements OnInit {
  isAuthPage = false;
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
    });
  }

  ngOnInit() {}
}
