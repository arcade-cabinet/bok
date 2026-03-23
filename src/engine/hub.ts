/**
 * @module engine/hub
 * @role Generate and render a fixed 32x32 hub island with buildings, docks, and NPC markers
 * @input JollyPixel World, Rapier World
 * @output VoxelRenderer instance, surface height lookup, building positions, dock positions, NPC positions
 */
import RAPIER from '@dimforge/rapier3d';
import { type BlockDefinition, Face, type TileRef, VoxelRenderer } from '@jolly-pixel/voxel.renderer';
import * as THREE from 'three';
import { PRNG, SimplexNoise } from '../generation/index.ts';
import {
  CW_TILESET_COLS,
  CW_TILESET_ROWS,
  generateCubeWorldTileset,
  generateTileset,
  TILES,
  TILESET_COLS,
  TILESET_ROWS,
} from '../rendering/index';
import { DOCK_SURFACE_Y, DOCKS, PIER_LENGTH, PIER_WIDTH } from './hubDocks.ts';
import type { JpWorld, SurfaceHeightFn } from './types.ts';

// Re-export dock types and functions so existing consumers don't need to change imports
export type { DockDef, DockProximity } from './hubDocks.ts';
export { DOCK_PROXIMITY_RADIUS, DOCKS, findNearbyDock, getDockEndPosition } from './hubDocks.ts';

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
  // Wood Pole — support posts for docks
  {
    id: 111,
    name: 'Wood Pole',
    shapeId: 'poleY',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.WOOD_SIDE as TileRef,
  },
  // Stone Pole — signpost poles at dock ends
  {
    id: 110,
    name: 'Stone Pole',
    shapeId: 'poleY',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.STONE as TileRef,
  },
  // Wood Slab — dock planking surface
  {
    id: 101,
    name: 'Wood Slab',
    shapeId: 'slabBottom',
    collidable: true,
    faceTextures: {},
    defaultTexture: TILES.WOOD_SIDE as TileRef,
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
  { name: 'Library', x: 5, z: 25, width: 5, depth: 5, height: 6, wallBlock: 3, roofBlock: 2 },
  { name: 'Market', x: 15, z: 25, width: 6, depth: 4, height: 4, wallBlock: 6, roofBlock: 7 },
  { name: 'Forge', x: 25, z: 25, width: 5, depth: 5, height: 5, wallBlock: 3, roofBlock: 5 },
];

const NPCS: NPCDef[] = [
  { name: 'Blacksmith', x: 7, z: 7 },
  { name: 'Librarian', x: 7, z: 27 },
  { name: 'Merchant', x: 17, z: 27 },
  { name: 'Navigator', x: 16, z: 10 },
];

export interface HubResult {
  voxelMap: VoxelRenderer;
  getSurfaceY: SurfaceHeightFn;
  buildings: BuildingDef[];
  npcs: NPCDef[];
  docks: typeof DOCKS;
  hubSize: number;
}

/**
 * Create the hub island with buildings, docks, and NPC position markers.
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

  // Register CubeWorld-palette tileset with procedural detail, falling back to bright programmatic.
  const tileset = (() => {
    try {
      return { ...generateCubeWorldTileset(), cols: CW_TILESET_COLS, rows: CW_TILESET_ROWS };
    } catch {
      const fallback = generateTileset();
      return { ...fallback, cols: TILESET_COLS, rows: TILESET_ROWS };
    }
  })();
  const tilesetTexture = new THREE.Texture(tileset.canvas);
  tilesetTexture.magFilter = THREE.NearestFilter;
  tilesetTexture.minFilter = THREE.NearestFilter;
  tilesetTexture.needsUpdate = true;
  voxelMap.tilesetManager.registerTexture(
    { id: 'game', src: tileset.dataUrl, tileSize: 32, cols: tileset.cols, rows: tileset.rows },
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

  // Place docks — wooden piers extending from the shoreline into the water
  for (const dock of DOCKS) {
    const ddx = dock.direction === 'east' ? 1 : dock.direction === 'west' ? -1 : 0;
    const ddz = dock.direction === 'south' ? 1 : dock.direction === 'north' ? -1 : 0;

    for (let step = 0; step < PIER_LENGTH; step++) {
      for (let w = 0; w < PIER_WIDTH; w++) {
        // Pier extends along the direction axis; width perpendicular to it
        const px = dock.x + ddx * step + (ddz !== 0 ? w - 1 : 0);
        const pz = dock.z + ddz * step + (ddx !== 0 ? w - 1 : 0);

        // Wood plank deck surface
        voxelMap.setVoxel('Ground', { position: { x: px, y: DOCK_SURFACE_Y, z: pz }, blockId: 6 });
        surfaceHeight.set(`${px},${pz}`, DOCK_SURFACE_Y + 1);

        // Support posts every 3 blocks along the pier, on the outer edges
        if (step % 3 === 0 && (w === 0 || w === PIER_WIDTH - 1)) {
          for (let py = 0; py < DOCK_SURFACE_Y; py++) {
            voxelMap.setVoxel('Ground', { position: { x: px, y: py, z: pz }, blockId: 111 });
          }
        }
      }
    }

    // Signpost at the end of the pier (center of pier width)
    const signX = dock.x + ddx * PIER_LENGTH;
    const signZ = dock.z + ddz * PIER_LENGTH;
    // Stone pole — 3 blocks tall from the deck surface
    for (let sy = DOCK_SURFACE_Y + 1; sy <= DOCK_SURFACE_Y + 3; sy++) {
      voxelMap.setVoxel('Ground', { position: { x: signX, y: sy, z: signZ }, blockId: 110 });
    }
    // Stone slab on top as sign board
    voxelMap.setVoxel('Ground', { position: { x: signX, y: DOCK_SURFACE_Y + 4, z: signZ }, blockId: 8 });
  }

  function getSurfaceY(x: number, z: number): number {
    return surfaceHeight.get(`${Math.round(x)},${Math.round(z)}`) ?? BASE_HEIGHT + 1;
  }

  return { voxelMap, getSurfaceY, buildings: BUILDINGS, npcs: NPCS, docks: DOCKS, hubSize: HUB_SIZE };
}
