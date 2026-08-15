import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Song } from './song.service';
import { environment } from '../../environments/environment';

export interface Playlist {
  _id: string;
  name: string;
  description: string;
  owner: { _id: string; username: string; avatar: string | null };
  songs: Song[];
  coverUrl: string;
  isPublic: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class PlaylistService {
  private readonly API = `${environment.apiUrl}/playlists`;

  constructor(private http: HttpClient) {}

  getMyPlaylists(): Observable<Playlist[]> {
    return this.http.get<Playlist[]>(this.API);
  }

  getById(id: string): Observable<Playlist> {
    return this.http.get<Playlist>(`${this.API}/${id}`);
  }

  create(data: { name: string; description?: string; isPublic?: boolean }): Observable<Playlist> {
    return this.http.post<Playlist>(this.API, data);
  }

  update(id: string, data: Partial<Playlist>): Observable<Playlist> {
    return this.http.put<Playlist>(`${this.API}/${id}`, data);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API}/${id}`);
  }

  addSong(playlistId: string, songId: string): Observable<Playlist> {
    return this.http.post<Playlist>(`${this.API}/${playlistId}/songs`, { songId });
  }

  removeSong(playlistId: string, songId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API}/${playlistId}/songs/${songId}`);
  }
}
