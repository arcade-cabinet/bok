import { AudioManager } from './AudioManager.ts';

export interface SFXOptions {
  volume?: number;
  playbackRate?: number;
  spatial?: { x: number; y: number; z: number };
}

/**
 * Sound effect player with preloading and optional 3D spatial audio.
 *
 * Standard SFX IDs:
 * - sword-swing-1, sword-swing-2, sword-swing-3
 * - hit-flesh, hit-stone
 * - dodge-swoosh, parry-clang
 * - enemy-death, loot-pickup, boss-phase
 * - footstep-grass, footstep-stone
 */
export class SFXPlayer {
  readonly #audio: AudioManager;
  readonly #buffers = new Map<string, AudioBuffer>();
  readonly #loading = new Map<string, Promise<AudioBuffer>>();

  constructor(audio: AudioManager = AudioManager.getInstance()) {
    this.#audio = audio;
  }

  /** Preload and cache an audio buffer for a given SFX id. */
  async preload(id: string, url: string): Promise<void> {
    if (this.#buffers.has(id)) return;

    // Deduplicate concurrent loads
    let pending = this.#loading.get(id);
    if (!pending) {
      pending = this.#loadBuffer(url);
      this.#loading.set(id, pending);
    }

    const buffer = await pending;
    this.#buffers.set(id, buffer);
    this.#loading.delete(id);
  }

  /** Play a cached sound effect. Returns the source node for optional control. */
  play(id: string, options: SFXOptions = {}): AudioBufferSourceNode | null {
    const buffer = this.#buffers.get(id);
    if (!buffer) return null;

    const ctx = this.#audio.getContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = options.playbackRate ?? 1.0;

    // Volume control
    const gainNode = ctx.createGain();
    gainNode.gain.value = options.volume ?? 1.0;

    if (options.spatial) {
      // 3D spatial audio via PannerNode
      const panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 50;
      panner.rolloffFactor = 1;
      panner.positionX.value = options.spatial.x;
      panner.positionY.value = options.spatial.y;
      panner.positionZ.value = options.spatial.z;

      source.connect(gainNode);
      gainNode.connect(panner);
      panner.connect(this.#audio.getMasterGain());
    } else {
      source.connect(gainNode);
      gainNode.connect(this.#audio.getMasterGain());
    }

    source.start(0);
    return source;
  }

  /** Check if a sound effect is preloaded. */
  isLoaded(id: string): boolean {
    return this.#buffers.has(id);
  }

  async #loadBuffer(url: string): Promise<AudioBuffer> {
    const ctx = this.#audio.getContext();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return ctx.decodeAudioData(arrayBuffer);
  }
}
