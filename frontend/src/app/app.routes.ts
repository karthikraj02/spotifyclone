import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./components/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password/:token',
    loadComponent: () => import('./components/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'home',
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent),
    canActivate: [authGuard]
  },
  {
    path: 'search',
    loadComponent: () => import('./components/search/search.component').then(m => m.SearchComponent),
    canActivate: [authGuard]
  },
  {
    path: 'library',
    loadComponent: () => import('./components/library/library.component').then(m => m.LibraryComponent),
    canActivate: [authGuard]
  },
  {
    path: 'playlist/:id',
    loadComponent: () => import('./components/playlist/playlist.component').then(m => m.PlaylistComponent),
    canActivate: [authGuard]
  },
  {
    path: 'artist/:id',
    loadComponent: () => import('./components/artist/artist.component').then(m => m.ArtistComponent),
    canActivate: [authGuard]
  },
  {
    path: 'album/:id',
    loadComponent: () => import('./components/album/album.component').then(m => m.AlbumComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    loadComponent: () => import('./components/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [adminGuard]
  },
  { path: '**', redirectTo: '/home' }
];
