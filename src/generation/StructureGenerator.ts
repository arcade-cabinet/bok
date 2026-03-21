import type { Vec3 } from '../shared/index';
import { PRNG } from './noise';
import type { TerrainData } from './TerrainBuilder';

export interface Structure {
  position: Vec3;
  type: 'ruin' | 'dungeon-entrance' | 'shrine' | 'tower';
  /** Voxel footprint width/depth. */
  size: number;
}

/**
 * Generates mini-dungeon and ruin template placements on terrain.
 */
export class StructureGenerator {
  static readonly STRUCTURE_TYPES: Structure['type'][] = ['ruin', 'dungeon-entrance', 'shrine', 'tower'];

  static generate(terrain: TerrainData, difficulty: number, seed: string): Structure[] {
    const rng = new PRNG(`structures:${seed}`);
    const structures: Structure[] = [];
    const count = 2 + Math.floor(difficulty * 0.5);
    const center = terrain.width / 2;

    for (let i = 0; i < count; i++) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const x = rng.nextInt(8, terrain.width - 9);
        const z = rng.nextInt(8, terrain.depth - 9);
        const height = terrain.heightmap[x][z];

        if (height <= 4) continue;

        // Keep away from boss arena center
        const dx = x - center;
        const dz = z - center;
        const dist = Math.sqrt(dx * dx + dz * dz) / center;
        if (dist < 0.2) continue;

        // Avoid overlap with existing structures
        const tooClose = structures.some((s) => {
          const sdx = s.position.x - x;
          const sdz = s.position.z - z;
          return Math.sqrt(sdx * sdx + sdz * sdz) < 12;
        });
        if (tooClose) continue;

        const type = StructureGenerator.STRUCTURE_TYPES[rng.nextInt(0, StructureGenerator.STRUCTURE_TYPES.length - 1)];
        const size = rng.nextInt(4, 8);
        structures.push({ position: { x, y: height, z }, type, size });
        break;
      }
    }

    return structures;
  }
}
