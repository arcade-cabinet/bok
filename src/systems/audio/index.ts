/**
 * @module audio
 * @role Game audio playback and management via Web Audio API
 * @input Audio file URLs, playback commands, spatial positions
 * @output Audio playback (music tracks, sound effects with 3D positioning)
 * @depends Web Audio API (AudioContext, PannerNode)
 * @tested No unit tests (requires browser AudioContext)
 */
export { AudioManager } from './AudioManager.ts';
export { MusicSystem } from './MusicSystem.ts';
export { SFXPlayer, type SFXOptions } from './SFXPlayer.ts';
