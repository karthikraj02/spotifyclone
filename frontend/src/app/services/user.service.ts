import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from './auth.service';
import { Song } from './song.service';
import { environment } from '../../environments/environment';

export interface RecentlyPlayed {
  song: Song;
  playedAt: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly API = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.API}/me`);
  }

  updateProfile(data: { username?: string; avatar?: string }): Observable<User> {
    return this.http.put<User>(`${this.API}/me`, data);
  }

  getRecentlyPlayed(): Observable<RecentlyPlayed[]> {
    return this.http.get<RecentlyPlayed[]>(`${this.API}/me/recently-played`);
  }

  getLikedSongs(): Observable<Song[]> {
    return this.http.get<Song[]>(`${this.API}/me/liked-songs`);
  }

  getAllUsers(page = 1, limit = 20): Observable<{ users: User[]; pagination: any }> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<{ users: User[]; pagination: any }>(this.API, { params });
  }

  deleteUser(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API}/${id}`);
  }
}
