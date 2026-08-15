import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TopbarComponent } from './components/topbar/topbar.component';
import { PlayerComponent } from './components/player/player.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, SidebarComponent, TopbarComponent, PlayerComponent],
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
      background: #121212;
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

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((event: any) => {
      const navEnd = event as NavigationEnd;
      const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
      this.isAuthPage = authRoutes.some(r => navEnd.urlAfterRedirects.startsWith(r));
    });
  }
}
