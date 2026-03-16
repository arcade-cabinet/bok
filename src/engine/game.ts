/**
 * Core game engine — bridges Jolly Pixel (rendering + Actors) with Koota (ECS state).
 *
 * All 3D scene objects are managed as Jolly Pixel Actors with Behaviors:
 *  - GameBridge: runs Koota systems, syncs state to camera + behaviors
 *  - CelestialBehavior: sun/moon orbit, sky color, stars
 *  - ViewModelBehavior: first-person held item with sway/bob/swing
 *  - BlockHighlightBehavior: wireframe on targeted block + raycasting
 *  - ParticlesBehavior: instanced mesh particles for mining/combat/sprint
 *  - AmbientParticlesBehavior: floating atmospheric particles
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
  miningSystem,
  questSystem,
  timeSystem,
  enemySystem,
} from "../ecs/systems/index.ts";
import type { BlockHit, MiningSideEffects } from "../ecs/systems/mining.ts";

import { createBlockDefinitions, BLOCKS } from "../world/blocks.ts";
import { initNoise } from "../world/noise.ts";
import { registerVoxelAccessors, getVoxelAt, setVoxelAt } from "../world/voxel-helpers.ts";
import {
  generateChunkTerrain,
  generateSpawnShrine,
  findSurfaceY,
  CHUNK_SIZE,
  WORLD_HEIGHT,
} from "../world/terrain-generator.ts";
import { generateTilesetDataURL, TILE_SIZE, COLS, ROWS } from "../world/tileset-generator.ts";

import { ViewModelBehavior } from "./behaviors/ViewModelBehavior.ts";
import { CelestialBehavior } from "./behaviors/CelestialBehavior.ts";
import { BlockHighlightBehavior } from "./behaviors/BlockHighlightBehavior.ts";
import { ParticlesBehavior } from "./behaviors/ParticlesBehavior.ts";
import { AmbientParticlesBehavior } from "./behaviors/AmbientParticlesBehavior.ts";

export const kootaWorld = createKootaWorld();

const loadedChunks = new Set<string>();
const RENDER_DISTANCE = 3;

let jpRuntime: Runtime | null = null;
let voxelRenderer: VoxelRenderer | null = null;

let threeScene: THREE.Scene | null = null;
let threeCamera: THREE.PerspectiveCamera | null = null;

// Jolly Pixel Actor-managed behaviors
let viewModelBehavior: ViewModelBehavior | null = null;
let celestialBehavior: CelestialBehavior | null = null;
let blockHighlightBehavior: BlockHighlightBehavior | null = null;
let particlesBehavior: ParticlesBehavior | null = null;
let ambientParticlesBehavior: AmbientParticlesBehavior | null = null;

// Shared references for the bridge
let ambientLight: THREE.AmbientLight | null = null;
let sunLight: THREE.DirectionalLight | null = null;
let resizeHandler: (() => void) | null = null;

/**
 * GameBridge Behavior — runs on a Jolly Pixel Actor each frame.
 * Drives all Koota ECS systems and pushes state to the visual Behaviors.
 */
class GameBridge extends Behavior {
  awake() {
    this.needUpdate = true;
  }

  update(dt: number) {
    if (dt <= 0 || dt > 0.1) return;

    // Run ECS systems
    movementSystem(kootaWorld, dt);
    physicsSystem(kootaWorld, dt);
    survivalSystem(kootaWorld, dt);
    questSystem(kootaWorld, dt);
    timeSystem(kootaWorld, dt);
    enemySystem(kootaWorld, dt);

    // Sync Koota player state -> Three.js camera + Behaviors
    this.syncPlayerToCamera(dt);
    this.syncViewModelState();
    this.syncEnvironmentState();
    this.runMiningSystem(dt);
    streamChunks();
  }

  private syncPlayerToCamera(_dt: number) {
    if (!threeCamera) return;

    kootaWorld
      .query(PlayerTag, Position, Rotation, MoveInput, PhysicsBody, ToolSwing)
      .readEach(([pos, rot, input, body, toolSwing]) => {
        threeCamera!.position.set(pos.x, pos.y, pos.z);
        threeCamera!.rotation.order = "YXZ";
        threeCamera!.rotation.set(rot.pitch, rot.yaw, 0);

        // Camera shake lerp (resets to 0,0 after mining hits apply offsets)
        // The camera's local offset is managed by the view model behavior through parent

        // Push to view model behavior
        if (viewModelBehavior) {
          const isMoving = (input.forward || input.backward || input.left || input.right) && body.onGround;
          viewModelBehavior.isMoving = isMoving;
          viewModelBehavior.isSprinting = input.sprint;
          viewModelBehavior.swingProgress = toolSwing.progress;
          viewModelBehavior.swayX = toolSwing.swayX;
          viewModelBehavior.swayY = toolSwing.swayY;
        }
      });
  }

  private syncViewModelState() {
    kootaWorld.query(PlayerTag, Hotbar).readEach(([hotbar]) => {
      if (viewModelBehavior) {
        viewModelBehavior.slotData = hotbar.slots[hotbar.activeSlot];
      }
    });
  }

  private syncEnvironmentState() {
    let timeOfDay = 0.25;
    let px = 0, py = 0, pz = 0;

    kootaWorld.query(WorldTime).readEach(([time]) => {
      timeOfDay = time.timeOfDay;
    });

    kootaWorld.query(PlayerTag, Position).readEach(([pos]) => {
      px = pos.x;
      py = pos.y;
      pz = pos.z;
    });

    if (celestialBehavior) {
      celestialBehavior.timeOfDay = timeOfDay;
      celestialBehavior.playerX = px;
      celestialBehavior.playerZ = pz;
    }

    if (ambientParticlesBehavior) {
      ambientParticlesBehavior.timeOfDay = timeOfDay;
      ambientParticlesBehavior.playerX = px;
      ambientParticlesBehavior.playerY = py;
      ambientParticlesBehavior.playerZ = pz;
    }
  }

  private runMiningSystem(dt: number) {
    const hit: BlockHit | null = blockHighlightBehavior?.lastHit ?? null;
    const effects: MiningSideEffects = {
      removeBlock: (x, y, z) => setVoxelAt("Ground", x, y, z, 0),
      spawnParticles: (x, y, z, color, count) => particlesBehavior?.spawn(x, y, z, color, count),
    };
    miningSystem(kootaWorld, dt, hit, effects);
  }
}

const UNLOAD_DISTANCE = RENDER_DISTANCE + 2;

function streamChunks() {
  if (!voxelRenderer) return;

  let px = 0, pz = 0;
  kootaWorld.query(PlayerTag, Position).readEach(([pos]) => {
    px = pos.x;
    pz = pos.z;
  });

  const pCx = Math.floor(px / CHUNK_SIZE);
  const pCz = Math.floor(pz / CHUNK_SIZE);

  // Load nearby chunks
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

  // Unload distant chunks
  for (const key of loadedChunks) {
    const [cxStr, czStr] = key.split(",");
    const cx = parseInt(cxStr, 10);
    const cz = parseInt(czStr, 10);
    if (Math.abs(cx - pCx) > UNLOAD_DISTANCE || Math.abs(cz - pCz) > UNLOAD_DISTANCE) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
          const gx = cx * CHUNK_SIZE + lx;
          const gz = cz * CHUNK_SIZE + lz;
          for (let y = 0; y < WORLD_HEIGHT; y++) {
            voxelRenderer!.removeVoxel("Ground", { position: { x: gx, y, z: gz } });
          }
        }
      }
      loadedChunks.delete(key);
    }
  }
}

export async function initGame(canvas: HTMLCanvasElement, seed: string): Promise<void> {
  initNoise(seed);

  jpRuntime = new Runtime(canvas, {
    includePerformanceStats: false,
  });
  const jpWorld = jpRuntime.world;

  // ─── Scene ───
  threeScene = jpWorld.sceneManager.default;
  threeScene.background = new THREE.Color(0x87ceeb);
  threeScene.fog = new THREE.Fog(0x87ceeb, 15, RENDER_DISTANCE * CHUNK_SIZE - 5);

  // ─── Camera ───
  threeCamera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  jpWorld.renderer.addRenderComponent(threeCamera);

  // ─── Lighting ───
  ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
  threeScene.add(ambientLight);

  sunLight = new THREE.DirectionalLight(0xffffee, 1.2);
  sunLight.castShadow = true;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 150;
  sunLight.shadow.camera.left = -40;
  sunLight.shadow.camera.right = 40;
  sunLight.shadow.camera.top = 40;
  sunLight.shadow.camera.bottom = -40;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  threeScene.add(sunLight.target);

  // ─── Celestial Actor ───
  const celestialActor = jpWorld.createActor("Celestial");
  celestialBehavior = celestialActor.addComponentAndGet(CelestialBehavior);
  celestialBehavior.setup(threeScene, ambientLight, sunLight);

  // ─── Ambient Particles Actor ───
  const ambientParticlesActor = jpWorld.createActor("AmbientParticles");
  ambientParticlesBehavior = ambientParticlesActor.addComponentAndGet(AmbientParticlesBehavior);
  ambientParticlesBehavior.setup(threeScene);

  // ─── Particle System Actor ───
  const particlesActor = jpWorld.createActor("Particles");
  particlesBehavior = particlesActor.addComponentAndGet(ParticlesBehavior);
  particlesBehavior.setup(threeScene);

  // ─── Block Highlight Actor ───
  const highlightActor = jpWorld.createActor("BlockHighlight");
  blockHighlightBehavior = highlightActor.addComponentAndGet(BlockHighlightBehavior);
  blockHighlightBehavior.setup(
    threeScene,
    threeCamera,
    (x, y, z) => getVoxelAt(x, y, z),
  );

  // ─── View Model Actor ───
  const viewModelActor = jpWorld.createActor("ViewModel");
  viewModelBehavior = viewModelActor.addComponentAndGet(ViewModelBehavior);
  viewModelBehavior.setCamera(threeCamera);

  // ─── Voxel Map Actor ───
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
    },
  );

  // ─── Generate Spawn ───
  generateChunkTerrain(voxelRenderer, "Ground", 0, 0);
  loadedChunks.add("0,0");

  const surfaceY = findSurfaceY(voxelRenderer, 8, 8);
  generateSpawnShrine(voxelRenderer, "Ground", surfaceY);

  const spawnY = surfaceY + 2.5;

  // ─── ECS Entities ───
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

  // ─── Game Bridge Actor ───
  const bridgeActor = jpWorld.createActor("GameBridge");
  bridgeActor.addComponent(GameBridge);

  threeCamera.position.set(8.5, spawnY, 8.5);
  threeCamera.updateProjectionMatrix();

  // Handle resize
  resizeHandler = () => {
    if (!threeCamera) return;
    threeCamera.aspect = canvas.clientWidth / canvas.clientHeight;
    threeCamera.updateProjectionMatrix();
  };
  window.addEventListener("resize", resizeHandler);

  await loadRuntime(jpRuntime, { loadingDelay: 300 });
}

export function getKootaWorld() {
  return kootaWorld;
}

export function getVoxelRenderer() {
  return voxelRenderer;
}

export function getBlockHighlight() {
  return blockHighlightBehavior;
}

export function getParticlesBehavior() {
  return particlesBehavior;
}

export function placeBlock() {
  if (!blockHighlightBehavior) return;
  const prev = blockHighlightBehavior.lastPrev;
  if (!prev) return;

  kootaWorld
    .query(PlayerTag, Hotbar, Inventory, Position, ToolSwing)
    .updateEach(([hotbar, inv, pos, toolSwing]) => {
      const slot = hotbar.slots[hotbar.activeSlot];
      if (!slot || slot.type !== "block") return;

      const blockDef = BLOCKS[slot.id];
      if (!blockDef) return;
      const bName = blockDef.name.toLowerCase();

      // Check craftable block inventory
      const invAny = inv as unknown as Record<string, number>;
      const craftableKeys: Record<string, string> = {
        planks: "planks",
        torch: "torches",
        stonebricks: "stonebricks",
        glass: "glass",
      };
      const invKey = craftableKeys[bName];
      if (invKey) {
        if ((invAny[invKey] || 0) <= 0) return;
        invAny[invKey]--;
      }

      // Don't place inside player
      const pX = prev.x, pY = prev.y, pZ = prev.z;
      if (
        pX === Math.floor(pos.x) &&
        pZ === Math.floor(pos.z) &&
        (pY === Math.floor(pos.y) || pY === Math.floor(pos.y - 1))
      ) return;

      setVoxelAt("Ground", pX, pY, pZ, slot.id);
      toolSwing.progress = 1.0;
    });
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
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }
  jpRuntime?.stop();
  jpRuntime = null;
  threeScene = null;
  threeCamera = null;
  voxelRenderer = null;
  viewModelBehavior = null;
  celestialBehavior = null;
  blockHighlightBehavior = null;
  particlesBehavior = null;
  ambientParticlesBehavior = null;
  ambientLight = null;
  sunLight = null;
  loadedChunks.clear();
}
