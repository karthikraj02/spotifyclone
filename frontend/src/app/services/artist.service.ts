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

  getAll(): Observable<ArtistDetail[]> {
    return this.http.get<ArtistDetail[]>(this.API);
  }

  getById(id: string): Observable<ArtistDetail> {
    return this.http.get<ArtistDetail>(`${this.API}/${id}`);
  }

  search(query: string): Observable<ArtistDetail[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<ArtistDetail[]>(`${this.API}/search`, { params });
  }

  create(data: { name: string; bio?: string; image?: string }): Observable<ArtistDetail> {
    return this.http.post<ArtistDetail>(this.API, data);
  }
}
