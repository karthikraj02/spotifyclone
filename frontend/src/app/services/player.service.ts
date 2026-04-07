import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Song, SongService } from './song.service';

export type RepeatMode = 'off' | 'all' | 'one';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private audio: HTMLAudioElement | null = null;

  private queueSubject = new BehaviorSubject<Song[]>([]);
  private currentIndexSubject = new BehaviorSubject<number>(-1);
  private isPlayingSubject = new BehaviorSubject<boolean>(false);
  private currentTimeSubject = new BehaviorSubject<number>(0);
  private durationSubject = new BehaviorSubject<number>(0);
  private volumeSubject = new BehaviorSubject<number>(1);
  private isMutedSubject = new BehaviorSubject<boolean>(false);
  private repeatModeSubject = new BehaviorSubject<RepeatMode>('off');
  private isShuffleSubject = new BehaviorSubject<boolean>(false);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  queue$ = this.queueSubject.asObservable();
  currentIndex$ = this.currentIndexSubject.asObservable();
  isPlaying$ = this.isPlayingSubject.asObservable();
  currentTime$ = this.currentTimeSubject.asObservable();
  duration$ = this.durationSubject.asObservable();
  volume$ = this.volumeSubject.asObservable();
  isMuted$ = this.isMutedSubject.asObservable();
  repeatMode$ = this.repeatModeSubject.asObservable();
  isShuffle$ = this.isShuffleSubject.asObservable();
  isLoading$ = this.isLoadingSubject.asObservable();

  get currentSong(): Song | null {
    const idx = this.currentIndexSubject.value;
    const queue = this.queueSubject.value;
    return idx >= 0 && idx < queue.length ? queue[idx] : null;
  }

  constructor(private songService: SongService) {}

  playSong(song: Song, queue?: Song[]): void {
    const newQueue = queue || [song];
    const idx = newQueue.findIndex(s => s._id === song._id);
    this.queueSubject.next(newQueue);
    this.currentIndexSubject.next(idx >= 0 ? idx : 0);
    this.loadAndPlay(song);
  }

  playQueue(songs: Song[], startIndex = 0): void {
    if (!songs.length) return;
    this.queueSubject.next(songs);
    this.currentIndexSubject.next(startIndex);
    this.loadAndPlay(songs[startIndex]);
  }

  togglePlay(): void {
    if (!this.audio) return;
    if (this.isPlayingSubject.value) {
      this.audio.pause();
    } else {
      this.audio.play().catch(console.error);
    }
  }

  pause(): void {
    this.audio?.pause();
  }

  next(): void {
    const queue = this.queueSubject.value;
    if (!queue.length) return;

    let nextIdx: number;
    const currentIdx = this.currentIndexSubject.value;
    const repeat = this.repeatModeSubject.value;

    if (this.isShuffleSubject.value) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else if (currentIdx < queue.length - 1) {
      nextIdx = currentIdx + 1;
    } else if (repeat === 'all') {
      nextIdx = 0;
    } else {
      return;
    }

    this.currentIndexSubject.next(nextIdx);
    this.loadAndPlay(queue[nextIdx]);
  }

  previous(): void {
    const queue = this.queueSubject.value;
    if (!queue.length) return;

    if (this.audio && this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }

    const currentIdx = this.currentIndexSubject.value;
    const prevIdx = currentIdx > 0 ? currentIdx - 1 : queue.length - 1;
    this.currentIndexSubject.next(prevIdx);
    this.loadAndPlay(queue[prevIdx]);
  }

  seek(time: number): void {
    if (this.audio) {
      this.audio.currentTime = time;
    }
  }

  setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volumeSubject.next(clamped);
    if (this.audio) {
      this.audio.volume = clamped;
    }
    if (clamped > 0) {
      this.isMutedSubject.next(false);
    }
  }

  toggleMute(): void {
    const muted = !this.isMutedSubject.value;
    this.isMutedSubject.next(muted);
    if (this.audio) {
      this.audio.muted = muted;
    }
  }

  toggleRepeat(): void {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const current = this.repeatModeSubject.value;
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    this.repeatModeSubject.next(next);
  }

  toggleShuffle(): void {
    this.isShuffleSubject.next(!this.isShuffleSubject.value);
  }

  addToQueue(song: Song): void {
    const queue = [...this.queueSubject.value, song];
    this.queueSubject.next(queue);
  }

  private loadAndPlay(song: Song): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
    }

    this.isLoadingSubject.next(true);
    this.currentTimeSubject.next(0);
    this.durationSubject.next(0);

    const audioUrl = song.audioUrl.startsWith('http')
      ? song.audioUrl
      : `http://localhost:5000${song.audioUrl}`;

    this.audio = new Audio(audioUrl);
    this.audio.volume = this.isMutedSubject.value ? 0 : this.volumeSubject.value;
    this.audio.muted = this.isMutedSubject.value;

    this.audio.addEventListener('loadedmetadata', () => {
      this.durationSubject.next(this.audio!.duration);
      this.isLoadingSubject.next(false);
    });

    this.audio.addEventListener('timeupdate', () => {
      this.currentTimeSubject.next(this.audio!.currentTime);
    });

    this.audio.addEventListener('play', () => {
      this.isPlayingSubject.next(true);
    });

    this.audio.addEventListener('pause', () => {
      this.isPlayingSubject.next(false);
    });

    this.audio.addEventListener('ended', () => {
      this.isPlayingSubject.next(false);
      if (this.repeatModeSubject.value === 'one') {
        this.audio!.currentTime = 0;
        this.audio!.play().catch(console.error);
      } else {
        this.next();
      }
    });

    this.audio.addEventListener('error', () => {
      this.isLoadingSubject.next(false);
      this.isPlayingSubject.next(false);
    });

    this.audio.play().catch(() => {
      this.isLoadingSubject.next(false);
    });

    this.songService.recordPlay(song._id).subscribe({ error: () => {} });
  }
}
