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
import { initPlatform, hapticImpact, installGlobalErrorHandler } from './platform/CapacitorBridge.ts';

// Install global error handler FIRST — catches everything
installGlobalErrorHandler();
import { playSwordSwing, playHitImpact, playPlayerHurt, playEnemyDeath, playBossPhase, playVictory, startAmbient } from './audio/GameAudio.ts';
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

// --- Performance Scaling ---
// Adjust quality based on device capability
const pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
const webGLRenderer = (jpWorld.renderer as any).webGLRenderer as THREE.WebGLRenderer;
if (webGLRenderer) {
  webGLRenderer.setPixelRatio(pixelRatio);
}

// --- Scene Setup ---
const scene = jpWorld.sceneManager.getSource() as THREE.Scene;
scene.background = new THREE.Color('#87ceeb');
scene.fog = new THREE.FogExp2('#87ceeb', 0.015);

// --- Day/Night Cycle (replaces static lighting) ---
import { DayNightCycle } from './rendering/index.ts';

const dayNight = new DayNightCycle();
for (const obj of dayNight.sceneObjects) {
  scene.add(obj);
}
// Extra hemisphere light for even illumination (sky blue top, ground brown bottom)
const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x8b6914, 0.5);
scene.add(hemiLight);

// --- VoxelRenderer (terrain — uses JollyPixel's Actor + VoxelRenderer component) ---
// This is the CORRECT integration: VoxelRenderer as ActorComponent with Rapier config.
// VoxelColliderBuilder auto-generates compound box colliders for terrain chunks.
// Cast needed: VoxelRenderer expects engine@0.182's Actor type
const voxelMap = (jpWorld.createActor('terrain') as any)
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
(voxelMap as any).tilesetManager.registerTexture(
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

// --- Build a surface height lookup for placing entities on terrain ---
const surfaceHeight = new Map<string, number>();
for (let x = 0; x < ISLAND_SIZE; x++) {
  for (let z = 0; z < ISLAND_SIZE; z++) {
    for (let y = 20; y >= 0; y--) {
      const voxel = voxelMap.getVoxel('Ground', { x, y, z });
      if (voxel && voxel.blockId !== 4 && voxel.blockId !== 7) { // not water or leaves
        surfaceHeight.set(`${x},${z}`, y + 1); // stand on top
        break;
      }
    }
  }
}

function getSurfaceY(x: number, z: number): number {
  const ix = Math.round(x);
  const iz = Math.round(z);
  return surfaceHeight.get(`${ix},${iz}`) ?? BASE_HEIGHT + 1;
}

// --- Spawn Enemies (Yuka AI + Three.js meshes) ---
import { Vehicle, EntityManager as YukaEntityManager } from 'yuka';

const yukaManager = new YukaEntityManager();
const enemyMeshes: Array<{ mesh: THREE.Mesh; vehicle: Vehicle; health: number; attackCooldown: number }> = [];

const ENEMY_COUNT = 8;
const enemyGeom = new THREE.BoxGeometry(0.7, 1.4, 0.7);
const enemyMat = new THREE.MeshLambertMaterial({ color: 0xcc2222 });

const enemyPrng = new PRNG(terrainSeed + '-enemies');
for (let i = 0; i < ENEMY_COUNT; i++) {
  // Pick random position on the island (avoid edges and water)
  let ex: number, ez: number, ey: number;
  do {
    ex = 5 + Math.floor(enemyPrng.next() * (ISLAND_SIZE - 10));
    ez = 5 + Math.floor(enemyPrng.next() * (ISLAND_SIZE - 10));
    ey = getSurfaceY(ex, ez);
  } while (ey <= 3); // skip water-level positions

  // Three.js mesh
  const mesh = new THREE.Mesh(enemyGeom, enemyMat);
  mesh.position.set(ex + 0.5, ey + 0.7, ez + 0.5);
  mesh.castShadow = true;
  scene.add(mesh);

  // Yuka Vehicle for AI steering
  const vehicle = new Vehicle();
  vehicle.position.set(ex + 0.5, ey + 0.7, ez + 0.5);
  vehicle.maxSpeed = 2;
  vehicle.mass = 1;

  // Sync Yuka → Three.js mesh via render callback
  // Yuka's npm typings are incomplete — setRenderComponent exists on GameEntity
  (vehicle as any).setRenderComponent(mesh, (renderObj: THREE.Mesh) => {
    renderObj.position.set(vehicle.position.x, vehicle.position.y, vehicle.position.z);
  });

  yukaManager.add(vehicle);
  enemyMeshes.push({ mesh, vehicle, health: 30, attackCooldown: 1.5 });
}

console.log(`[Bok] Spawned ${ENEMY_COUNT} enemies on terrain`);

// --- Boss (Ancient Treant — larger, tougher, at far end of island) ---
const BOSS_POS = { x: ISLAND_SIZE - 8, z: ISLAND_SIZE - 8 };
const bossY = getSurfaceY(BOSS_POS.x, BOSS_POS.z);
const bossGeom = new THREE.BoxGeometry(1.5, 3.0, 1.5);
const bossMat = new THREE.MeshLambertMaterial({ color: 0x660033 });
const bossMesh = new THREE.Mesh(bossGeom, bossMat);
bossMesh.position.set(BOSS_POS.x, bossY + 1.5, BOSS_POS.z);
bossMesh.castShadow = true;
scene.add(bossMesh);

const bossVehicle = new Vehicle();
bossVehicle.position.set(BOSS_POS.x, bossY + 1.5, BOSS_POS.z);
bossVehicle.maxSpeed = 1.5;
bossVehicle.mass = 3;
(bossVehicle as any).setRenderComponent(bossMesh, (obj: THREE.Mesh) => {
  obj.position.set(bossVehicle.position.x, bossVehicle.position.y, bossVehicle.position.z);
});
yukaManager.add(bossVehicle);

const boss = {
  mesh: bossMesh,
  vehicle: bossVehicle,
  health: 150,
  maxHealth: 150,
  attackCooldown: 2.0,
  phase: 1,
  defeated: false,
};
// Boss also added to enemyMeshes for combat (higher HP, same attack logic)
enemyMeshes.push({ mesh: bossMesh, vehicle: bossVehicle, health: 150, attackCooldown: 2.0 });

// Add boss health bar to HUD
const bossHealthContainer = document.createElement('div');
bossHealthContainer.id = 'boss-health';
bossHealthContainer.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);display:none;z-index:101;pointer-events:none;text-align:center;';
const bossName = document.createElement('div');
bossName.textContent = 'Ancient Treant';
bossName.style.cssText = 'font-family:Georgia,serif;color:#fdf6e3;font-size:14px;text-shadow:0 1px 3px rgba(0,0,0,0.8);margin-bottom:4px;';
const bossTrack = document.createElement('div');
bossTrack.style.cssText = 'width:300px;height:10px;background:#3a2a1a;border-radius:3px;overflow:hidden;border:1px solid #8b5a2b;';
const bossFill = document.createElement('div');
bossFill.id = 'boss-health-fill';
bossFill.style.cssText = 'width:100%;height:100%;background:#8e24aa;transition:width 0.3s;';
bossTrack.appendChild(bossFill);
bossHealthContainer.append(bossName, bossTrack);
document.body.appendChild(bossHealthContainer);

console.log(`[Bok] Boss spawned at (${BOSS_POS.x}, ${bossY}, ${BOSS_POS.z})`);

// --- First-Person Camera (JollyPixel Camera3DControls) ---
// Camera3DControls is JollyPixel's built-in FPS camera with WASD + mouse look.
// It extends Behavior → registers as RenderComponent → ThreeRenderer renders from it.
// lookAround: 'left' means hold left mouse to look (we'll switch to pointer lock behavior).
import { Camera3DControls } from '@jolly-pixel/engine';

const cameraActor = jpWorld.createActor('camera');
const cameraCtrl = cameraActor.addComponentAndGet(Camera3DControls, {
  speed: 6,
  rotationSpeed: 0.003,
  bindings: {
    forward: 'ArrowUp',
    backward: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    lookAround: 'left',
  },
});
const camera = cameraCtrl.camera;
camera.position.set(ISLAND_SIZE / 2, BASE_HEIGHT + 3, ISLAND_SIZE / 2);

// --- Input System ---
const inputSystem = new InputSystem(canvas);

// --- Mobile Detection + Controls ---
import { MobileControls, isMobileDevice } from './input/MobileControls.ts';

const isMobile = isMobileDevice();
const mobileControls = isMobile ? new MobileControls() : null;

// Pointer lock for FPS camera (desktop only)
if (!isMobile) {
  canvas.addEventListener('click', () => {
    if (!document.pointerLockElement) {
      canvas.requestPointerLock();
    }
  });
}

// Camera rotation state
const cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const CAMERA_SENSITIVITY = 0.002;
const PLAYER_SPEED = 6;

// Combat state
let playerHealth = 100;

// --- Pause Menu ---
let paused = false;
function togglePause(): void {
  if (gameWorld.get(GamePhase)?.phase === 'dead') return;
  paused = !paused;
  const existing = document.getElementById('pause-menu');
  if (paused && !existing) {
    if (document.pointerLockElement) document.exitPointerLock();
    const overlay = document.createElement('div');
    overlay.id = 'pause-menu';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:250;display:flex;align-items:center;justify-content:center;background:rgba(10,10,10,0.7);';
    const panel = document.createElement('div');
    panel.style.cssText = 'background:#fdf6e3;border:3px solid #8b5a2b;border-radius:12px;padding:36px 48px;text-align:center;';
    const title = document.createElement('h2');
    title.textContent = 'PAUSED';
    title.style.cssText = 'font-family:Georgia,serif;font-size:32px;color:#2c1e16;margin:0 0 24px 0;';
    const resumeBtn = document.createElement('button');
    resumeBtn.textContent = 'Resume';
    resumeBtn.style.cssText = 'display:block;width:100%;padding:10px;margin-bottom:8px;border:2px solid #8b5a2b;border-radius:6px;background:#2c1e16;color:#fdf6e3;font-family:Georgia,serif;font-size:15px;cursor:pointer;pointer-events:auto;';
    resumeBtn.addEventListener('click', () => togglePause());
    const quitBtn = document.createElement('button');
    quitBtn.textContent = 'Quit to Menu';
    quitBtn.style.cssText = 'display:block;width:100%;padding:10px;border:2px solid #8b5a2b;border-radius:6px;background:#fef9ef;color:#2c1e16;font-family:Georgia,serif;font-size:15px;cursor:pointer;pointer-events:auto;';
    quitBtn.addEventListener('click', () => location.reload());
    panel.append(title, resumeBtn, quitBtn);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  } else if (!paused && existing) {
    existing.remove();
  }
}
document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') togglePause();
});
let playerAttacking = false;
let playerAttackCooldown = 0;
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0 && document.pointerLockElement) {
    playerAttacking = true;
  }
});

// --- Loot Drop System ---
interface LootDrop {
  mesh: THREE.Mesh;
  type: string;
  position: THREE.Vector3;
}
const lootDrops: LootDrop[] = [];
const lootGeom = new THREE.BoxGeometry(0.3, 0.3, 0.3);
const lootMats: Record<string, THREE.MeshLambertMaterial> = {
  'health-potion': new THREE.MeshLambertMaterial({ color: 0xff4444 }),
  'tome-page': new THREE.MeshLambertMaterial({ color: 0xffdd00 }),
};

function spawnLootDrop(pos: THREE.Vector3, type: string): void {
  const mat = lootMats[type] ?? lootMats['health-potion'];
  const mesh = new THREE.Mesh(lootGeom, mat);
  mesh.position.copy(pos);
  scene.add(mesh);
  lootDrops.push({ mesh, type, position: pos });
}

// Pickup detection + loot rotation runs in frame loop
function updateLoot(dt: number): void {
  for (let i = lootDrops.length - 1; i >= 0; i--) {
    const drop = lootDrops[i];
    // Spin the drop
    drop.mesh.rotation.y += dt * 3;
    drop.mesh.position.y = drop.position.y + Math.sin(Date.now() * 0.003) * 0.15;

    // Check player proximity for pickup
    const dx = camera.position.x - drop.mesh.position.x;
    const dz = camera.position.z - drop.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 1.5) {
      // Pickup!
      scene.remove(drop.mesh);
      lootDrops.splice(i, 1);
      if (drop.type === 'health-potion') {
        playerHealth = Math.min(100, playerHealth + 25);
        const fill = document.getElementById('health-fill');
        const text = document.getElementById('health-text');
        if (fill) fill.style.width = `${playerHealth}%`;
        if (text) text.textContent = `${playerHealth} / 100`;
      }
      // Brief pickup flash
      const flash = document.createElement('div');
      flash.textContent = drop.type === 'health-potion' ? '+25 HP' : 'Tome Page!';
      flash.style.cssText = 'position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);font-family:Georgia,serif;font-size:20px;color:#fdf6e3;text-shadow:0 2px 4px rgba(0,0,0,0.8);z-index:150;pointer-events:none;transition:opacity 0.8s,transform 0.8s;';
      document.body.appendChild(flash);
      requestAnimationFrame(() => {
        flash.style.opacity = '0';
        flash.style.transform = 'translate(-50%, -80%)';
      });
      setTimeout(() => flash.remove(), 800);
    }
  }
}

// --- Physics: step Rapier on JollyPixel's fixed update ---
(jpWorld as any).on('beforeFixedUpdate', () => {
  rapierWorld.step();
});

// --- Frame Loop (wired into JollyPixel's beforeUpdate) ---
// beforeUpdate emits [dt: number] — delta time in seconds
(jpWorld as any).on('beforeUpdate', (rawDt: number) => {
  if (paused || gameWorld.get(GamePhase)?.phase === 'dead') return;
  const dt = Math.min(rawDt, MAX_DELTA);

  // Update Koota time
  const prevTime = gameWorld.get(Time);
  gameWorld.set(Time, {
    delta: dt,
    elapsed: (prevTime?.elapsed ?? 0) + dt,
  });

  // Poll input
  inputSystem.update(gameWorld);

  // Yuka AI update — moves enemy vehicles, syncs to meshes
  yukaManager.update(dt);

  // Make enemies wander toward player when close
  for (const { vehicle } of enemyMeshes) {
    const dx = camera.position.x - vehicle.position.x;
    const dz = camera.position.z - vehicle.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 15 && dist > 1.5) {
      // Chase player
      vehicle.velocity.set(dx / dist * 2, 0, dz / dist * 2);
    } else if (dist >= 15) {
      // Wander randomly
      vehicle.velocity.set(
        (Math.random() - 0.5) * 0.5,
        0,
        (Math.random() - 0.5) * 0.5,
      );
    } else {
      // In attack range — stop
      vehicle.velocity.set(0, 0, 0);
    }
  }

  // Camera look — desktop: mouse delta; mobile: touch swipe
  if (mobileControls) {
    const touchLook = mobileControls.consumeLookDelta();
    if (touchLook.x !== 0 || touchLook.y !== 0) {
      cameraEuler.y -= touchLook.x * CAMERA_SENSITIVITY * 0.5;
      cameraEuler.x -= touchLook.y * CAMERA_SENSITIVITY * 0.5;
      const maxPitch = Math.PI / 2 - 0.01;
      cameraEuler.x = Math.max(-maxPitch, Math.min(maxPitch, cameraEuler.x));
      camera.quaternion.setFromEuler(cameraEuler);
    }
  } else {
    const look = gameWorld.get(LookIntent);
    if (look && document.pointerLockElement) {
      cameraEuler.y -= look.deltaX * CAMERA_SENSITIVITY;
      cameraEuler.x -= look.deltaY * CAMERA_SENSITIVITY;
      const maxPitch = Math.PI / 2 - 0.01;
      cameraEuler.x = Math.max(-maxPitch, Math.min(maxPitch, cameraEuler.x));
      camera.quaternion.setFromEuler(cameraEuler);
    }
  }

  // Player movement — desktop: WASD; mobile: virtual joystick
  let dirX = 0, dirZ = 0, sprinting = false;
  if (mobileControls) {
    dirX = mobileControls.state.moveX;
    dirZ = mobileControls.state.moveZ;
  } else {
    const move = gameWorld.get(MovementIntent);
    if (move) {
      dirX = move.dirX;
      dirZ = move.dirZ;
      sprinting = move.sprint;
    }
  }
  if (dirX !== 0 || dirZ !== 0) {
    const speed = sprinting ? PLAYER_SPEED * 1.6 : PLAYER_SPEED;
    const yaw = cameraEuler.y;
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const worldX = dirX * cosYaw - dirZ * sinYaw;
    const worldZ = dirX * sinYaw + dirZ * cosYaw;

    const newX = camera.position.x + worldX * speed * dt;
    const newZ = camera.position.z + worldZ * speed * dt;

    // Auto-platforming: check terrain height at new position
    const targetY = getSurfaceY(Math.round(newX), Math.round(newZ));
    const currentY = camera.position.y - 1.6; // eye height offset
    const heightDiff = targetY - currentY;

    if (heightDiff <= 1.1 && heightDiff >= -3) {
      // Can walk up 1 block or down 3 — auto-step
      camera.position.x = newX;
      camera.position.z = newZ;

      // Smooth vertical lerp for stepping feel
      const targetEye = targetY + 1.6;
      if (Math.abs(camera.position.y - targetEye) > 0.05) {
        camera.position.y += (targetEye - camera.position.y) * Math.min(1, dt * 12);
        // Head bob on step
        if (heightDiff > 0.3) {
          camera.position.y += Math.sin(Date.now() * 0.02) * 0.03;
        }
      }
    }
    // else: blocked by terrain — don't move (wall collision)
  } else {
    // When standing still, settle to terrain height
    const standY = getSurfaceY(Math.round(camera.position.x), Math.round(camera.position.z));
    const targetEye = standY + 1.6;
    if (Math.abs(camera.position.y - targetEye) > 0.05) {
      camera.position.y += (targetEye - camera.position.y) * Math.min(1, dt * 8);
    }
  }

  // Mobile attack/dodge
  if (mobileControls) {
    if (mobileControls.consumeAttack()) playerAttacking = true;
  }

  // --- Loot update (spin + pickup detection) ---
  updateLoot(dt);

  // --- Day/Night Cycle update ---
  dayNight.update(dt);
  (scene.background as THREE.Color)?.copy(dayNight.skyColor);
  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.color.copy(dayNight.skyColor);
  }

  // --- Combat (contextual — proximity triggers attack) ---
  // Auto-attack nearest enemy when very close (contact combat)
  // Also supports manual click for ranged engagement
  const ATTACK_RANGE = 2.5;
  const CONTACT_RANGE = 1.8;
  const PLAYER_DAMAGE = 15;

  // Attack cooldown
  playerAttackCooldown = Math.max(0, playerAttackCooldown - dt);

  // Check for contact combat (auto-attack on proximity)
  if (gameWorld.get(GamePhase)?.phase === 'playing' && !playerAttacking && playerAttackCooldown <= 0) {
    for (const em of enemyMeshes) {
      const cdx = camera.position.x - em.mesh.position.x;
      const cdz = camera.position.z - em.mesh.position.z;
      const cDist = Math.sqrt(cdx * cdx + cdz * cdz);
      if (cDist < CONTACT_RANGE) {
        playerAttacking = true; // Trigger auto-attack
        break;
      }
    }
  }

  if (playerAttacking && gameWorld.get(GamePhase)?.phase === 'playing' && playerAttackCooldown <= 0) {
    playerAttacking = false;
    playerAttackCooldown = 0.4; // 0.4s between attacks

    let closestIdx = -1;
    let closestDist = ATTACK_RANGE;
    for (let i = 0; i < enemyMeshes.length; i++) {
      const em = enemyMeshes[i];
      const edx = camera.position.x - em.mesh.position.x;
      const edz = camera.position.z - em.mesh.position.z;
      const eDist = Math.sqrt(edx * edx + edz * edz);
      if (eDist < closestDist) {
        closestDist = eDist;
        closestIdx = i;
      }
    }

    playSwordSwing();
    if (closestIdx >= 0) {
      const target = enemyMeshes[closestIdx];
      target.health -= PLAYER_DAMAGE;
      playHitImpact();
      hapticImpact('medium'); // Native haptic on combat hit
      // Flash enemy red-white on hit
      (target.mesh.material as THREE.MeshLambertMaterial).color.setHex(0xffffff);
      setTimeout(() => {
        if (target.mesh.parent) {
          (target.mesh.material as THREE.MeshLambertMaterial).color.setHex(0xcc2222);
        }
      }, 100);

      if (target.health <= 0) {
        const isBoss = target.mesh === bossMesh;
        // Enemy dies — remove from scene
        scene.remove(target.mesh);
        yukaManager.remove(target.vehicle);
        enemyMeshes.splice(closestIdx, 1);
        // Update HUD
        const countEl = document.getElementById('enemy-count-line');
        if (countEl) countEl.textContent = `Enemies: ${enemyMeshes.length}`;

        playEnemyDeath();
        // Drop loot at enemy position
        const dropPos = target.mesh.position.clone();
        dropPos.y += 0.3;
        spawnLootDrop(dropPos, isBoss ? 'tome-page' : 'health-potion');

        if (isBoss && !boss.defeated) {
          boss.defeated = true;
          playVictory();
          const bossHpEl = document.getElementById('boss-health');
          if (bossHpEl) bossHpEl.style.display = 'none';
          // Victory screen
          gameWorld.set(GamePhase, { phase: 'victory' });
          const victoryScreen = document.createElement('div');
          victoryScreen.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:300;display:flex;align-items:center;justify-content:center;background:rgba(10,10,10,0.85);';
          const vPanel = document.createElement('div');
          vPanel.style.cssText = 'background:#fdf6e3;border:3px solid #8b5a2b;border-radius:12px;padding:48px;text-align:center;';
          const vTitle = document.createElement('h1');
          vTitle.textContent = 'A NEW PAGE IS WRITTEN';
          vTitle.style.cssText = 'font-family:Georgia,serif;font-size:32px;color:#2c1e16;margin:0 0 8px 0;';
          const vSub = document.createElement('div');
          vSub.textContent = 'You have unlocked: Dash';
          vSub.style.cssText = 'font-family:Georgia,serif;font-size:16px;color:#8b5a2b;margin-bottom:8px;font-style:italic;';
          const vDesc = document.createElement('div');
          vDesc.textContent = 'The Ancient Treant falls. A new ability inscribes itself into your Tome.';
          vDesc.style.cssText = 'font-family:Georgia,serif;font-size:13px;color:#2c1e16;margin-bottom:24px;';
          const vBtn = document.createElement('button');
          vBtn.textContent = 'CONTINUE';
          vBtn.style.cssText = 'padding:12px 32px;border:2px solid #8b5a2b;border-radius:6px;background:#2c1e16;color:#fdf6e3;font-family:Georgia,serif;font-size:16px;cursor:pointer;pointer-events:auto;';
          vBtn.addEventListener('click', () => location.reload());
          vPanel.append(vTitle, vSub, vDesc, vBtn);
          victoryScreen.appendChild(vPanel);
          document.body.appendChild(victoryScreen);
        }
      }
    }
  }

  // Boss proximity — show health bar when close
  if (!boss.defeated) {
    const bdx = camera.position.x - bossMesh.position.x;
    const bdz = camera.position.z - bossMesh.position.z;
    const bDist = Math.sqrt(bdx * bdx + bdz * bdz);
    const bossHpEl = document.getElementById('boss-health');
    if (bDist < 20) {
      if (bossHpEl) bossHpEl.style.display = '';
      // Find boss in enemyMeshes to read health
      const bossEntry = enemyMeshes.find(e => e.mesh === bossMesh);
      if (bossEntry) {
        const pct = Math.max(0, bossEntry.health / boss.maxHealth) * 100;
        const fillEl = document.getElementById('boss-health-fill');
        if (fillEl) fillEl.style.width = `${pct}%`;
        // Phase transitions
        if (pct <= 66 && boss.phase === 1) {
          boss.phase = 2;
          playBossPhase();
          (bossMesh.material as THREE.MeshLambertMaterial).color.setHex(0x990044);
          bossVehicle.maxSpeed = 2.5; // Faster in phase 2
        }
        if (pct <= 33 && boss.phase === 2) {
          boss.phase = 3;
          playBossPhase();
          (bossMesh.material as THREE.MeshLambertMaterial).color.setHex(0xcc0033);
          bossVehicle.maxSpeed = 3.5; // Even faster in phase 3
        }
      }
    } else if (bossHpEl) {
      bossHpEl.style.display = 'none';
    }
  }

  // Enemies attack player when in range
  for (const enemy of enemyMeshes) {
    const edx = camera.position.x - enemy.mesh.position.x;
    const edz = camera.position.z - enemy.mesh.position.z;
    const eDist = Math.sqrt(edx * edx + edz * edz);
    if (eDist < 1.8) {
      enemy.attackCooldown -= dt;
      if (enemy.attackCooldown <= 0) {
        enemy.attackCooldown = 1.5; // Attack every 1.5s
        playerHealth = Math.max(0, playerHealth - 10);
        playPlayerHurt();
        hapticImpact('heavy'); // Heavy haptic on taking damage
        // Update health bar
        const fill = document.getElementById('health-fill');
        const text = document.getElementById('health-text');
        if (fill) fill.style.width = `${(playerHealth / 100) * 100}%`;
        if (text) text.textContent = `${playerHealth} / 100`;
        // Damage flash
        const flashEl = document.createElement('div');
        flashEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(200,0,0,0.3);pointer-events:none;z-index:150;transition:opacity 0.3s;';
        document.body.appendChild(flashEl);
        setTimeout(() => { flashEl.style.opacity = '0'; }, 50);
        setTimeout(() => { flashEl.remove(); }, 350);

        if (playerHealth <= 0) {
          // Player death
          gameWorld.set(GamePhase, { phase: 'dead' });
          const deathScreen = document.createElement('div');
          deathScreen.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:300;display:flex;align-items:center;justify-content:center;background:rgba(10,10,10,0.9);';
          const deathPanel = document.createElement('div');
          deathPanel.style.cssText = 'background:#fdf6e3;border:3px solid #8b5a2b;border-radius:12px;padding:48px;text-align:center;';
          const deathTitle = document.createElement('h1');
          deathTitle.textContent = 'THE CHAPTER ENDS';
          deathTitle.style.cssText = 'font-family:Georgia,serif;font-size:36px;color:#2c1e16;margin:0 0 16px 0;';
          const deathSub = document.createElement('div');
          deathSub.textContent = 'The ink fades, but the story can be rewritten.';
          deathSub.style.cssText = 'font-family:Georgia,serif;font-size:14px;color:#8b5a2b;margin-bottom:24px;font-style:italic;';
          const restartBtn = document.createElement('button');
          restartBtn.textContent = 'TURN THE PAGE';
          restartBtn.style.cssText = 'padding:12px 32px;border:2px solid #8b5a2b;border-radius:6px;background:#2c1e16;color:#fdf6e3;font-family:Georgia,serif;font-size:16px;cursor:pointer;pointer-events:auto;';
          restartBtn.addEventListener('click', () => { location.reload(); });
          deathPanel.append(deathTitle, deathSub, restartBtn);
          deathScreen.appendChild(deathPanel);
          document.body.appendChild(deathScreen);
        }
      }
    }
  }
});

// --- HUD Overlay (safe DOM construction — no innerHTML) ---
function createHUD(): void {
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:100;';

  // Health bar
  const healthBox = document.createElement('div');
  healthBox.style.cssText = 'position:absolute;top:16px;left:16px;background:rgba(253,246,227,0.85);border:2px solid #8b5a2b;border-radius:6px;padding:8px 14px;font-family:Georgia,serif;color:#2c1e16;';
  const healthLabel = document.createElement('div');
  healthLabel.textContent = 'Health';
  healthLabel.style.cssText = 'font-size:12px;margin-bottom:4px;';
  const healthTrack = document.createElement('div');
  healthTrack.style.cssText = 'width:150px;height:14px;background:#3a2a1a;border-radius:3px;overflow:hidden;';
  const healthFill = document.createElement('div');
  healthFill.id = 'health-fill';
  healthFill.style.cssText = 'width:100%;height:100%;background:#c0392b;transition:width 0.3s;';
  healthTrack.appendChild(healthFill);
  const healthText = document.createElement('div');
  healthText.id = 'health-text';
  healthText.textContent = '100 / 100';
  healthText.style.cssText = 'font-size:11px;margin-top:2px;';
  healthBox.append(healthLabel, healthTrack, healthText);

  // Crosshair
  const crosshair = document.createElement('div');
  crosshair.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:4px;height:4px;background:white;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.5);';

  // Hotbar
  const hotbar = document.createElement('div');
  hotbar.style.cssText = 'position:absolute;bottom:16px;left:50%;transform:translateX(-50%);display:flex;gap:4px;';
  for (let i = 1; i <= 5; i++) {
    const slot = document.createElement('div');
    slot.style.cssText = `width:48px;height:48px;border:2px solid ${i===1?'#fdf6e3':'#8b5a2b'};background:rgba(253,246,227,${i===1?'0.9':'0.6'});border-radius:4px;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;color:#2c1e16;font-size:11px;`;
    if (i === 1) slot.textContent = 'Sword';
    hotbar.appendChild(slot);
  }

  // Info panel
  const info = document.createElement('div');
  info.style.cssText = 'position:absolute;top:16px;right:16px;background:rgba(253,246,227,0.85);border:2px solid #8b5a2b;border-radius:6px;padding:8px 14px;font-family:Georgia,serif;color:#2c1e16;font-size:12px;';
  const enemyLine = document.createElement('div');
  enemyLine.textContent = 'Enemies: 8';
  enemyLine.id = 'enemy-count-line';
  const biomeLine = document.createElement('div');
  biomeLine.textContent = 'Biome: Forest';
  info.append(enemyLine, biomeLine);

  hud.append(healthBox, crosshair, hotbar, info);
  document.body.appendChild(hud);
}
createHUD();

// --- Main Menu (safe DOM construction) ---
function createMainMenu(): void {
  const menu = document.createElement('div');
  menu.id = 'main-menu';
  menu.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(10,10,10,0.85);';

  const panel = document.createElement('div');
  panel.style.cssText = 'background:#fdf6e3;border:3px solid #8b5a2b;border-radius:12px;padding:48px 64px;text-align:center;max-width:420px;box-shadow:0 8px 32px rgba(0,0,0,0.5);';

  const title = document.createElement('h1');
  title.textContent = 'BOK';
  title.style.cssText = 'font-family:Georgia,serif;font-size:64px;color:#2c1e16;margin:0 0 4px 0;letter-spacing:8px;';

  const subtitle = document.createElement('div');
  subtitle.textContent = 'The Builder\'s Tome';
  subtitle.style.cssText = 'font-family:Georgia,serif;font-size:18px;color:#8b5a2b;margin:0 0 32px 0;font-style:italic;';

  // Biome selector
  const biomeLabel = document.createElement('label');
  biomeLabel.textContent = 'Choose Your Island';
  biomeLabel.style.cssText = 'display:block;font-family:Georgia,serif;font-size:13px;color:#2c1e16;margin-bottom:6px;';
  const biomeSelect = document.createElement('select');
  biomeSelect.style.cssText = 'width:100%;padding:8px 12px;border:2px solid #8b5a2b;border-radius:6px;background:#fef9ef;font-family:Georgia,serif;font-size:14px;color:#2c1e16;margin-bottom:16px;outline:none;cursor:pointer;';
  const biomes = [
    { id: 'forest', name: 'Whispering Woods', sky: '#87CEEB' },
    { id: 'desert', name: 'Sunscorched Dunes', sky: '#F4D03F' },
    { id: 'tundra', name: 'Frostbite Expanse', sky: '#B3CDE0' },
    { id: 'volcanic', name: 'Cinderpeak Caldera', sky: '#CC4125' },
    { id: 'swamp', name: 'Rothollow Marsh', sky: '#6B8E5E' },
    { id: 'crystal', name: 'Prismatic Depths', sky: '#9B59B6' },
    { id: 'sky', name: 'Stormspire Remnants', sky: '#AED6F1' },
    { id: 'ocean', name: 'Abyssal Trench', sky: '#1A5276' },
  ];
  for (const b of biomes) {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = b.name;
    biomeSelect.appendChild(opt);
  }

  const seedLabel = document.createElement('label');
  seedLabel.textContent = 'World Seed';
  seedLabel.style.cssText = 'display:block;font-family:Georgia,serif;font-size:13px;color:#2c1e16;margin-bottom:6px;';

  const seedInput = document.createElement('input');
  seedInput.type = 'text';
  seedInput.value = 'Brave Dark Fox';
  seedInput.placeholder = 'Enter a seed...';
  seedInput.style.cssText = 'width:100%;padding:10px 14px;border:2px solid #8b5a2b;border-radius:6px;background:#fef9ef;font-family:Georgia,serif;font-size:15px;color:#2c1e16;box-sizing:border-box;text-align:center;margin-bottom:24px;outline:none;';

  const startBtn = document.createElement('button');
  startBtn.textContent = 'OPEN THE BOOK';
  startBtn.style.cssText = 'width:100%;padding:14px;border:2px solid #8b5a2b;border-radius:6px;background:#2c1e16;color:#fdf6e3;font-family:Georgia,serif;font-size:18px;cursor:pointer;letter-spacing:2px;transition:background 0.2s;pointer-events:auto;';
  startBtn.addEventListener('mouseenter', () => { startBtn.style.background = '#4a3728'; });
  startBtn.addEventListener('mouseleave', () => { startBtn.style.background = '#2c1e16'; });
  startBtn.addEventListener('click', () => {
    menu.remove();
    // Show HUD
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = '';
    gameWorld.set(GamePhase, { phase: 'playing' });
    if (mobileControls) mobileControls.show();
    startAmbient();
    // Apply biome sky color
    const selectedBiome = biomes.find(b => b.id === biomeSelect.value);
    if (selectedBiome) {
      (scene.background as THREE.Color).set(selectedBiome.sky);
      if (scene.fog instanceof THREE.FogExp2) scene.fog.color.set(selectedBiome.sky);
      // Update biome display in HUD
      const bioLine = document.querySelector('#hud-info div:last-child') as HTMLDivElement | null;
      if (bioLine) bioLine.textContent = `Biome: ${selectedBiome.name}`;
    }
    console.log('[Bok] Game started — biome:', biomeSelect.value, 'seed:', seedInput.value);
  });

  const hint = document.createElement('div');
  hint.textContent = isMobile
    ? 'Left joystick to move · Swipe right side to look · Tap Attack to fight'
    : 'WASD to move · Hold left-click to look · Arrow keys also work';
  hint.style.cssText = 'font-family:Georgia,serif;font-size:11px;color:#8b5a2b;margin-top:16px;';

  panel.append(title, subtitle, biomeLabel, biomeSelect, seedLabel, seedInput, startBtn, hint);
  menu.appendChild(panel);
  document.body.appendChild(menu);
}

// Hide HUD until game starts
const hudEl = document.getElementById('hud');
if (hudEl) hudEl.style.display = 'none';
createMainMenu();

// --- Boot ---
console.log('[Bok] Loading runtime...');

// Init Capacitor platform (status bar, orientation, wake lock)
initPlatform();

loadRuntime(runtime)
  .then(() => {
    console.log('[Bok] Runtime loaded — voxel terrain rendered');
  })
  .catch((error) => {
    // Don't swallow — global error handler will show the modal
    throw error;
  });

// Expose to window for debug panel
(window as any)._bokJPWorld = jpWorld;
(window as any)._bokCamera = camera;
(window as any)._bokVoxelMap = voxelMap;
(window as any)._bokRapier = rapierWorld;
(window as any)._bokGameWorld = gameWorld;

export { gameWorld, runtime, rapierWorld, voxelMap, content };
