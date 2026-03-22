import { describe, expect, it } from 'vitest';
import { PRNG } from '../generation/index';
import {
  ALL_BIOME_IDS,
  ANIMAL_SPEED,
  type AnimalState,
  BIOME_ANIMALS,
  DESPAWN_DISTANCE,
  generateAnimalSpawns,
  MAX_ANIMALS,
  SPAWN_MAX_DISTANCE,
  SPAWN_MIN_DISTANCE,
  shouldDespawn,
  updateAnimalWander,
} from './spawn-animals';

/** Stub surface height: flat terrain at y=5. */
const flatSurface = (_x: number, _z: number) => 5;

describe('BIOME_ANIMALS', () => {
  it('has entries for every biome ID', () => {
    for (const biomeId of ALL_BIOME_IDS) {
      expect(BIOME_ANIMALS[biomeId]).toBeDefined();
      expect(Array.isArray(BIOME_ANIMALS[biomeId])).toBe(true);
    }
  });

  it('covers all 8 biomes', () => {
    expect(ALL_BIOME_IDS).toHaveLength(8);
    expect(Object.keys(BIOME_ANIMALS)).toHaveLength(8);
  });

  it('biomes with animals have non-empty string types', () => {
    for (const [biomeId, animals] of Object.entries(BIOME_ANIMALS)) {
      for (const animal of animals) {
        expect(animal, `${biomeId} has empty animal type`).toBeTruthy();
        expect(typeof animal).toBe('string');
      }
    }
  });

  it('volcanic and deep-ocean have no animals', () => {
    expect(BIOME_ANIMALS.volcanic).toHaveLength(0);
    expect(BIOME_ANIMALS['deep-ocean']).toHaveLength(0);
  });
});

describe('generateAnimalSpawns', () => {
  it('returns spawns for biomes with animals', () => {
    const result = generateAnimalSpawns('test-seed', 'forest', 0, 0, 0, flatSurface, 1);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty array for biomes with no animals', () => {
    const result = generateAnimalSpawns('test-seed', 'volcanic', 0, 0, 0, flatSurface, 1);
    expect(result).toEqual([]);
  });

  it('returns empty array for unknown biome', () => {
    const result = generateAnimalSpawns('test-seed', 'nonexistent', 0, 0, 0, flatSurface, 1);
    expect(result).toEqual([]);
  });

  it('respects MAX_ANIMALS cap', () => {
    const result = generateAnimalSpawns('test-seed', 'forest', 0, 0, MAX_ANIMALS, flatSurface, 1);
    expect(result).toHaveLength(0);
  });

  it('spawns at most 2 animals per call', () => {
    const result = generateAnimalSpawns('test-seed', 'forest', 0, 0, 0, flatSurface, 1);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('spawns within correct distance from player', () => {
    const playerX = 50;
    const playerZ = 50;
    const result = generateAnimalSpawns('test-seed', 'forest', playerX, playerZ, 0, flatSurface, 1);
    for (const spawn of result) {
      const dx = spawn.x - playerX;
      const dz = spawn.z - playerZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      expect(dist).toBeGreaterThanOrEqual(SPAWN_MIN_DISTANCE - 1); // allow float tolerance
      expect(dist).toBeLessThanOrEqual(SPAWN_MAX_DISTANCE + 1);
    }
  });

  it('spawn uses surface height from callback', () => {
    const result = generateAnimalSpawns('test-seed', 'forest', 0, 0, 0, flatSurface, 1);
    for (const spawn of result) {
      expect(spawn.y).toBe(5);
    }
  });

  it('each spawn has valid fields', () => {
    const result = generateAnimalSpawns('validate', 'forest', 0, 0, 0, flatSurface, 42);
    for (const spawn of result) {
      expect(spawn.type).toBeTruthy();
      expect(spawn.modelFile).toBeTruthy();
      expect(typeof spawn.x).toBe('number');
      expect(typeof spawn.y).toBe('number');
      expect(typeof spawn.z).toBe('number');
    }
  });

  it('only spawns animal types from the biome palette', () => {
    // Run many frames to get statistical coverage
    const allTypes = new Set<string>();
    for (let frame = 0; frame < 50; frame++) {
      const spawns = generateAnimalSpawns('palette-test', 'forest', 0, 0, 0, flatSurface, frame);
      for (const s of spawns) allTypes.add(s.type);
    }
    const forestAnimals = new Set(BIOME_ANIMALS.forest);
    for (const type of allTypes) {
      expect(forestAnimals.has(type), `unexpected type "${type}" in forest`).toBe(true);
    }
  });
});

describe('updateAnimalWander', () => {
  it('moves animal in heading direction', () => {
    const animal: AnimalState = { type: 'sheep', x: 0, y: 5, z: 0, heading: 0, wanderTimer: 5 };
    updateAnimalWander(animal, 1, new PRNG('test'), flatSurface);
    // heading=0 means cos(0)=1, sin(0)=0 → should move in +x
    expect(animal.x).toBeCloseTo(ANIMAL_SPEED, 1);
    expect(animal.z).toBeCloseTo(0, 1);
  });

  it('decrements wander timer', () => {
    const animal: AnimalState = { type: 'cat', x: 0, y: 5, z: 0, heading: 0, wanderTimer: 5 };
    updateAnimalWander(animal, 1.5, new PRNG('test'), flatSurface);
    expect(animal.wanderTimer).toBe(3.5);
  });

  it('changes heading when timer expires', () => {
    const animal: AnimalState = { type: 'dog', x: 0, y: 5, z: 0, heading: 0, wanderTimer: 0.5 };
    updateAnimalWander(animal, 1, new PRNG('heading-change'), flatSurface);
    // Timer was 0.5, dt is 1 → timer goes to -0.5 → new heading assigned
    // New wanderTimer should be between WANDER_MIN_INTERVAL and WANDER_MAX_INTERVAL
    expect(animal.wanderTimer).toBeGreaterThanOrEqual(3);
    expect(animal.wanderTimer).toBeLessThanOrEqual(8);
  });

  it('updates y to match terrain surface', () => {
    const slopedSurface = (x: number, _z: number) => Math.round(x);
    const animal: AnimalState = { type: 'horse', x: 10, y: 10, z: 0, heading: 0, wanderTimer: 5 };
    updateAnimalWander(animal, 1, new PRNG('terrain'), slopedSurface);
    expect(animal.y).toBe(slopedSurface(Math.round(animal.x), Math.round(animal.z)));
  });
});

describe('shouldDespawn', () => {
  it('returns true when animal is beyond despawn distance', () => {
    expect(shouldDespawn(DESPAWN_DISTANCE + 10, 0, 0, 0)).toBe(true);
  });

  it('returns false when animal is within despawn distance', () => {
    expect(shouldDespawn(DESPAWN_DISTANCE - 10, 0, 0, 0)).toBe(false);
  });

  it('handles diagonal distances correctly', () => {
    // sqrt(50^2 + 50^2) ≈ 70.7 > 60
    expect(shouldDespawn(50, 50, 0, 0)).toBe(true);
    // sqrt(30^2 + 30^2) ≈ 42.4 < 60
    expect(shouldDespawn(30, 30, 0, 0)).toBe(false);
  });

  it('works with non-origin player positions', () => {
    // Player at (100, 100), animal at (100, 100+DESPAWN_DISTANCE+1)
    expect(shouldDespawn(100, 100 + DESPAWN_DISTANCE + 1, 100, 100)).toBe(true);
    expect(shouldDespawn(100, 100 + DESPAWN_DISTANCE - 1, 100, 100)).toBe(false);
  });
});
