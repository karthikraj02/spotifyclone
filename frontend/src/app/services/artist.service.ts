import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Song } from './song.service';

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
  private readonly API = 'http://localhost:5000/api/artists';

  constructor(private http: HttpClient) {}

  getAll(): Observable<ArtistDetail[]> {
    return this.http.get<ArtistDetail[]>(this.API);
  }

  getById(id: string): Observable<ArtistDetail> {
    return this.http.get<ArtistDetail>(`${this.API}/${id}`);
  }

  create(data: { name: string; bio?: string; image?: string }): Observable<ArtistDetail> {
    return this.http.post<ArtistDetail>(this.API, data);
  }
}
