/**
 * Core game engine — bridges Jolly Pixel (rendering) with Koota (ECS state).
 */

import * as THREE from "three";
import { createWorld as createKootaWorld } from "koota";
import { Runtime, loadRuntime } from "@jolly-pixel/runtime";
import { VoxelRenderer } from "@jolly-pixel/voxel.renderer";
import { Behavior } from "@jolly-pixel/engine";

import {
  PlayerTag,
  Position,
  Velocity,
  Rotation,
  Health,
  Hunger,
  Stamina,
  PhysicsBody,
  MoveInput,
  PlayerState,
  Inventory,
  Hotbar,
  MiningState,
  QuestProgress,
  WorldTime,
  WorldSeed,
  ToolSwing,
} from "../ecs/traits/index.ts";

import {
  movementSystem,
  physicsSystem,
  survivalSystem,
  questSystem,
  timeSystem,
  enemySystem,
} from "../ecs/systems/index.ts";

import { createBlockDefinitions } from "../world/blocks.ts";
import { initNoise } from "../world/noise.ts";
import { registerVoxelAccessors } from "../world/voxel-helpers.ts";
import {
  generateChunkTerrain,
  generateSpawnShrine,
  findSurfaceY,
  CHUNK_SIZE,
  WORLD_HEIGHT,
} from "../world/terrain-generator.ts";
import { generateTilesetDataURL, TILE_SIZE, COLS, ROWS } from "../world/tileset-generator.ts";

export const kootaWorld = createKootaWorld();

const loadedChunks = new Set<string>();
const RENDER_DISTANCE = 3;

let jpRuntime: Runtime | null = null;
let voxelRenderer: VoxelRenderer | null = null;

// Direct Three.js references (set during init)
let threeScene: THREE.Scene | null = null;
let threeCamera: THREE.PerspectiveCamera | null = null;

// Track the last delta for the bridge
let lastDelta = 0;

class GameBridge extends Behavior {
  update() {
    // The Behavior's actor.world gives access to the JP World.
    // FixedTimeStep doesn't expose deltaTime directly, so we track it via clock.
    const now = performance.now();
    const dt = Math.min((now - (this as unknown as { _lastTime: number })._lastTime) / 1000, 0.1);
    (this as unknown as { _lastTime: number })._lastTime = now;
    if (dt <= 0) return;
    lastDelta = dt;

    movementSystem(kootaWorld, dt);
    physicsSystem(kootaWorld, dt);
    survivalSystem(kootaWorld, dt);
    questSystem(kootaWorld, dt);
    timeSystem(kootaWorld, dt);
    enemySystem(kootaWorld, dt);

    syncPlayerToCamera();
    streamChunks();
    syncEnvironment();
  }

  awake() {
    (this as unknown as { _lastTime: number })._lastTime = performance.now();
  }
}

function syncPlayerToCamera() {
  if (!threeCamera) return;

  kootaWorld
    .query(PlayerTag, Position, Rotation)
    .readEach(([pos, rot]) => {
      threeCamera!.position.set(pos.x, pos.y, pos.z);
      threeCamera!.rotation.order = "YXZ";
      threeCamera!.rotation.set(rot.pitch, rot.yaw, 0);
    });
}

function streamChunks() {
  if (!voxelRenderer) return;

  let px = 0, pz = 0;
  kootaWorld.query(PlayerTag, Position).readEach(([pos]) => {
    px = pos.x;
    pz = pos.z;
  });

  const pCx = Math.floor(px / CHUNK_SIZE);
  const pCz = Math.floor(pz / CHUNK_SIZE);

  for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
    for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
      const cx = pCx + dx;
      const cz = pCz + dz;
      const key = `${cx},${cz}`;
      if (!loadedChunks.has(key)) {
        loadedChunks.add(key);
        generateChunkTerrain(voxelRenderer!, "Ground", cx, cz);
      }
    }
  }
}

function syncEnvironment() {
  if (!threeScene) return;

  kootaWorld.query(WorldTime).readEach(([time]) => {
    const angle = time.timeOfDay * Math.PI * 2;
    const sunHeight = Math.sin(angle);

    let bgColor: number;
    let ambientIntensity: number;
    let sunIntensity: number;

    if (sunHeight > 0.4) {
      bgColor = 0x87ceeb;
      ambientIntensity = 0.35;
      sunIntensity = 1.2;
    } else if (sunHeight > 0) {
      bgColor = 0xff7e47;
      ambientIntensity = 0.2;
      sunIntensity = 0.5;
    } else {
      bgColor = 0x050510;
      ambientIntensity = 0.05;
      sunIntensity = 0;
    }

    threeScene!.traverse((child: THREE.Object3D) => {
      if ((child as THREE.AmbientLight).isAmbientLight) {
        (child as THREE.AmbientLight).intensity = ambientIntensity;
      }
      if ((child as THREE.DirectionalLight).isDirectionalLight) {
        (child as THREE.DirectionalLight).intensity = sunIntensity;
      }
    });

    if (threeScene!.background && (threeScene!.background as THREE.Color).isColor) {
      (threeScene!.background as THREE.Color).setHex(bgColor);
    }
    if (threeScene!.fog && (threeScene!.fog as THREE.Fog).color) {
      (threeScene!.fog as THREE.Fog).color.setHex(bgColor);
    }
  });
}

export async function initGame(canvas: HTMLCanvasElement, seed: string): Promise<void> {
  initNoise(seed);

  jpRuntime = new Runtime(canvas, {
    includePerformanceStats: false,
  });
  const jpWorld = jpRuntime.world;

  // Access the Three.js scene via sceneManager
  threeScene = jpWorld.sceneManager.default;
  threeScene.background = new THREE.Color(0x87ceeb);
  threeScene.fog = new THREE.Fog(0x87ceeb, 15, RENDER_DISTANCE * CHUNK_SIZE - 5);

  // Create and register the camera
  threeCamera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 100);
  jpWorld.renderer.addRenderComponent(threeCamera);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
  threeScene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffffee, 1.2);
  sunLight.position.set(50, 100, 50);
  sunLight.castShadow = true;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 150;
  sunLight.shadow.camera.left = -40;
  sunLight.shadow.camera.right = 40;
  sunLight.shadow.camera.top = 40;
  sunLight.shadow.camera.bottom = -40;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  threeScene.add(sunLight);
  threeScene.add(sunLight.target);

  // Stars
  const starGeo = new THREE.BufferGeometry();
  const starPos: number[] = [];
  for (let i = 0; i < 1500; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = 80;
    starPos.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0 })
  );
  threeScene.add(stars);

  // Voxel map
  const mapActor = jpWorld.createActor("VoxelMap");
  voxelRenderer = mapActor.addComponentAndGet(VoxelRenderer, {
    chunkSize: CHUNK_SIZE,
    layers: ["Ground"],
    blocks: createBlockDefinitions(),
    material: "lambert",
    alphaTest: 0.1,
  });

  const tilesetDataURL = generateTilesetDataURL();
  await voxelRenderer.loadTileset({
    id: "default",
    src: tilesetDataURL,
    tileSize: TILE_SIZE,
    cols: COLS,
    rows: ROWS,
  });

  registerVoxelAccessors(
    (x, y, z) => {
      if (y < 0 || y >= WORLD_HEIGHT) return 0;
      const entry = voxelRenderer!.getVoxel({ x, y, z });
      return entry ? entry.blockId : 0;
    },
    (layerName, x, y, z, blockId) => {
      if (blockId === 0) {
        voxelRenderer!.removeVoxel(layerName, { position: { x, y, z } });
      } else {
        voxelRenderer!.setVoxel(layerName, { position: { x, y, z }, blockId });
      }
    }
  );

  // Generate spawn
  generateChunkTerrain(voxelRenderer, "Ground", 0, 0);
  loadedChunks.add("0,0");

  const surfaceY = findSurfaceY(voxelRenderer, 8, 8);
  generateSpawnShrine(voxelRenderer, "Ground", surfaceY);

  const spawnY = surfaceY + 2.5;

  kootaWorld.spawn(
    PlayerTag,
    Position({ x: 8.5, y: spawnY, z: 8.5 }),
    Velocity,
    Rotation,
    Health,
    Hunger,
    Stamina,
    PhysicsBody,
    MoveInput,
    PlayerState({ isRunning: true, isDead: false, damageFlash: 0 }),
    Inventory,
    Hotbar,
    MiningState,
    QuestProgress,
    ToolSwing,
  );

  kootaWorld.spawn(
    WorldTime({ timeOfDay: 0.25, dayDuration: 240, dayCount: 1 }),
    WorldSeed({ seed }),
  );

  const bridgeActor = jpWorld.createActor("GameBridge");
  bridgeActor.addComponent(GameBridge);

  threeCamera.position.set(8.5, spawnY, 8.5);
  threeCamera.updateProjectionMatrix();

  // Handle resize
  const onResize = () => {
    if (!threeCamera) return;
    threeCamera.aspect = canvas.clientWidth / canvas.clientHeight;
    threeCamera.updateProjectionMatrix();
  };
  window.addEventListener("resize", onResize);

  await loadRuntime(jpRuntime, { loadingDelay: 300 });
}

export function getKootaWorld() {
  return kootaWorld;
}

export function getVoxelRenderer() {
  return voxelRenderer;
}

export function saveGameState(): string {
  const voxelData = voxelRenderer?.save();

  let playerData: Record<string, unknown> = {};
  kootaWorld
    .query(PlayerTag, Position, Health, Hunger, Stamina, Inventory, Hotbar, QuestProgress)
    .readEach(([pos, health, hunger, stamina, inv, hotbar, quest]) => {
      playerData = {
        position: { x: pos.x, y: pos.y, z: pos.z },
        health: health.current,
        hunger: hunger.current,
        stamina: stamina.current,
        inventory: { ...inv },
        hotbar: { slots: [...hotbar.slots], activeSlot: hotbar.activeSlot },
        quest: { step: quest.step, progress: quest.progress },
      };
    });

  let worldTimeData: Record<string, unknown> = {};
  kootaWorld.query(WorldTime, WorldSeed).readEach(([time, seedTrait]) => {
    worldTimeData = {
      timeOfDay: time.timeOfDay,
      dayCount: time.dayCount,
      seed: seedTrait.seed,
    };
  });

  return JSON.stringify({
    version: 1,
    voxelWorld: voxelData,
    player: playerData,
    worldTime: worldTimeData,
  });
}

export function destroyGame(): void {
  jpRuntime?.stop();
  jpRuntime = null;
  threeScene = null;
  threeCamera = null;
  voxelRenderer = null;
  loadedChunks.clear();
}
