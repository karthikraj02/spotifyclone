import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Artist {
  _id: string;
  name: string;
  image: string;
  bio?: string;
  followers?: number;
}

export interface Album {
  _id: string;
  title: string;
  coverUrl: string;
  releaseDate?: string;
}

export interface Song {
  _id: string;
  title: string;
  artist: Artist;
  album: Album | null;
  duration: number;
  audioUrl: string;
  coverUrl: string;
  genre: string;
  plays: number;
  likes: number;
  createdAt: string;
}

export interface SongPageResult {
  songs: Song[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class SongService {
  private readonly API = `${environment.apiUrl}/songs`;

  constructor(private http: HttpClient) {}

  getSongs(page = 1, limit = 20): Observable<SongPageResult> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<SongPageResult>(this.API, { params });
  }

  getTrending(): Observable<Song[]> {
    return this.http.get<Song[]>(`${this.API}/trending`);
  }

  search(q: string): Observable<Song[]> {
    const params = new HttpParams().set('q', q);
    return this.http.get<Song[]>(`${this.API}/search`, { params });
  }

  getById(id: string): Observable<Song> {
    return this.http.get<Song>(`${this.API}/${id}`);
  }

  like(id: string): Observable<{ liked: boolean; likes: number }> {
    return this.http.post<{ liked: boolean; likes: number }>(`${this.API}/${id}/like`, {});
  }

  recordPlay(id: string): Observable<{ plays: number }> {
    return this.http.post<{ plays: number }>(`${this.API}/${id}/play`, {});
  }

  createSong(data: FormData): Observable<Song> {
    return this.http.post<Song>(this.API, data);
  }

  updateSong(id: string, data: FormData): Observable<Song> {
    return this.http.put<Song>(`${this.API}/${id}`, data);
  }

  deleteSong(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API}/${id}`);
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
