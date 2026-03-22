/**
 * @module audio/AudioFacade
 * @role Unified audio facade for the game
 * @input Game state changes, positions
 * @output Coordinated music, SFX, and spatial audio
 */
import * as Tone from 'tone';

import { startAtmosphericSFX, stopAtmosphericSFX } from './AtmosphericSFX.ts';
import { playBiomeMusic, playHubMusic, setMusicVolume, stopMusic } from './MusicManager.ts';
import {
  getActiveSpatialSoundCount,
  playSpatialSound,
  type SpatialSoundOptions,
  stopAllSpatialSounds,
  stopSpatialSound,
  updateListenerPosition,
  updateSoundPosition,
} from './SpatialAudio.ts';

export interface GameAudioSystem {
  /** Initialize audio (must be called after user gesture) */
  init(): Promise<void>;
  /** Start music for a biome */
  startBiome(biome: string): Promise<void>;
  /** Start hub music */
  startHub(): Promise<void>;
  /** Stop all audio */
  stopAll(): Promise<void>;
  /** Update listener position each frame */
  updateListener(x: number, y: number, z: number, forwardX: number, forwardZ: number): void;
  /** Play a one-shot SFX at a position */
  playSFXAt(name: string, x: number, y: number, z: number): void;
  /** Play a looping ambient at a position */
  playAmbientAt(id: string, name: string, x: number, y: number, z: number): void;
  /** Update position of a moving sound source */
  updateSourcePosition(id: string, x: number, y: number, z: number): void;
  /** Stop a specific spatial sound */
  stopSource(id: string): void;
  /** Set master volume (0-1) */
  setVolume(vol: number): void;
  /** Get count of active spatial sounds (debugging) */
  getActiveSpatialCount(): number;
}

/** Map of well-known SFX names to their asset URLs */
const SFX_URLS: Record<string, string> = {
  'enemy-growl': '/audio/sfx/stalker.ogg',
  'ambient-wind': '/audio/sfx/phantom.ogg',
  shadow: '/audio/sfx/shadow.ogg',
  presence: '/audio/sfx/presence-behind.ogg',
};

/**
 * Create a GameAudioSystem instance. Call init() after a user gesture.
 */
export function createGameAudio(): GameAudioSystem {
  let initialized = false;

  return {
    async init(): Promise<void> {
      if (initialized) return;
      await Tone.start();
      initialized = true;
    },

    async startBiome(biome: string): Promise<void> {
      await playBiomeMusic(biome);
      startAtmosphericSFX();
    },

    async startHub(): Promise<void> {
      await playHubMusic();
    },

    async stopAll(): Promise<void> {
      await stopMusic();
      stopAtmosphericSFX();
      stopAllSpatialSounds();
    },

    updateListener(x: number, y: number, z: number, forwardX: number, forwardZ: number): void {
      updateListenerPosition(x, y, z, forwardX, forwardZ);
    },

    playSFXAt(name: string, x: number, y: number, z: number): void {
      const url = SFX_URLS[name] ?? name;
      const id = `sfx-${name}-${Date.now()}`;
      playSpatialSound(id, url, x, y, z, { loop: false, volume: -8 });
    },

    playAmbientAt(id: string, name: string, x: number, y: number, z: number): void {
      const url = SFX_URLS[name] ?? name;
      const options: SpatialSoundOptions = {
        loop: true,
        volume: -12,
        maxDistance: 30,
        refDistance: 2,
      };
      playSpatialSound(id, url, x, y, z, options);
    },

    updateSourcePosition(id: string, x: number, y: number, z: number): void {
      updateSoundPosition(id, x, y, z);
    },

    stopSource(id: string): void {
      stopSpatialSound(id);
    },

    setVolume(vol: number): void {
      setMusicVolume(vol);
    },

    getActiveSpatialCount(): number {
      return getActiveSpatialSoundCount();
    },
  };
}
