/** Shared type definitions used across domains. */

/** 3D vector. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Unique entity identifier. */
export type EntityId = number;

/** Game phase names. */
export type GamePhaseName =
  | 'menu'
  | 'hub'
  | 'sailing'
  | 'island-select'
  | 'exploring'
  | 'combat'
  | 'boss'
  | 'victory'
  | 'death'
  | 'paused';

/** Biome identifier. */
export type BiomeId = string;

/** Content config identifier. */
export type ConfigId = string;
