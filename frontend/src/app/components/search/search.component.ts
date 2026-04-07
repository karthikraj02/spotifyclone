import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { SongService, Song } from '../../services/song.service';
import { ArtistService, ArtistDetail } from '../../services/artist.service';
import { RouterLink } from '@angular/router';
import { SongCardComponent } from '../shared/song-card/song-card.component';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SongCardComponent],
  template: `
    <div class="search-page">
      <div class="search-header">
        <h1>Search</h1>
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
          </svg>
          <input
            type="text"
            [formControl]="searchControl"
            placeholder="What do you want to listen to?"
            class="search-input"
            autofocus
          />
          @if (searchControl.value) {
            <button class="clear-btn" (click)="clearSearch()">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          }
        </div>
      </div>

      @if (isSearching) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Searching...</p>
        </div>
      } @else if (hasSearched && searchResults.length === 0 && artistResults.length === 0) {
        <div class="no-results">
          <h2>No results for "{{ searchControl.value }}"</h2>
          <p>Please check the spelling or use a different word.</p>
        </div>
      } @else if (searchResults.length > 0 || artistResults.length > 0) {
        <div class="results">
          @if (searchResults.length > 0) {
            <section>
              <h2>Songs</h2>
              <div class="songs-list">
                @for (song of searchResults; track song._id) {
                  <app-song-card [song]="song" [songs]="searchResults" [showArtist]="true" />
                }
              </div>
            </section>
          }

          @if (artistResults.length > 0) {
            <section>
              <h2>Artists</h2>
              <div class="artists-grid">
                @for (artist of artistResults; track artist._id) {
                  <a [routerLink]="['/artist', artist._id]" class="artist-card">
                    <div class="artist-img">
                      <img [src]="artist.image" [alt]="artist.name" />
                    </div>
                    <p class="name">{{ artist.name }}</p>
                    <span class="label">Artist</span>
                  </a>
                }
              </div>
            </section>
          }
        </div>
      } @else {
        <div class="browse-section">
          <h2>Browse all</h2>
          <div class="genre-grid">
            @for (genre of genres; track genre.name) {
              <div class="genre-card" [style.background]="genre.color">
                <span>{{ genre.name }}</span>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .search-page {
      padding: 1.5rem 2rem 2rem;
      min-height: 100%;
    }

    .search-header {
      margin-bottom: 2rem;

      h1 { font-size: 2rem; font-weight: 700; color: #fff; margin-bottom: 1rem; }
    }

    .search-box {
      position: relative;
      max-width: 480px;

      .search-icon {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: #000;
        pointer-events: none;
      }

      .search-input {
        width: 100%;
        padding: 0.875rem 3rem;
        background: #fff;
        border: none;
        border-radius: 500px;
        color: #000;
        font-size: 1rem;
        &::placeholder { color: #727272; }
        &:focus { outline: 2px solid #fff; }
      }

      .clear-btn {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: #727272;
        cursor: pointer;
        padding: 0.25rem;
        display: flex;
        &:hover { color: #000; }
      }
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 4rem 0;
      color: #B3B3B3;

      .spinner {
        width: 40px; height: 40px;
        border: 3px solid rgba(255,255,255,0.1);
        border-top-color: #1DB954;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .no-results {
      padding: 3rem 0;
      h2 { font-size: 1.5rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; }
      p { color: #B3B3B3; }
    }

    .results {
      display: flex;
      flex-direction: column;
      gap: 2rem;

      section h2 {
        font-size: 1.25rem;
        font-weight: 700;
        color: #fff;
        margin-bottom: 1rem;
      }
    }

    .songs-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .artists-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 1rem;
    }

    .artist-card {
      background: #181818;
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
      cursor: pointer;
      transition: background 0.2s;
      text-decoration: none;
      display: block;
      &:hover { background: #282828; }

      .artist-img {
        width: 100%;
        aspect-ratio: 1;
        border-radius: 50%;
        overflow: hidden;
        margin: 0 auto 0.75rem;
        img { width: 100%; height: 100%; object-fit: cover; }
      }

      .name { font-weight: 700; font-size: 0.875rem; color: #fff; margin-bottom: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .label { font-size: 0.75rem; color: #B3B3B3; }
    }

    .browse-section {
      h2 { font-size: 1.5rem; font-weight: 700; color: #fff; margin-bottom: 1.5rem; }
    }

    .genre-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1.5rem;
    }

    .genre-card {
      height: 120px;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      align-items: flex-end;
      cursor: pointer;
      transition: transform 0.1s;
      overflow: hidden;
      position: relative;

      &:hover { transform: scale(1.02); }

      span {
        font-size: 1.25rem;
        font-weight: 700;
        color: #fff;
        text-shadow: 0 1px 4px rgba(0,0,0,0.3);
      }
    }
  `]
})
export class SearchComponent implements OnInit, OnDestroy {
  searchControl = new FormControl('');
  searchResults: Song[] = [];
  artistResults: ArtistDetail[] = [];
  isSearching = false;
  hasSearched = false;

  genres = [
    { name: 'Pop', color: '#E91429' },
    { name: 'Hip-Hop', color: '#477D95' },
    { name: 'Rock', color: '#8C1932' },
    { name: 'Electronic', color: '#1E3264' },
    { name: 'R&B', color: '#503750' },
    { name: 'Jazz', color: '#E8A21B' },
    { name: 'Classical', color: '#27856A' },
    { name: 'Country', color: '#8D67AB' },
    { name: 'Metal', color: '#148A08' },
    { name: 'Indie', color: '#E91429' },
    { name: 'Reggae', color: '#477D95' },
    { name: 'Soul', color: '#C6A644' }
  ];

  private destroy$ = new Subject<void>();

  constructor(private songService: SongService, private artistService: ArtistService) {}

  ngOnInit(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      if (!query || query.trim().length === 0) {
        this.searchResults = [];
        this.artistResults = [];
        this.hasSearched = false;
        return;
      }
      this.performSearch(query.trim());
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private performSearch(q: string): void {
    this.isSearching = true;
    this.hasSearched = true;

    this.songService.search(q).subscribe({
      next: songs => {
        this.searchResults = songs;
        this.isSearching = false;
      },
      error: () => { this.isSearching = false; }
    });

    this.artistService.getAll().subscribe({
      next: artists => {
        this.artistResults = artists.filter(a => a.name.toLowerCase().includes(q.toLowerCase()));
      },
      error: () => {}
    });
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.searchResults = [];
    this.artistResults = [];
    this.hasSearched = false;
  }
}
