import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Song, SongService } from './song.service';
import { ToastService } from './toast.service';
import { environment } from '../../environments/environment';

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

  // Play count tracking
  private playRecorded = false;
  private playTimerId: ReturnType<typeof setTimeout> | null = null;

  // Real playback history: indices into `queue`, in the order songs were actually
  // played. Previous() pops from this so it always returns to what actually played
  // before - including under shuffle, where "index - 1" would be meaningless.
  private history: number[] = [];

  // A shuffled permutation of not-yet-played queue indices for the current "lap".
  // next() pops from this instead of calling Math.random() fresh each time, which
  // guarantees the current song is excluded and nothing repeats until every other
  // song in the queue has come up once. Refilled (reshuffled) once exhausted.
  private shuffleBag: number[] = [];

  get currentSong(): Song | null {
    const idx = this.currentIndexSubject.value;
    const queue = this.queueSubject.value;
    return idx >= 0 && idx < queue.length ? queue[idx] : null;
  }

  constructor(private songService: SongService, private toastService: ToastService) {}

  playSong(song: Song, queue?: Song[]): void {
    const newQueue = queue || [song];
    const idx = newQueue.findIndex(s => s._id === song._id);
    this.queueSubject.next(newQueue);
    this.currentIndexSubject.next(idx >= 0 ? idx : 0);
    this.resetPlaybackOrder();
    this.loadAndPlay(song);
  }

  playQueue(songs: Song[], startIndex = 0): void {
    if (!songs.length) return;
    this.queueSubject.next(songs);
    this.currentIndexSubject.next(startIndex);
    this.resetPlaybackOrder();
    this.loadAndPlay(songs[startIndex]);
  }

  togglePlay(): void {
    if (!this.audio) return;
    if (this.isPlayingSubject.value) {
      this.audio.pause();
    } else {
      this.audio.play().catch(() => {
        this.toastService.show('Playback was blocked by the browser. Press play again to resume.', 'info');
      });
    }
  }

  pause(): void {
    this.audio?.pause();
  }

  next(): void {
    const queue = this.queueSubject.value;
    if (!queue.length) return;

    const currentIdx = this.currentIndexSubject.value;
    const repeat = this.repeatModeSubject.value;
    let nextIdx: number | null = null;

    if (this.isShuffleSubject.value) {
      if (queue.length === 1) {
        nextIdx = repeat === 'off' ? null : 0;
      } else {
        if (this.shuffleBag.length === 0) {
          this.refillShuffleBag(currentIdx);
        }
        nextIdx = this.shuffleBag.length > 0 ? this.shuffleBag.pop()! : null;
      }
    } else if (currentIdx < queue.length - 1) {
      nextIdx = currentIdx + 1;
    } else if (repeat === 'all') {
      nextIdx = 0;
    }

    if (nextIdx === null) return;

    if (currentIdx >= 0) this.history.push(currentIdx);
    this.currentIndexSubject.next(nextIdx);
    this.loadAndPlay(queue[nextIdx]);
  }

  previous(): void {
    const queue = this.queueSubject.value;
    if (!queue.length) return;

    // Standard player behavior: if we're more than a few seconds into the song,
    // "previous" restarts it instead of actually going back a track.
    if (this.audio && this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }

    if (this.history.length > 0) {
      const prevIdx = this.history.pop()!;
      this.currentIndexSubject.next(prevIdx);
      this.loadAndPlay(queue[prevIdx]);
      return;
    }

    // No recorded history yet (e.g. very first track of the session) - fall back
    // to simple wraparound rather than doing nothing.
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
    // Raising the volume above 0 should always produce sound, even if the user
    // was previously muted - otherwise the UI shows "unmuted" while audio.muted
    // is still true and nothing plays until they explicitly hit mute again.
    if (clamped > 0 && this.isMutedSubject.value) {
      this.isMutedSubject.next(false);
      if (this.audio) {
        this.audio.muted = false;
      }
    }
  }

  toggleMute(): void {
    const muted = !this.isMutedSubject.value;
    this.isMutedSubject.next(muted);
    if (this.audio) {
      // The native `muted` property silences output without touching `.volume`,
      // so unmuting automatically restores whatever volume level was set before.
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
    // Force a fresh shuffle draw next time next() runs, rather than continuing
    // to draw from a bag that was built under the opposite shuffle state.
    this.shuffleBag = [];
  }

  addToQueue(song: Song): void {
    const queue = [...this.queueSubject.value, song];
    this.queueSubject.next(queue);
    // Clear the bag so the newly added song is guaranteed to be included in the
    // very next shuffle draw instead of waiting for a full lap to complete.
    this.shuffleBag = [];
  }

  private resetPlaybackOrder(): void {
    this.history = [];
    this.shuffleBag = [];
  }

  private refillShuffleBag(excludeIdx: number): void {
    const queue = this.queueSubject.value;
    const indices = queue.map((_, i) => i).filter(i => i !== excludeIdx);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    this.shuffleBag = indices;
  }

  private clearPlayTimer(): void {
    if (this.playTimerId !== null) {
      clearTimeout(this.playTimerId);
      this.playTimerId = null;
    }
  }

  private loadAndPlay(song: Song): void {
    // Clean up previous audio
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
    }

    // Reset play count tracking
    this.clearPlayTimer();
    this.playRecorded = false;

    this.isLoadingSubject.next(true);
    this.currentTimeSubject.next(0);
    this.durationSubject.next(0);

    // Build audio URL using environment config instead of hardcoded localhost
    const audioUrl = song.audioUrl.startsWith('http')
      ? song.audioUrl
      : `${environment.serverUrl}${song.audioUrl}`;

    const audioEl = new Audio(audioUrl);
    this.audio = audioEl;
    audioEl.volume = this.isMutedSubject.value ? 0 : this.volumeSubject.value;
    audioEl.muted = this.isMutedSubject.value;

    // Every listener below captures `audioEl` locally and checks it's still the
    // "live" element before touching shared state. Without this guard, a trailing
    // event from an element that loadAndPlay() has already replaced (e.g. a slow
    // 'error' firing after the user skipped to the next track) could stomp on the
    // state of whatever is now actually playing.
    const isLive = () => this.audio === audioEl;

    audioEl.addEventListener('loadedmetadata', () => {
      if (!isLive()) return;
      this.durationSubject.next(audioEl.duration);
      this.isLoadingSubject.next(false);
    });

    audioEl.addEventListener('timeupdate', () => {
      if (!isLive()) return;
      this.currentTimeSubject.next(audioEl.currentTime);
    });

    audioEl.addEventListener('play', () => {
      if (!isLive()) return;
      this.isPlayingSubject.next(true);

      // Start play count timer: record play after 5 seconds of actual playback
      if (!this.playRecorded) {
        this.clearPlayTimer();
        this.playTimerId = setTimeout(() => {
          if (!this.playRecorded && isLive() && !audioEl.paused) {
            this.playRecorded = true;
            this.songService.recordPlay(song._id).subscribe({ error: () => {} });
          }
        }, 5000);
      }
    });

    audioEl.addEventListener('pause', () => {
      if (!isLive()) return;
      this.isPlayingSubject.next(false);
      // Cancel play timer if paused before threshold
      if (!this.playRecorded) {
        this.clearPlayTimer();
      }
    });

    audioEl.addEventListener('ended', () => {
      if (!isLive()) return;
      this.isPlayingSubject.next(false);
      if (this.repeatModeSubject.value === 'one') {
        audioEl.currentTime = 0;
        audioEl.play().catch(() => {/* autoplay blocked */});
      } else {
        this.next();
      }
    });

    audioEl.addEventListener('error', () => {
      if (!isLive()) return;
      this.isLoadingSubject.next(false);
      this.isPlayingSubject.next(false);
      this.clearPlayTimer();
      this.toastService.show(`Couldn't play "${song.title}". The audio file may be missing or unsupported.`, 'error');
    });

    audioEl.play().catch(() => {
      if (!isLive()) return;
      this.isLoadingSubject.next(false);
    });
  }
}
