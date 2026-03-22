/**
 * @module rendering
 * @role Visual effects layer — particles, weather, day/night, water, post-processing, LOD, quality
 * @input Scene state, dt, camera position, biome config
 * @output Three.js meshes, shader uniforms, CSS overlays
 * @depends three
 * @tested ParticleSystem.test.ts, DayNightCycle.test.ts, LODManager.test.ts, QualitySettings.test.ts
 */

export { DayNightCycle, type TimeOfDay } from './DayNightCycle.ts';
export { LODManager, type LODConfig } from './LODManager.ts';
export { ParticleSystem, type ParticleType } from './ParticleSystem.ts';
export { PostProcessing } from './PostProcessing.ts';
export { generateTileset, TILES } from './TilesetGenerator.ts';
export {
  type QualityConfig,
  type QualityPreset,
  QUALITY_PRESETS,
  detectQualityPreset,
  getEffectiveQualityConfig,
  loadQualitySettings,
  resolveQualityConfig,
  saveQualitySettings,
} from './QualitySettings.ts';
export { WaterRenderer } from './WaterRenderer.ts';
export { WeatherSystem } from './WeatherSystem.ts';
