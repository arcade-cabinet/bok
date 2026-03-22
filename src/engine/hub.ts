/**
 * @module engine/hub
 * @role Generate and render a fixed 32x32 hub island with buildings and NPC markers
 * @input JollyPixel World, Rapier World
 * @output VoxelRenderer instance, surface height lookup, building positions, NPC positions
 */
import RAPIER from '@dimforge/rapier3d';
import { type BlockDefinition, Face, type TileRef, VoxelRenderer } from '@jolly-pixel/voxel.renderer';
import * as THREE from 'three';
import { PRNG, SimplexNoise } from '../generation/index.ts';
import { generateTileset, TILES } from '../rendering/index';
import type { JpWorld, SurfaceHeightFn } from './types.ts';

// --- Block Definitions ---
const BLOCK_DEFS: BlockDefinition[] = [
  {
    id: 1,
    name: 'Grass',
    shapeId: 'cube',
    collidable: true,
    faceTextures: { [Face.PosY]: TILES.GRASS_TOP as TileRef, [Face.NegY]: TILES.DIRT as TileRef },
    defaultTexture: TILES.DIRT as TileRef,
  },
  {
    id: 2,
    name: 'Dirt',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.DIRT as TileRef,
  },
  {
    id: 3,
    name: 'Stone',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.STONE as TileRef,
  },
  {
    id: 4,
    name: 'Water',
    shapeId: 'cube',
    collidable: false,
    faceTextures: {},
    defaultTexture: TILES.WATER as TileRef,
  },
  {
    id: 5,
    name: 'Sand',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.SAND as TileRef,
  },
  {
    id: 6,
    name: 'Wood',
    shapeId: 'cube',
    collidable: true,
    faceTextures: { [Face.PosY]: TILES.WOOD_TOP as TileRef, [Face.NegY]: TILES.WOOD_TOP as TileRef },
    defaultTexture: TILES.WOOD_SIDE as TileRef,
  },
  {
    id: 7,
    name: 'Leaves',
    shapeId: 'cube',
    collidable: false,
    faceTextures: {},
    defaultTexture: TILES.LEAVES as TileRef,
  },
  {
    id: 8,
    name: 'StoneBrick',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.STONE_BRICK as TileRef,
  },
];

const HUB_SIZE = 32;
const BASE_HEIGHT = 4;
const NOISE_AMP = 2;
const HUB_SEED = 'bok-hub-island';

export interface BuildingDef {
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  wallBlock: number;
  roofBlock: number;
}

export interface NPCDef {
  name: string;
  x: number;
  z: number;
}

const BUILDINGS: BuildingDef[] = [
  { name: 'Armory', x: 5, z: 5, width: 5, depth: 5, height: 5, wallBlock: 3, roofBlock: 5 },
  { name: 'Docks', x: 25, z: 5, width: 5, depth: 4, height: 4, wallBlock: 6, roofBlock: 6 },
  { name: 'Library', x: 5, z: 25, width: 5, depth: 5, height: 6, wallBlock: 3, roofBlock: 2 },
  { name: 'Market', x: 15, z: 25, width: 6, depth: 4, height: 4, wallBlock: 6, roofBlock: 7 },
  { name: 'Forge', x: 25, z: 25, width: 5, depth: 5, height: 5, wallBlock: 3, roofBlock: 5 },
];

const NPCS: NPCDef[] = [
  { name: 'Blacksmith', x: 7, z: 7 },
  { name: 'Librarian', x: 7, z: 27 },
  { name: 'Merchant', x: 17, z: 27 },
  { name: 'Dockmaster', x: 27, z: 7 },
];

export interface HubResult {
  voxelMap: VoxelRenderer;
  getSurfaceY: SurfaceHeightFn;
  buildings: BuildingDef[];
  npcs: NPCDef[];
  hubSize: number;
}

/**
 * Create the hub island with buildings and NPC position markers.
 * Uses a fixed seed for deterministic layout.
 */
export function createHub(jpWorld: JpWorld, rapierWorld: RAPIER.World): HubResult {
  const voxelMap = jpWorld.createActor('hub-terrain').addComponentAndGet(VoxelRenderer, {
    chunkSize: 16,
    layers: ['Ground'],
    blocks: BLOCK_DEFS,
    alphaTest: 0.5,
    material: 'lambert',
    rapier: {
      api: RAPIER as never,
      world: rapierWorld as never,
    },
  });

  // Generate and register programmatic tileset
  const tileset = generateTileset();
  const tilesetTexture = new THREE.Texture(tileset.canvas);
  tilesetTexture.magFilter = THREE.NearestFilter;
  tilesetTexture.minFilter = THREE.NearestFilter;
  tilesetTexture.needsUpdate = true;
  voxelMap.tilesetManager.registerTexture(
    { id: 'game', src: tileset.dataUrl, tileSize: 32, cols: 3, rows: 3 },
    tilesetTexture as unknown as THREE.Texture<HTMLImageElement>,
  );

  // Generate gentle terrain from seed
  const prng = new PRNG(HUB_SEED);
  const noise = new SimplexNoise(prng);

  const surfaceHeight = new Map<string, number>();

  for (let x = 0; x < HUB_SIZE; x++) {
    for (let z = 0; z < HUB_SIZE; z++) {
      const dx = (x - HUB_SIZE / 2) / (HUB_SIZE / 2);
      const dz = (z - HUB_SIZE / 2) / (HUB_SIZE / 2);
      const falloff = 1 - Math.sqrt(dx * dx + dz * dz);
      if (falloff <= 0) continue;

      const noiseVal = noise.noise2D(x * 0.08, z * 0.08);
      const height = Math.floor(BASE_HEIGHT + noiseVal * NOISE_AMP * falloff);

      for (let y = 0; y <= height; y++) {
        let blockId: number;
        if (y === height) {
          blockId = height <= 2 ? 5 : 1;
        } else if (y >= height - 2) {
          blockId = 2;
        } else {
          blockId = 3;
        }
        voxelMap.setVoxel('Ground', { position: { x, y, z }, blockId });
      }

      // Water at edges
      if (height < 2) {
        for (let y = height + 1; y <= 2; y++) {
          voxelMap.setVoxel('Ground', { position: { x, y, z }, blockId: 4 });
        }
      }

      // Track surface
      if (height >= 2) {
        surfaceHeight.set(`${x},${z}`, height + 1);
      }
    }
  }

  // Place buildings
  for (const bld of BUILDINGS) {
    const baseY = surfaceHeight.get(`${bld.x},${bld.z}`) ?? BASE_HEIGHT + 1;
    const floorY = baseY;

    // Walls
    for (let bx = 0; bx < bld.width; bx++) {
      for (let bz = 0; bz < bld.depth; bz++) {
        const wx = bld.x + bx;
        const wz = bld.z + bz;
        const isEdge = bx === 0 || bx === bld.width - 1 || bz === 0 || bz === bld.depth - 1;

        for (let by = 0; by < bld.height; by++) {
          if (isEdge) {
            // Leave a door opening on the front wall center
            const isFront = bz === 0;
            const isDoor = isFront && bx >= Math.floor(bld.width / 2) - 1 && bx <= Math.floor(bld.width / 2) && by < 2;
            if (!isDoor) {
              voxelMap.setVoxel('Ground', { position: { x: wx, y: floorY + by, z: wz }, blockId: bld.wallBlock });
            }
          }
        }

        // Roof
        voxelMap.setVoxel('Ground', { position: { x: wx, y: floorY + bld.height, z: wz }, blockId: bld.roofBlock });

        // Update surface height to roof top for walkability check
        surfaceHeight.set(`${wx},${wz}`, floorY + bld.height + 1);
      }
    }
  }

  function getSurfaceY(x: number, z: number): number {
    return surfaceHeight.get(`${Math.round(x)},${Math.round(z)}`) ?? BASE_HEIGHT + 1;
  }

  return { voxelMap, getSurfaceY, buildings: BUILDINGS, npcs: NPCS, hubSize: HUB_SIZE };
}
