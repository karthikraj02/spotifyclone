import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  avatar: string | null;
  createdAt: string;
  likedSongs?: string[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'spotify_token';
  private readonly USER_KEY = 'spotify_user';

  private currentUserSubject = new BehaviorSubject<User | null>(this.loadUser());
  currentUser$ = this.currentUserSubject.asObservable();

  private likedSongIdsSubject = new BehaviorSubject<Set<string>>(new Set());
  likedSongIds$ = this.likedSongIdsSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // Load liked songs from stored user
    const user = this.loadUser();
    if (user?.likedSongs) {
      this.likedSongIdsSubject.next(new Set(user.likedSongs));
    }
  }

  private loadUser(): User | null {
    try {
      const stored = localStorage.getItem(this.USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLiked(songId: string): boolean {
    return this.likedSongIdsSubject.value.has(songId);
  }

  updateLikedSongs(songId: string, liked: boolean): void {
    const ids = new Set(this.likedSongIdsSubject.value);
    if (liked) {
      ids.add(songId);
    } else {
      ids.delete(songId);
    }
    this.likedSongIdsSubject.next(ids);
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/login`, { email, password }).pipe(
      tap(res => this.storeSession(res))
    );
  }

  register(username: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/register`, { username, email, password }).pipe(
      tap(res => this.storeSession(res))
    );
  }

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.API}/me`).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        if (user.likedSongs) {
          this.likedSongIdsSubject.next(new Set(user.likedSongs));
        }
      })
    );
  }

  forgotPassword(email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.API}/forgot-password`, { email });
  }

  resetPassword(password: string, token: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.API}/reset-password/${token}`, { password });
  }

  /**
   * Clears the local session and sends the user to the login page.
   * @param returnUrl Optional path to return to after logging back in (used by the
   *   401 interceptor when a session expires mid-navigation). Only ever used as a
   *   same-origin, in-app router path - never an external URL - to avoid the guard
   *   accidentally becoming an open redirect.
   */
  logout(returnUrl?: string): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.likedSongIdsSubject.next(new Set());

    if (returnUrl && this.isSafeReturnUrl(returnUrl)) {
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
    } else {
      this.router.navigate(['/login']);
    }
  }

  /**
   * A returnUrl must be an internal path (starts with a single "/", not "//" or
   * a scheme like "https:") or it could be used to redirect a user off-site after
   * they log in - e.g. ?returnUrl=https://evil.example.com or ?returnUrl=//evil.example.com.
   */
  isSafeReturnUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    if (!url.startsWith('/')) return false;
    if (url.startsWith('//')) return false;
    if (url.startsWith('/\\')) return false;
    if (url.toLowerCase().includes(':')) return false; // blocks "/\t/evil.com:..." style tricks and any scheme
    if (url.startsWith('/login')) return false; // never loop back into login itself
    return true;
  }

  private storeSession(res: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, res.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
    this.currentUserSubject.next(res.user);
    if (res.user.likedSongs) {
      this.likedSongIdsSubject.next(new Set(res.user.likedSongs));
    }
  }
}
