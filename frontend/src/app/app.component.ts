import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TopbarComponent } from './components/topbar/topbar.component';
import { PlayerComponent } from './components/player/player.component';
import { AuthService } from './services/auth.service';

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

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const authRoutes = ['/login', '/register'];
      this.isAuthPage = authRoutes.some(r => event.urlAfterRedirects.startsWith(r));
    });
  }
}
