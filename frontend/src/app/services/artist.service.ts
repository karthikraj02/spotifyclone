import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Song } from './song.service';
import { environment } from '../../environments/environment';

export interface ArtistDetail {
  _id: string;
  name: string;
  bio: string;
  image: string;
  songs: Song[];
  albums: AlbumSummary[];
  followers: number;
}

// Shape returned by GET /api/artists (list view) - counts instead of full arrays
export interface ArtistListItem {
  _id: string;
  name: string;
  bio: string;
  image: string;
  followers: number;
  songsCount: number;
  albumsCount: number;
}

export interface AlbumSummary {
  _id: string;
  title: string;
  coverUrl: string;
  releaseDate: string;
  genre: string;
}

@Injectable({ providedIn: 'root' })
export class ArtistService {
  private readonly API = `${environment.apiUrl}/artists`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ArtistListItem[]> {
    return this.http.get<ArtistListItem[]>(this.API);
  }

  getById(id: string): Observable<ArtistDetail> {
    return this.http.get<ArtistDetail>(`${this.API}/${id}`);
  }

  search(query: string): Observable<ArtistListItem[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<ArtistListItem[]>(`${this.API}/search`, { params });
  }

  create(data: { name: string; bio?: string; image?: string }): Observable<ArtistListItem> {
    return this.http.post<ArtistListItem>(this.API, data);
  }

  update(id: string, data: { name?: string; bio?: string; image?: string }): Observable<ArtistListItem> {
    return this.http.put<ArtistListItem>(`${this.API}/${id}`, data);
  }

  delete(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API}/${id}`);
  }

  getFollowStatus(id: string): Observable<{ following: boolean }> {
    return this.http.get<{ following: boolean }>(`${this.API}/${id}/follow-status`);
  }

  toggleFollow(id: string): Observable<{ following: boolean; followers: number }> {
    return this.http.post<{ following: boolean; followers: number }>(`${this.API}/${id}/follow`, {});
  }
}
