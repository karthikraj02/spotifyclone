import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Song, Artist } from './song.service';
import { environment } from '../../environments/environment';

export interface AlbumDetail {
  _id: string;
  title: string;
  artist: Artist;
  songs: Song[];
  coverUrl: string;
  releaseDate: string;
  genre: string;
  createdAt: string;
}

export interface AlbumListItem {
  _id: string;
  title: string;
  artist: { _id: string; name: string; image: string };
  coverUrl: string;
  releaseDate: string;
  genre: string;
}

@Injectable({ providedIn: 'root' })
export class AlbumService {
  private readonly API = `${environment.apiUrl}/albums`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<AlbumListItem[]> {
    return this.http.get<AlbumListItem[]>(this.API);
  }

  getById(id: string): Observable<AlbumDetail> {
    return this.http.get<AlbumDetail>(`${this.API}/${id}`);
  }

  create(data: { title: string; artistId: string; coverUrl?: string; releaseDate?: string; genre?: string }): Observable<AlbumListItem> {
    return this.http.post<AlbumListItem>(this.API, data);
  }

  update(id: string, data: { title?: string; coverUrl?: string; releaseDate?: string; genre?: string }): Observable<AlbumListItem> {
    return this.http.put<AlbumListItem>(`${this.API}/${id}`, data);
  }

  delete(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API}/${id}`);
  }
}
