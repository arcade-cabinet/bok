/**
 * @module audio/SpatialAudio
 * @role Position-aware sound playback using Tone.Panner3D
 * @input Sound ID, 3D position, listener position
 * @output Spatialized audio playback
 */
import * as Tone from 'tone';

interface SpatialSound {
  player: Tone.Player;
  panner: Tone.Panner3D;
}

/** Active spatial sounds keyed by ID */
const activeSounds = new Map<string, SpatialSound>();

/**
 * Update the listener position (call each frame from game loop).
 * Maps game coordinates to the Web Audio API listener via Tone.js.
 */
export function updateListenerPosition(x: number, y: number, z: number, forwardX: number, forwardZ: number): void {
  const listener = Tone.getListener();
  listener.positionX.value = x;
  listener.positionY.value = y;
  listener.positionZ.value = z;
  listener.forwardX.value = forwardX;
  listener.forwardY.value = 0;
  listener.forwardZ.value = forwardZ;
}

export interface SpatialSoundOptions {
  loop?: boolean;
  volume?: number;
  maxDistance?: number;
  refDistance?: number;
  rolloffFactor?: number;
  distanceModel?: DistanceModelType;
}

/**
 * Play a sound at a specific 3D position.
 * If a sound with the same ID is already playing, it is stopped first.
 */
export function playSpatialSound(
  id: string,
  url: string,
  x: number,
  y: number,
  z: number,
  options?: SpatialSoundOptions,
): void {
  stopSpatialSound(id);

  const panner = new Tone.Panner3D({
    positionX: x,
    positionY: y,
    positionZ: z,
    maxDistance: options?.maxDistance ?? 50,
    refDistance: options?.refDistance ?? 1,
    rolloffFactor: options?.rolloffFactor ?? 1,
    distanceModel: options?.distanceModel ?? 'inverse',
    panningModel: 'HRTF',
  }).toDestination();

  const player = new Tone.Player({
    url,
    loop: options?.loop ?? false,
    autostart: false,
    volume: options?.volume ?? -6,
    onload: () => {
      // Guard: the sound may have been stopped before loading finished
      if (!activeSounds.has(id)) {
        player.dispose();
        panner.dispose();
        return;
      }
      player.connect(panner);
      player.start();
      if (!options?.loop) {
        player.onstop = () => stopSpatialSound(id);
      }
    },
  });

  activeSounds.set(id, { player, panner });
}

/**
 * Update the position of an existing spatial sound (for moving sources like enemies).
 */
export function updateSoundPosition(id: string, x: number, y: number, z: number): void {
  const sound = activeSounds.get(id);
  if (!sound) return;
  sound.panner.positionX.value = x;
  sound.panner.positionY.value = y;
  sound.panner.positionZ.value = z;
}

/**
 * Stop and dispose a spatial sound by ID.
 */
export function stopSpatialSound(id: string): void {
  const sound = activeSounds.get(id);
  if (!sound) return;
  activeSounds.delete(id);
  try {
    sound.player.stop();
  } catch {
    // Player may not have started yet
  }
  sound.player.dispose();
  sound.panner.dispose();
}

/**
 * Stop all spatial sounds (call on scene exit).
 */
export function stopAllSpatialSounds(): void {
  for (const id of [...activeSounds.keys()]) {
    stopSpatialSound(id);
  }
}

/**
 * Get active spatial sound count (for debugging/testing).
 */
export function getActiveSpatialSoundCount(): number {
  return activeSounds.size;
}
