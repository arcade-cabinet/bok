/**
 * @module rendering
 * @role Visual effects layer — particles, weather, day/night, water, post-processing, LOD, quality
 * @input Scene state, dt, camera position, biome config
 * @output Three.js meshes, shader uniforms, CSS overlays
 * @depends three
 * @tested ParticleSystem.test.ts, DayNightCycle.test.ts, LODManager.test.ts, QualitySettings.test.ts
 */

export {
  CW_TILESET_COLS,
  CW_TILESET_ROWS,
  generateCubeWorldTileset,
  loadCubeWorldAtlas,
} from './CubeWorldAtlas.ts';
export { DayNightCycle, type TimeOfDay } from './DayNightCycle.ts';
export { type LODConfig, LODManager } from './LODManager.ts';
export { ParticleSystem, type ParticleType } from './ParticleSystem.ts';
export { PostProcessing } from './PostProcessing.ts';
export {
  detectQualityPreset,
  getEffectiveQualityConfig,
  loadQualitySettings,
  QUALITY_PRESETS,
  type QualityConfig,
  type QualityPreset,
  resolveQualityConfig,
  saveQualitySettings,
} from './QualitySettings.ts';
export { generateTileset, TILES, TILESET_COLS, TILESET_ROWS } from './TilesetGenerator.ts';
export { WaterRenderer } from './WaterRenderer.ts';
export { WeatherSystem } from './WeatherSystem.ts';
