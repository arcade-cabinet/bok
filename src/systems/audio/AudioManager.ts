/**
 * Singleton audio manager wrapping Web Audio API AudioContext.
 * Must call init() on a user gesture (click/tap) to create the context.
 */
export class AudioManager {
  static #instance: AudioManager | null = null;

  #ctx: AudioContext | null = null;
  #masterGain: GainNode | null = null;
  #muted = false;
  #savedVolume = 1.0;

  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager.#instance) {
      AudioManager.#instance = new AudioManager();
    }
    return AudioManager.#instance;
  }

  /** Create AudioContext — must be called from a user gesture handler. */
  init(): void {
    if (this.#ctx) return;
    this.#ctx = new AudioContext();
    this.#masterGain = this.#ctx.createGain();
    this.#masterGain.connect(this.#ctx.destination);
  }

  getContext(): AudioContext {
    if (!this.#ctx) throw new Error('AudioManager not initialized — call init() on user gesture');
    return this.#ctx;
  }

  getMasterGain(): GainNode {
    if (!this.#masterGain) throw new Error('AudioManager not initialized');
    return this.#masterGain;
  }

  setMasterVolume(volume: number): void {
    this.#savedVolume = Math.max(0, Math.min(1, volume));
    if (!this.#muted && this.#masterGain) {
      this.#masterGain.gain.value = this.#savedVolume;
    }
  }

  getMasterVolume(): number {
    return this.#savedVolume;
  }

  mute(): void {
    this.#muted = true;
    if (this.#masterGain) {
      this.#masterGain.gain.value = 0;
    }
  }

  unmute(): void {
    this.#muted = false;
    if (this.#masterGain) {
      this.#masterGain.gain.value = this.#savedVolume;
    }
  }

  isMuted(): boolean {
    return this.#muted;
  }
}
