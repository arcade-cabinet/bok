/**
 * @module shared
 * @role Types, constants, and EventBus used across all domains
 * @input None (definitions only)
 * @output Shared types, constants, EventBus
 * @depends None
 * @tested N/A (types + constants)
 */
export type { Vec3, EntityId, GamePhaseName, BiomeId, ConfigId } from './types.ts';
export {
  PHYSICS_TICK_RATE, FIXED_TIMESTEP, MAX_DELTA,
  CHUNK_SIZE, MAX_ISLAND_CHUNKS,
  PLAYER_MOVE_SPEED, PLAYER_SPRINT_MULTIPLIER, GRAVITY,
  DODGE_DURATION, DODGE_IFRAMES, PARRY_WINDOW,
} from './constants.ts';
export { EventBus } from './EventBus.ts';
