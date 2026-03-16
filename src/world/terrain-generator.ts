/**
 * Procedural terrain generator using simplex noise.
 */

import { type VoxelRenderer, type VoxelSetOptions } from "@jolly-pixel/voxel.renderer";
import { BlockId } from "./blocks.ts";
import { noise2D } from "./noise.ts";

const CHUNK_SIZE = 16;
const WORLD_HEIGHT = 32;
const WATER_LEVEL = 10;

export function generateChunkTerrain(
  vr: VoxelRenderer,
  layerName: string,
  cx: number,
  cz: number,
): void {
  const entries: VoxelSetOptions[] = [];

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const gx = cx * CHUNK_SIZE + lx;
      const gz = cz * CHUNK_SIZE + lz;
      const nx = gx / 35;
      const nz = gz / 35;

      const n = noise2D(nx, nz) * 0.5 + 0.5;
      const bNoise = noise2D(nx * 0.5 + 100, nz * 0.5 + 100);
      const h = Math.floor(n * 16) + 4;

      let surfaceBlock = BlockId.Grass as number;
      let subBlock = BlockId.Dirt as number;

      if (bNoise > 0.3 || h <= WATER_LEVEL + 1) {
        surfaceBlock = BlockId.Sand;
        subBlock = BlockId.Sand;
      }
      if (h > 21) {
        surfaceBlock = BlockId.Snow;
      }

      for (let y = 0; y < WORLD_HEIGHT; y++) {
        let blockId = 0;

        if (y === h) {
          blockId = surfaceBlock;
        } else if (y < h && y > h - 4) {
          blockId = subBlock;
        } else if (y <= h - 4) {
          blockId = BlockId.Stone;
        } else if (y > h && y <= WATER_LEVEL) {
          blockId = BlockId.Water;
          if (h === y - 1 && surfaceBlock === BlockId.Grass) {
            const surfIdx = entries.findIndex(
              (e) =>
                e.position.x === gx &&
                e.position.y === h &&
                e.position.z === gz &&
                e.blockId === BlockId.Grass
            );
            if (surfIdx >= 0) {
              entries[surfIdx] = { ...entries[surfIdx], blockId: BlockId.Dirt };
            }
          }
        }

        if (blockId !== 0) {
          entries.push({
            position: { x: gx, y, z: gz },
            blockId,
          });
        }
      }

      // Trees
      const treeHash = Math.abs(Math.sin(gx * 12.9898 + gz * 78.233) * 43758.5453);
      if (
        bNoise < -0.1 &&
        h > WATER_LEVEL + 1 &&
        h < 21 &&
        treeHash % 1 < 0.04 &&
        lx >= 2 &&
        lx <= 13 &&
        lz >= 2 &&
        lz <= 13
      ) {
        for (let ty = 1; ty <= 4; ty++) {
          entries.push({
            position: { x: gx, y: h + ty, z: gz },
            blockId: BlockId.Wood,
          });
        }
        for (let tlx = -2; tlx <= 2; tlx++) {
          for (let tlz = -2; tlz <= 2; tlz++) {
            for (let ly = 3; ly <= 5; ly++) {
              if (Math.abs(tlx) === 2 && Math.abs(tlz) === 2 && ly === 5) continue;
              if (tlx === 0 && tlz === 0 && ly <= 4) continue;
              entries.push({
                position: { x: gx + tlx, y: h + ly, z: gz + tlz },
                blockId: BlockId.Leaves,
              });
            }
          }
        }
      }
    }
  }

  vr.setVoxelBulk(layerName, entries);
}

export function generateSpawnShrine(
  vr: VoxelRenderer,
  layerName: string,
  surfaceY: number,
): void {
  const entries: VoxelSetOptions[] = [];

  for (let x = 6; x <= 10; x++) {
    for (let z = 6; z <= 10; z++) {
      entries.push({
        position: { x, y: surfaceY, z },
        blockId: BlockId.StoneBricks,
      });
      for (let y = surfaceY + 1; y <= surfaceY + 4; y++) {
        vr.removeVoxel(layerName, { position: { x, y, z } });
      }
    }
  }

  entries.push({ position: { x: 6, y: surfaceY + 1, z: 6 }, blockId: BlockId.Torch });
  entries.push({ position: { x: 10, y: surfaceY + 1, z: 6 }, blockId: BlockId.Torch });
  entries.push({ position: { x: 6, y: surfaceY + 1, z: 10 }, blockId: BlockId.Torch });
  entries.push({ position: { x: 10, y: surfaceY + 1, z: 10 }, blockId: BlockId.Torch });
  entries.push({ position: { x: 8, y: surfaceY, z: 8 }, blockId: BlockId.Glass });

  vr.setVoxelBulk(layerName, entries);
}

export function findSurfaceY(
  vr: VoxelRenderer,
  x: number,
  z: number,
): number {
  for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
    const entry = vr.getVoxel({ x, y, z });
    if (entry && entry.blockId !== BlockId.Air) {
      return y;
    }
  }
  return WATER_LEVEL;
}

export { CHUNK_SIZE, WORLD_HEIGHT, WATER_LEVEL };
