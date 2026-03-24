/** Shared constants used across domains. */

/** Prepend Vite BASE_URL so asset paths resolve on GitHub Pages (base='/bok/'). */
export function resolveAssetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  if (!base || base === '/') return path;
  if (path.startsWith('/')) return base + path.slice(1);
  return base + path;
}

/** Physics tick rate (Hz). */
export const PHYSICS_TICK_RATE = 60;

/** Fixed timestep for physics (seconds). */
export const FIXED_TIMESTEP = 1 / PHYSICS_TICK_RATE;

/** Maximum delta time clamp (seconds). */
export const MAX_DELTA = 1 / 20;

/** Voxel chunk size in blocks. */
export const CHUNK_SIZE = 16;

/** Maximum island dimension in chunks. */
export const MAX_ISLAND_CHUNKS = 8;

/** Player default move speed (units/sec). */
export const PLAYER_MOVE_SPEED = 6;

/** Player sprint multiplier. */
export const PLAYER_SPRINT_MULTIPLIER = 1.6;

/** Gravity (units/sec^2). */
export const GRAVITY = -20;

/** Dodge roll duration (seconds). */
export const DODGE_DURATION = 0.4;

/** Dodge i-frame window (seconds). */
export const DODGE_IFRAMES = 0.25;

/** Parry window duration (seconds). */
export const PARRY_WINDOW = 0.2;
