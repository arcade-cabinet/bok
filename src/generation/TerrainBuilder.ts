import type { BiomeConfig } from '../content/types';
import { PRNG, SimplexNoise } from './noise';

/** Output of terrain generation — heightmap + block type data. */
export interface TerrainData {
  width: number;
  depth: number;
  /** 2D array [x][z] of integer heights. */
  heightmap: number[][];
  /** 2D array [x][z] of block type IDs at the surface. */
  blocks: number[][];
}

export class TerrainBuilder {
  /**
   * Generate terrain from a biome config and seed.
   * Pure function — same inputs always produce same output.
   */
  static generate(biome: BiomeConfig, seed: string, size: number): TerrainData {
    const rng = new PRNG(`terrain:${seed}`);
    const noise = new SimplexNoise(rng);
    const { noiseOctaves, noiseFrequency, noiseAmplitude, waterLevel, baseHeight, blocks: blockTypes } = biome.terrain;

    const heightmap: number[][] = [];
    const blocks: number[][] = [];

    // Island mask: circular falloff so edges are water
    const center = size / 2;
    const maxRadius = center * 0.85;

    for (let x = 0; x < size; x++) {
      heightmap[x] = [];
      blocks[x] = [];
      for (let z = 0; z < size; z++) {
        // Distance from center for island falloff
        const dx = x - center;
        const dz = z - center;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const falloff = Math.max(0, 1 - (dist / maxRadius) ** 2);

        // Noise-based height — fbm returns [-1, 1], scale by amplitude here
        const noiseVal = noise.fbm(x, z, noiseOctaves, noiseFrequency);
        const rawHeight = baseHeight + noiseVal * noiseAmplitude * falloff;
        const height = Math.max(0, Math.round(rawHeight));
        heightmap[x][z] = height;

        // Determine surface block type
        if (height <= waterLevel) {
          blocks[x][z] = blockTypes.water ?? blockTypes.stone;
        } else if (height <= waterLevel + 1) {
          blocks[x][z] = blockTypes.surface;
        } else if (height <= waterLevel + 3) {
          blocks[x][z] = blockTypes.surface;
        } else {
          blocks[x][z] = blockTypes.accent ?? blockTypes.surface;
        }
      }
    }

    return { width: size, depth: size, heightmap, blocks };
  }
}
