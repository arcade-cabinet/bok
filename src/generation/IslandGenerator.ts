import type { BiomeConfig } from '../content/types';
import type { Vec3 } from '../shared/types';
import { TerrainBuilder, type TerrainData } from './TerrainBuilder';
import { EnemyPlacer, type EnemySpawn } from './EnemyPlacer';
import { LootPlacer, type ChestPlacement } from './LootPlacer';
import { StructureGenerator, type Structure } from './StructureGenerator';

/** Complete island blueprint — everything needed to instantiate an island. */
export interface IslandBlueprint {
  biomeId: string;
  seed: string;
  difficulty: number;
  terrain: TerrainData;
  playerSpawn: Vec3;
  enemySpawns: EnemySpawn[];
  chestPositions: ChestPlacement[];
  bossArena: Vec3;
  structures: Structure[];
}

const DEFAULT_ISLAND_SIZE = 64;

/**
 * Orchestrates full island generation: terrain + structures + enemy placement + loot.
 * Pure function — deterministic from BiomeConfig + seed + difficulty.
 */
export class IslandGenerator {
  static generate(
    biome: BiomeConfig,
    seed: string,
    difficulty: number,
    size: number = DEFAULT_ISLAND_SIZE,
  ): IslandBlueprint {
    const terrain = TerrainBuilder.generate(biome, seed, size);
    const structures = StructureGenerator.generate(terrain, difficulty, seed);
    const enemySpawns = EnemyPlacer.place(
      terrain,
      biome.enemies.map(e => ({ enemyId: e.enemyId, weight: e.weight })),
      difficulty,
      seed,
    );
    const chestPositions = LootPlacer.place(terrain, difficulty, seed);
    const playerSpawn = IslandGenerator.#findPlayerSpawn(terrain);
    const bossArena = IslandGenerator.#findBossArena(terrain);

    return {
      biomeId: biome.id,
      seed,
      difficulty,
      terrain,
      playerSpawn,
      enemySpawns,
      chestPositions,
      bossArena,
      structures,
    };
  }

  /** Place player near the edge of the island on solid ground. */
  static #findPlayerSpawn(terrain: TerrainData): Vec3 {
    const size = terrain.width;
    // Search from the south edge toward center for a solid tile
    for (let z = size - 4; z > size / 2; z--) {
      const x = Math.floor(size / 2);
      const h = terrain.heightmap[x][z];
      if (h > 3) {
        return { x, y: h + 1, z };
      }
    }
    // Fallback: center
    const cx = Math.floor(size / 2);
    return { x: cx, y: terrain.heightmap[cx][cx] + 1, z: cx };
  }

  /** Boss arena at center of island (highest point near center). */
  static #findBossArena(terrain: TerrainData): Vec3 {
    const center = Math.floor(terrain.width / 2);
    const searchRadius = 5;
    let bestH = 0;
    let bestX = center;
    let bestZ = center;

    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dz = -searchRadius; dz <= searchRadius; dz++) {
        const x = center + dx;
        const z = center + dz;
        if (x >= 0 && x < terrain.width && z >= 0 && z < terrain.depth) {
          const h = terrain.heightmap[x][z];
          if (h > bestH) {
            bestH = h;
            bestX = x;
            bestZ = z;
          }
        }
      }
    }

    return { x: bestX, y: bestH + 1, z: bestZ };
  }
}
