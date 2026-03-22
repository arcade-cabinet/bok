/**
 * @module systems/spawn-animals
 * @role Passive animal spawning and wander AI
 * @input Biome ID, player position, surface-height lookup
 * @output AnimalSpawn descriptors + per-frame update logic
 * @depends generation/noise (PRNG)
 * @tested spawn-animals.test.ts
 *
 * Spawns passive animals near the player that wander randomly.
 * Animals despawn when too far away, and new ones spawn to fill
 * the population cap. None attack the player.
 *
 * Two-phase API:
 *   1. `AnimalSpawner` — pure data logic (spawn decisions, wander updates)
 *   2. Scene integration via loadGLTF (separate from spawner logic)
 */

import { PRNG } from '../generation/index';

// ---------------------------------------------------------------------------
// Biome animal configuration
// ---------------------------------------------------------------------------

/** Animals available per biome. Empty array = no animals spawn. */
export const BIOME_ANIMALS: Record<string, string[]> = {
  forest: ['raccoon', 'chicken', 'sheep'],
  desert: ['horse'],
  tundra: ['wolf'],
  volcanic: [],
  swamp: ['raccoon'],
  'crystal-caves': ['cat'],
  'sky-ruins': ['chicken', 'chick'],
  'deep-ocean': [],
};

/** All biome IDs that must be present in BIOME_ANIMALS. */
export const ALL_BIOME_IDS = [
  'forest',
  'desert',
  'tundra',
  'volcanic',
  'swamp',
  'crystal-caves',
  'sky-ruins',
  'deep-ocean',
] as const;

/** Model filename mapping (lowercase type -> PascalCase filename). */
const ANIMAL_MODEL_NAMES: Record<string, string> = {
  cat: 'Cat',
  dog: 'Dog',
  horse: 'Horse',
  pig: 'Pig',
  sheep: 'Sheep',
  wolf: 'Wolf',
  chicken: 'Chicken',
  chick: 'Chick',
  raccoon: 'Raccoon',
};

// ---------------------------------------------------------------------------
// Spawn configuration constants
// ---------------------------------------------------------------------------

/** Minimum distance from player for animal spawning. */
export const SPAWN_MIN_DISTANCE = 20;

/** Maximum distance from player for animal spawning. */
export const SPAWN_MAX_DISTANCE = 40;

/** Animals beyond this distance from the player despawn. */
export const DESPAWN_DISTANCE = 60;

/** Maximum simultaneous animals. */
export const MAX_ANIMALS = 6;

/** Minimum time between wander direction changes (seconds). */
export const WANDER_MIN_INTERVAL = 3;

/** Maximum time between wander direction changes (seconds). */
export const WANDER_MAX_INTERVAL = 8;

/** Animal movement speed (world units per second). */
export const ANIMAL_SPEED = 1.5;

// ---------------------------------------------------------------------------
// Data descriptor (pure, testable)
// ---------------------------------------------------------------------------

/** A single animal spawn descriptor. */
export interface AnimalSpawn {
  type: string;
  modelFile: string;
  x: number;
  y: number;
  z: number;
}

/** Runtime state for a spawned animal (used by the update loop). */
export interface AnimalState {
  type: string;
  x: number;
  y: number;
  z: number;
  /** Current movement direction (radians). */
  heading: number;
  /** Time until next wander direction change (seconds). */
  wanderTimer: number;
}

// ---------------------------------------------------------------------------
// Spawner logic (pure functions)
// ---------------------------------------------------------------------------

/**
 * Decide which animals to spawn based on biome, player position, and
 * current animal count.
 *
 * @param seed         World seed for determinism.
 * @param biomeId      Active biome identifier.
 * @param playerX      Player X world position.
 * @param playerZ      Player Z world position.
 * @param currentCount Number of animals currently alive.
 * @param getSurfaceY  Terrain surface height lookup.
 * @param frameId      Frame counter or elapsed time for spawn RNG variation.
 * @returns Array of animal spawn descriptors (may be empty).
 */
export function generateAnimalSpawns(
  seed: string,
  biomeId: string,
  playerX: number,
  playerZ: number,
  currentCount: number,
  getSurfaceY: (x: number, z: number) => number,
  frameId: number,
): AnimalSpawn[] {
  const types = BIOME_ANIMALS[biomeId];
  if (!types || types.length === 0) return [];
  if (currentCount >= MAX_ANIMALS) return [];

  const spawns: AnimalSpawn[] = [];
  const rng = new PRNG(`${seed}:animal:${frameId}`);
  const toSpawn = Math.min(MAX_ANIMALS - currentCount, 2); // spawn up to 2 per call

  for (let i = 0; i < toSpawn; i++) {
    // Random angle + distance from player
    const angle = rng.nextFloat(0, Math.PI * 2);
    const dist = rng.nextFloat(SPAWN_MIN_DISTANCE, SPAWN_MAX_DISTANCE);
    const x = playerX + Math.cos(angle) * dist;
    const z = playerZ + Math.sin(angle) * dist;
    const y = getSurfaceY(Math.round(x), Math.round(z));

    // Pick a random animal type from the biome palette
    const typeIdx = rng.nextInt(0, types.length - 1);
    const type = types[typeIdx];
    const modelFile = ANIMAL_MODEL_NAMES[type] ?? 'Sheep';

    spawns.push({ type, modelFile, x, y, z });
  }

  return spawns;
}

/**
 * Update wander AI for a single animal.
 *
 * @param animal     Mutable animal state.
 * @param dt         Delta time in seconds.
 * @param rng        PRNG instance for direction changes.
 * @param getSurfaceY Terrain surface height lookup.
 * @returns Updated animal state (same reference, mutated in place).
 */
export function updateAnimalWander(
  animal: AnimalState,
  dt: number,
  rng: PRNG,
  getSurfaceY: (x: number, z: number) => number,
): AnimalState {
  animal.wanderTimer -= dt;

  if (animal.wanderTimer <= 0) {
    // Pick a new random heading
    animal.heading = rng.nextFloat(0, Math.PI * 2);
    animal.wanderTimer = rng.nextFloat(WANDER_MIN_INTERVAL, WANDER_MAX_INTERVAL);
  }

  // Move in current heading direction
  const dx = Math.cos(animal.heading) * ANIMAL_SPEED * dt;
  const dz = Math.sin(animal.heading) * ANIMAL_SPEED * dt;
  animal.x += dx;
  animal.z += dz;
  animal.y = getSurfaceY(Math.round(animal.x), Math.round(animal.z));

  return animal;
}

/**
 * Check whether an animal should despawn based on distance from the player.
 */
export function shouldDespawn(animalX: number, animalZ: number, playerX: number, playerZ: number): boolean {
  const dx = animalX - playerX;
  const dz = animalZ - playerZ;
  return Math.sqrt(dx * dx + dz * dz) > DESPAWN_DISTANCE;
}
