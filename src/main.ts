/**
 * Bok: The Builder's Tome — Main Entry Point
 *
 * Bootstraps JollyPixel Runtime, creates Koota world, registers scenes,
 * and wires the game loop. Uses JollyPixel APIs properly — not raw Three.js.
 */
import RAPIER from '@dimforge/rapier3d';
import { Runtime, loadRuntime } from '@jolly-pixel/runtime';
import { VoxelRenderer, Face, type BlockDefinition, type TileRef } from '@jolly-pixel/voxel.renderer';
import { generateTileset, TILES } from './rendering/TilesetGenerator.ts';
import { createWorld } from 'koota';
import * as THREE from 'three';

import {
  Time, GamePhase, MovementIntent, LookIntent, IslandState,
} from './traits/index.ts';
import { MAX_DELTA } from './shared/index.ts';
import { InputSystem } from './input/index.ts';
import { ContentRegistry } from './content/index.ts';

// --- Canvas ---
const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvas) throw new Error('Canvas element not found');

// --- Koota World (single source of truth for game state) ---
const gameWorld = createWorld(Time, GamePhase, MovementIntent, LookIntent, IslandState);

// --- Content Registry (Zod-validated JSON configs) ---
const content = new ContentRegistry();

// --- Rapier Physics World ---
// Rapier 0.19+ loads WASM via static import — no init() needed with Vite
const rapierWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

// --- JollyPixel Runtime (owns render loop, scene graph, renderer) ---
const runtime = new Runtime(canvas, {
  includePerformanceStats: import.meta.env.DEV,
});
const { world: jpWorld } = runtime;

// --- Block Definitions (using programmatic game tileset) ---
const blockDefs: BlockDefinition[] = [
  {
    id: 1,
    name: 'Grass',
    shapeId: 'cube',
    collidable: true,
    faceTextures: {
      [Face.PosY]: TILES.GRASS_TOP as TileRef,
      [Face.NegY]: TILES.DIRT as TileRef,
    },
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
    faceTextures: {
      [Face.PosY]: TILES.WOOD_TOP as TileRef,
      [Face.NegY]: TILES.WOOD_TOP as TileRef,
    },
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
];

// --- Scene Setup ---
const scene = jpWorld.sceneManager.getSource() as THREE.Scene;
scene.background = new THREE.Color('#87ceeb');
scene.fog = new THREE.FogExp2('#87ceeb', 0.015);

// Lighting
const ambientLight = new THREE.AmbientLight('#ffffff', 0.6);
const dirLight = new THREE.DirectionalLight('#ffffff', 1.2);
dirLight.position.set(32, 48, 32);
dirLight.castShadow = true;
scene.add(ambientLight, dirLight);

// --- VoxelRenderer (terrain — uses JollyPixel's Actor + VoxelRenderer component) ---
// This is the CORRECT integration: VoxelRenderer as ActorComponent with Rapier config.
// VoxelColliderBuilder auto-generates compound box colliders for terrain chunks.
const voxelMap = jpWorld.createActor('terrain')
  .addComponentAndGet(VoxelRenderer, {
    chunkSize: 16,
    layers: ['Ground'],
    blocks: blockDefs,
    alphaTest: 0.5,
    material: 'lambert',
    rapier: {
      api: RAPIER as never,
      world: rapierWorld as never,
    },
  });

// Generate and load programmatic tileset (bright game-ready colors)
const tileset = generateTileset();
// Register the generated texture directly with TilesetManager
const tilesetTexture = new THREE.Texture(tileset.canvas);
tilesetTexture.magFilter = THREE.NearestFilter;
tilesetTexture.minFilter = THREE.NearestFilter;
tilesetTexture.needsUpdate = true;
voxelMap.tilesetManager.registerTexture(
  { id: 'game', src: tileset.dataUrl, tileSize: 32, cols: 3, rows: 3 },
  tilesetTexture as any,
);

// --- Generate Terrain ---
// Simple procedural terrain: noise-based heightmap using our PRNG + SimplexNoise
import { PRNG, SimplexNoise } from './generation/index.ts';

const terrainSeed = 'bok-forest-demo';
const prng = new PRNG(terrainSeed);
const noise = new SimplexNoise(prng);
const ISLAND_SIZE = 48;
const BASE_HEIGHT = 4;
const NOISE_AMP = 6;

for (let x = 0; x < ISLAND_SIZE; x++) {
  for (let z = 0; z < ISLAND_SIZE; z++) {
    // Island falloff: blocks near edges are lower
    const dx = (x - ISLAND_SIZE / 2) / (ISLAND_SIZE / 2);
    const dz = (z - ISLAND_SIZE / 2) / (ISLAND_SIZE / 2);
    const falloff = 1 - Math.sqrt(dx * dx + dz * dz);
    if (falloff <= 0) continue;

    const noiseVal = noise.noise2D(x * 0.05, z * 0.05);
    const height = Math.floor(BASE_HEIGHT + noiseVal * NOISE_AMP * falloff);

    for (let y = 0; y <= height; y++) {
      let blockId: number;
      if (y === height) {
        blockId = height <= 2 ? 5 : 1; // Sand at low elevation, grass otherwise
      } else if (y >= height - 2) {
        blockId = 2; // Dirt
      } else {
        blockId = 3; // Stone
      }
      voxelMap.setVoxel('Ground', { position: { x, y, z }, blockId });
    }

    // Water fills up to level 2
    if (height < 2) {
      for (let y = height + 1; y <= 2; y++) {
        voxelMap.setVoxel('Ground', { position: { x, y, z }, blockId: 4 });
      }
    }

    // Simple trees: place wood + leaves on grass blocks
    if (height > 3 && prng.next() > 0.95 && falloff > 0.3) {
      const treeHeight = 3 + Math.floor(prng.next() * 3);
      for (let ty = 1; ty <= treeHeight; ty++) {
        voxelMap.setVoxel('Ground', { position: { x, y: height + ty, z }, blockId: 6 }); // Wood trunk
      }
      // Leaf canopy
      for (let lx = -2; lx <= 2; lx++) {
        for (let lz = -2; lz <= 2; lz++) {
          for (let ly = 0; ly <= 2; ly++) {
            if (Math.abs(lx) + Math.abs(lz) + ly <= 3 && (lx !== 0 || lz !== 0 || ly > 0)) {
              const leafX = x + lx;
              const leafZ = z + lz;
              const leafY = height + treeHeight + ly;
              if (leafX >= 0 && leafX < ISLAND_SIZE && leafZ >= 0 && leafZ < ISLAND_SIZE) {
                voxelMap.setVoxel('Ground', { position: { x: leafX, y: leafY, z: leafZ }, blockId: 7 });
              }
            }
          }
        }
      }
    }
  }
}

// --- First-Person Camera (JollyPixel CameraComponent) ---
// Camera3DControls creates a CameraComponent which registers itself
// with ThreeRenderer as a RenderComponent. This is what makes the
// renderer actually render from this camera's viewpoint.
import { Camera3DControls } from '@jolly-pixel/engine';

const cameraActor = jpWorld.createActor('camera');
const cameraControls = cameraActor.addComponentAndGet(Camera3DControls);
cameraControls.camera.position.set(ISLAND_SIZE / 2, BASE_HEIGHT + 8, ISLAND_SIZE / 2 + 15);
cameraControls.camera.lookAt(ISLAND_SIZE / 2, BASE_HEIGHT, ISLAND_SIZE / 2);
const camera = cameraControls.camera;

// --- Input System ---
const inputSystem = new InputSystem(canvas);

// Pointer lock for FPS camera
canvas.addEventListener('click', () => {
  if (!document.pointerLockElement) {
    canvas.requestPointerLock();
  }
});

// Camera rotation state
const cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const CAMERA_SENSITIVITY = 0.002;
const PLAYER_SPEED = 6;

// --- Physics: step Rapier on JollyPixel's fixed update ---
(jpWorld as any).on('beforeFixedUpdate', () => {
  rapierWorld.step();
});

// --- Frame Loop (wired into JollyPixel's beforeUpdate) ---
// beforeUpdate emits [dt: number] — delta time in seconds
(jpWorld as any).on('beforeUpdate', (rawDt: number) => {
  const dt = Math.min(rawDt, MAX_DELTA);

  // Update Koota time
  const prevTime = gameWorld.get(Time);
  gameWorld.set(Time, {
    delta: dt,
    elapsed: (prevTime?.elapsed ?? 0) + dt,
  });

  // Poll input
  inputSystem.update(gameWorld);

  // Camera look (mouse delta)
  const look = gameWorld.get(LookIntent);
  if (look && document.pointerLockElement) {
    cameraEuler.y -= look.deltaX * CAMERA_SENSITIVITY;
    cameraEuler.x -= look.deltaY * CAMERA_SENSITIVITY;
    const maxPitch = Math.PI / 2 - 0.01;
    cameraEuler.x = Math.max(-maxPitch, Math.min(maxPitch, cameraEuler.x));
    camera.quaternion.setFromEuler(cameraEuler);
  }

  // Player movement (camera-relative WASD)
  const move = gameWorld.get(MovementIntent);
  if (move) {
    const speed = move.sprint ? PLAYER_SPEED * 1.6 : PLAYER_SPEED;
    const yaw = cameraEuler.y;
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const worldX = move.dirX * cosYaw - move.dirZ * sinYaw;
    const worldZ = move.dirX * sinYaw + move.dirZ * cosYaw;

    camera.position.x += worldX * speed * dt;
    camera.position.z += worldZ * speed * dt;
  }
});

// --- Boot ---
console.log('[Bok] Loading runtime...');
loadRuntime(runtime)
  .then(() => {
    console.log('[Bok] Runtime loaded — voxel terrain rendered');
    gameWorld.set(GamePhase, { phase: 'playing' });
  })
  .catch((error) => {
    console.error('[Bok] Failed to load runtime:', error);
  });

// Expose to window for debug panel
(window as any)._bokJPWorld = jpWorld;
(window as any)._bokCamera = camera;
(window as any)._bokVoxelMap = voxelMap;
(window as any)._bokRapier = rapierWorld;
(window as any)._bokGameWorld = gameWorld;

export { gameWorld, runtime, rapierWorld, voxelMap, content };
