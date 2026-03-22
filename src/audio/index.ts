/**
 * @module audio
 * @role Barrel export for all audio modules
 */

export {
  playUnderwaterAmbient,
  startAtmosphericSFX,
  stopAtmosphericSFX,
} from './AtmosphericSFX.ts';

export {
  createGameAudio,
  type GameAudioSystem,
} from './AudioFacade.ts';

export {
  setupAudioResumeOnGesture,
} from './AudioResume.ts';

export {
  playBossPhase,
  playEnemyDeath,
  playHitImpact,
  playPlayerHurt,
  playSwordSwing,
  playVictory,
  startAmbient,
  stopAmbient,
} from './GameAudio.ts';

export {
  playBiomeMusic,
  playHubMusic,
  setMusicVolume,
  stopMusic,
} from './MusicManager.ts';

export {
  getActiveSpatialSoundCount,
  playSpatialSound,
  type SpatialSoundOptions,
  stopAllSpatialSounds,
  stopSpatialSound,
  updateListenerPosition,
  updateSoundPosition,
} from './SpatialAudio.ts';
