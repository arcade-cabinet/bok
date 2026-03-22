/**
 * @module shared
 * @role Types, constants, and EventBus used across all domains
 * @input None (definitions only)
 * @output Shared types, constants, EventBus
 * @depends None
 * @tested N/A (types + constants)
 */

export {
  CHUNK_SIZE,
  DODGE_DURATION,
  DODGE_IFRAMES,
  FIXED_TIMESTEP,
  GRAVITY,
  MAX_DELTA,
  MAX_ISLAND_CHUNKS,
  PARRY_WINDOW,
  PHYSICS_TICK_RATE,
  PLAYER_MOVE_SPEED,
  PLAYER_SPRINT_MULTIPLIER,
} from './constants.ts';
export { EventBus } from './EventBus.ts';
export type { BiomeId, ConfigId, EntityId, GamePhaseName, Vec3 } from './types.ts';
export { APP_NAME, APP_VERSION } from './version.ts';
