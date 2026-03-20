import { AudioManager } from './AudioManager.ts';

interface TrackState {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

/**
 * Background music manager with crossfading support.
 * Uses two gain nodes for smooth transitions between tracks.
 */
export class MusicSystem {
  readonly #audio: AudioManager;
  #current: TrackState | null = null;
  #paused = false;
  #pauseTime = 0;
  #currentUrl = '';

  constructor(audio: AudioManager = AudioManager.getInstance()) {
    this.#audio = audio;
  }

  async playTrack(url: string, loop = true): Promise<void> {
    this.#stop(0);
    const ctx = this.#audio.getContext();
    const buffer = await this.#loadBuffer(url);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gain = ctx.createGain();
    gain.gain.value = 1.0;
    source.connect(gain);
    gain.connect(this.#audio.getMasterGain());

    source.start(0);
    this.#current = { source, gain };
    this.#currentUrl = url;
    this.#paused = false;
  }

  async crossfadeTo(url: string, fadeDuration = 1.0): Promise<void> {
    const ctx = this.#audio.getContext();
    const now = ctx.currentTime;

    // Fade out current
    if (this.#current) {
      this.#current.gain.gain.setValueAtTime(this.#current.gain.gain.value, now);
      this.#current.gain.gain.linearRampToValueAtTime(0, now + fadeDuration);
      const old = this.#current;
      setTimeout(() => {
        try { old.source.stop(); } catch { /* already stopped */ }
      }, fadeDuration * 1000 + 100);
    }

    // Fade in new
    const buffer = await this.#loadBuffer(url);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1.0, now + fadeDuration);
    source.connect(gain);
    gain.connect(this.#audio.getMasterGain());

    source.start(0);
    this.#current = { source, gain };
    this.#currentUrl = url;
    this.#paused = false;
  }

  stop(fadeDuration = 0.5): void {
    this.#stop(fadeDuration);
    this.#currentUrl = '';
  }

  #stop(fadeDuration: number): void {
    if (!this.#current) return;
    const old = this.#current;
    this.#current = null;

    if (fadeDuration > 0) {
      const ctx = this.#audio.getContext();
      const now = ctx.currentTime;
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.linearRampToValueAtTime(0, now + fadeDuration);
      setTimeout(() => {
        try { old.source.stop(); } catch { /* already stopped */ }
      }, fadeDuration * 1000 + 100);
    } else {
      try { old.source.stop(); } catch { /* already stopped */ }
    }
  }

  pause(): void {
    if (!this.#current || this.#paused) return;
    const ctx = this.#audio.getContext();
    this.#pauseTime = ctx.currentTime;
    ctx.suspend();
    this.#paused = true;
  }

  resume(): void {
    if (!this.#paused) return;
    const ctx = this.#audio.getContext();
    ctx.resume();
    this.#paused = false;
  }

  isPlaying(): boolean {
    return this.#current !== null && !this.#paused;
  }

  getCurrentTrack(): string {
    return this.#currentUrl;
  }

  async #loadBuffer(url: string): Promise<AudioBuffer> {
    const ctx = this.#audio.getContext();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return ctx.decodeAudioData(arrayBuffer);
  }
}
