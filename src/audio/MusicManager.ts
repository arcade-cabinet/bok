/**
 * @module audio/MusicManager
 * @role Play background music tracks per biome with crossfading
 * @input Biome ID, user gesture for Tone.start()
 * @output Background music playback with volume control
 */
import * as Tone from 'tone';
import { resolveAssetUrl } from '../shared/constants.ts';

/** Map biome IDs to music track URLs */
const BIOME_TRACKS: Record<string, string> = {
  forest: '/assets/audio/music/whispering-woods.ogg',
  desert: '/assets/audio/music/strange-worlds.ogg',
  tundra: '/assets/audio/music/drifting-memories.ogg',
  volcanic: '/assets/audio/music/forgotten-biomes.ogg',
  swamp: '/assets/audio/music/floating-dream.ogg',
  crystal: '/assets/audio/music/minuet.ogg',
  sky: '/assets/audio/music/cuddle-clouds.ogg',
  ocean: '/assets/audio/music/wanderers-tale.ogg',
};

/** Hub gets the Vienna Woods track */
const HUB_TRACK = '/assets/audio/music/vienna-woods.ogg';

/** Menu gets no music (just ambient from GameAudio) */

let currentPlayer: Tone.Player | null = null;
let currentGain: Tone.Gain | null = null;
let currentBiome: string | null = null;

/**
 * Start playing the music track for a biome.
 * Crossfades if already playing a different track.
 */
export async function playBiomeMusic(biome: string): Promise<void> {
  const url = resolveAssetUrl(BIOME_TRACKS[biome] ?? BIOME_TRACKS.forest);
  if (currentBiome === biome && currentPlayer) return; // Already playing

  await stopMusic(0.5); // Fade out current

  currentBiome = biome;
  currentGain = new Tone.Gain(0).toDestination();
  currentPlayer = new Tone.Player({
    url,
    loop: true,
    autostart: false,
    onload: () => {
      if (currentPlayer && currentGain) {
        currentPlayer.connect(currentGain);
        currentPlayer.start();
        // Fade in over 1s
        currentGain.gain.rampTo(0.15, 1);
      }
    },
  });
}

/**
 * Play the hub island music.
 */
export async function playHubMusic(): Promise<void> {
  if (currentBiome === 'hub' && currentPlayer) return;

  await stopMusic(0.5);

  currentBiome = 'hub';
  currentGain = new Tone.Gain(0).toDestination();
  currentPlayer = new Tone.Player({
    url: resolveAssetUrl(HUB_TRACK),
    loop: true,
    autostart: false,
    onload: () => {
      if (currentPlayer && currentGain) {
        currentPlayer.connect(currentGain);
        currentPlayer.start();
        currentGain.gain.rampTo(0.12, 1);
      }
    },
  });
}

/**
 * Stop current music with fade out.
 */
export async function stopMusic(fadeDuration = 1): Promise<void> {
  if (!currentPlayer || !currentGain) return;

  const player = currentPlayer;
  const gain = currentGain;
  currentPlayer = null;
  currentGain = null;
  currentBiome = null;

  gain.gain.rampTo(0, fadeDuration);
  await new Promise((resolve) => setTimeout(resolve, fadeDuration * 1000 + 100));
  player.stop();
  player.dispose();
  gain.dispose();
}

/**
 * Set music volume (0-1).
 */
export function setMusicVolume(vol: number): void {
  if (currentGain) {
    currentGain.gain.rampTo(vol * 0.2, 0.3);
  }
}
