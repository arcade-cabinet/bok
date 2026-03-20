/**
 * @module rendering
 * @role Visual effects layer — particles, weather, day/night, water, post-processing
 * @input Scene state, dt, camera position, biome config
 * @output Three.js meshes, shader uniforms, CSS overlays
 * @depends three
 * @tested ParticleSystem.test.ts, DayNightCycle.test.ts
 */
export { ParticleSystem, type ParticleType } from './ParticleSystem.ts';
export { WeatherSystem } from './WeatherSystem.ts';
export { DayNightCycle, type TimeOfDay } from './DayNightCycle.ts';
export { WaterRenderer } from './WaterRenderer.ts';
export { PostProcessing } from './PostProcessing.ts';
