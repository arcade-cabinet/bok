import type { World, Entity } from 'koota';
import { Scene } from './Scene.ts';
import { Position, Velocity, Health, IsPlayer, MovementIntent, LookIntent } from '../traits/index.ts';
import { TerrainBuilder, type TerrainData } from '../generation/TerrainBuilder.ts';
import { SaveManager, type GameState } from '../persistence/index.ts';
import type { SceneDirector } from './SceneDirector.ts';
import type { ActionMap } from '../input/ActionMap.ts';
import type { BiomeConfig } from '../content/types.ts';
import type { Vec3 } from '../shared/types.ts';
import * as THREE from 'three';

import buildingsData from '../content/hub/buildings.json';
import npcsData from '../content/hub/npcs.json';

// --- Hub building data types ---

interface BuildingLevel {
  level: number;
  effect: string;
  cost: Record<string, number>;
}

interface HubBuilding {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  levels: BuildingLevel[];
  position: Vec3;
}

interface HubNPC {
  id: string;
  name: string;
  role: string;
  description: string;
  requiredBuilding: string | null;
  dialogue: { greeting: string; farewell: string };
  position: Vec3;
}

// --- Hub-specific biome config for terrain generation ---

const HUB_BIOME_CONFIG: BiomeConfig = {
  id: 'hub',
  name: 'Hub Island',
  description: 'Your home base between expeditions.',
  terrain: {
    noiseOctaves: 2,
    noiseFrequency: 0.04,
    noiseAmplitude: 3,
    waterLevel: 2,
    baseHeight: 6,
    blocks: {
      surface: 1,   // grass
      subsurface: 2, // dirt
      stone: 3,      // stone
      water: 4,      // water
      accent: 5,     // stone path
    },
  },
  enemies: [{ enemyId: 'none', weight: 1, minDifficulty: 99 }],
  bossId: 'none',
  music: 'hub-theme',
  ambience: 'birdsong',
  skyColor: '#87CEEB',
  fogColor: '#C0D8F0',
  fogDensity: 0.005,
};

const HUB_SEED = 'bok-hub-island';
const HUB_SIZE = 32;
const INTERACTION_RANGE = 3;
const PLAYER_MOVE_SPEED = 5;

// Block type IDs for hub structures
const BLOCK = {
  STONE: 3,
  WOOD: 6,
  IRON: 7,
  LAVA: 8,
  GLASS: 9,
  CLOTH_RED: 10,
  CLOTH_BLUE: 11,
  CLOTH_GREEN: 12,
};

// --- Voxel structure templates ---

interface VoxelBlock {
  x: number;
  y: number;
  z: number;
  blockId: number;
}

function generateArmory(origin: Vec3): VoxelBlock[] {
  const blocks: VoxelBlock[] = [];
  const { x: ox, y: oy, z: oz } = origin;
  // 5x4x5 stone building with iron accents
  for (let dx = 0; dx < 5; dx++) {
    for (let dz = 0; dz < 5; dz++) {
      for (let dy = 0; dy < 4; dy++) {
        const isWall = dx === 0 || dx === 4 || dz === 0 || dz === 4;
        const isDoor = dx === 2 && dz === 0 && dy < 2;
        if (isDoor) continue;
        if (isWall || dy === 0) {
          blocks.push({ x: ox + dx, y: oy + dy, z: oz + dz, blockId: BLOCK.STONE });
        }
      }
    }
  }
  // Iron weapon rack accents
  blocks.push({ x: ox + 1, y: oy + 1, z: oz + 4, blockId: BLOCK.IRON });
  blocks.push({ x: ox + 3, y: oy + 1, z: oz + 4, blockId: BLOCK.IRON });
  blocks.push({ x: ox + 1, y: oy + 2, z: oz + 4, blockId: BLOCK.IRON });
  blocks.push({ x: ox + 3, y: oy + 2, z: oz + 4, blockId: BLOCK.IRON });
  return blocks;
}

function generateDocks(origin: Vec3): VoxelBlock[] {
  const blocks: VoxelBlock[] = [];
  const { x: ox, y: oy, z: oz } = origin;
  // Wooden planks extending 8 blocks over water
  for (let dx = 0; dx < 3; dx++) {
    for (let dz = 0; dz < 8; dz++) {
      blocks.push({ x: ox + dx, y: oy, z: oz + dz, blockId: BLOCK.WOOD });
    }
  }
  // Railing posts
  for (let dz = 0; dz < 8; dz += 2) {
    blocks.push({ x: ox, y: oy + 1, z: oz + dz, blockId: BLOCK.WOOD });
    blocks.push({ x: ox + 2, y: oy + 1, z: oz + dz, blockId: BLOCK.WOOD });
  }
  return blocks;
}

function generateLibrary(origin: Vec3): VoxelBlock[] {
  const blocks: VoxelBlock[] = [];
  const { x: ox, y: oy, z: oz } = origin;
  // 5x7x5 tall stone tower
  for (let dx = 0; dx < 5; dx++) {
    for (let dz = 0; dz < 5; dz++) {
      for (let dy = 0; dy < 7; dy++) {
        const isWall = dx === 0 || dx === 4 || dz === 0 || dz === 4;
        const isDoor = dx === 2 && dz === 0 && dy < 2;
        // Window gaps at y=3 and y=5
        const isWindow = (dy === 3 || dy === 5) && (dx === 2 || dz === 2) && isWall;
        if (isDoor || isWindow) continue;
        if (isWall || dy === 0 || dy === 6) {
          blocks.push({ x: ox + dx, y: oy + dy, z: oz + dz, blockId: BLOCK.STONE });
        }
      }
    }
  }
  return blocks;
}

function generateMarket(origin: Vec3): VoxelBlock[] {
  const blocks: VoxelBlock[] = [];
  const { x: ox, y: oy, z: oz } = origin;
  // 3 wooden stalls side by side
  const awnings = [BLOCK.CLOTH_RED, BLOCK.CLOTH_BLUE, BLOCK.CLOTH_GREEN];
  for (let stall = 0; stall < 3; stall++) {
    const sx = ox + stall * 3;
    // Counter
    for (let dz = 0; dz < 2; dz++) {
      blocks.push({ x: sx, y: oy, z: oz + dz, blockId: BLOCK.WOOD });
      blocks.push({ x: sx + 1, y: oy, z: oz + dz, blockId: BLOCK.WOOD });
    }
    // Posts
    blocks.push({ x: sx, y: oy + 1, z: oz, blockId: BLOCK.WOOD });
    blocks.push({ x: sx + 1, y: oy + 1, z: oz, blockId: BLOCK.WOOD });
    blocks.push({ x: sx, y: oy + 1, z: oz + 1, blockId: BLOCK.WOOD });
    blocks.push({ x: sx + 1, y: oy + 1, z: oz + 1, blockId: BLOCK.WOOD });
    // Awning
    for (let dx = 0; dx < 2; dx++) {
      for (let dz = 0; dz < 2; dz++) {
        blocks.push({ x: sx + dx, y: oy + 2, z: oz + dz, blockId: awnings[stall] });
      }
    }
  }
  return blocks;
}

function generateForge(origin: Vec3): VoxelBlock[] {
  const blocks: VoxelBlock[] = [];
  const { x: ox, y: oy, z: oz } = origin;
  // 4x3x4 stone building with lava accent
  for (let dx = 0; dx < 4; dx++) {
    for (let dz = 0; dz < 4; dz++) {
      for (let dy = 0; dy < 3; dy++) {
        const isWall = dx === 0 || dx === 3 || dz === 0 || dz === 3;
        const isDoor = dx === 1 && dz === 0 && dy < 2;
        if (isDoor) continue;
        if (isWall || dy === 0) {
          blocks.push({ x: ox + dx, y: oy + dy, z: oz + dz, blockId: BLOCK.STONE });
        }
      }
    }
  }
  // Lava forge center
  blocks.push({ x: ox + 1, y: oy, z: oz + 2, blockId: BLOCK.LAVA });
  blocks.push({ x: ox + 2, y: oy, z: oz + 2, blockId: BLOCK.LAVA });
  blocks.push({ x: ox + 1, y: oy + 1, z: oz + 2, blockId: BLOCK.LAVA });
  return blocks;
}

const STRUCTURE_GENERATORS: Record<string, (origin: Vec3) => VoxelBlock[]> = {
  armory: generateArmory,
  docks: generateDocks,
  library: generateLibrary,
  market: generateMarket,
  forge: generateForge,
};

// --- Hub state (building levels, persisted) ---

interface HubState {
  buildingLevels: Record<string, number>;
  resources: Record<string, number>;
}

/**
 * Hub Island scene: persistent home base with upgradeable buildings,
 * NPCs, and dock departure to island selection.
 */
export class HubScene extends Scene {
  readonly #sceneDirector: SceneDirector;
  readonly #actionMap: ActionMap;
  readonly #saveManager: SaveManager;

  readonly #buildings: HubBuilding[] = buildingsData as HubBuilding[];
  readonly #npcs: HubNPC[] = npcsData as HubNPC[];

  #terrain: TerrainData | null = null;
  #playerEntity: Entity | null = null;
  #npcEntities: Entity[] = [];
  #hubState: HubState = { buildingLevels: {}, resources: {} };
  #structureBlocks: VoxelBlock[] = [];

  // Interaction state
  #nearbyBuilding: HubBuilding | null = null;
  #interactPressed = false;
  #showingOverlay = false;

  // Camera
  #camera: THREE.PerspectiveCamera | null = null;
  readonly #cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  readonly #cameraSensitivity = 0.002;

  constructor(
    world: World,
    runtime: unknown,
    sceneDirector: SceneDirector,
    actionMap: ActionMap,
    saveManager: SaveManager,
  ) {
    super('hub', world, runtime);
    this.#sceneDirector = sceneDirector;
    this.#actionMap = actionMap;
    this.#saveManager = saveManager;
  }

  enter(): void {
    console.log('[HubScene] enter — loading hub island');

    // Generate fixed hub terrain (always the same)
    this.#terrain = TerrainBuilder.generate(HUB_BIOME_CONFIG, HUB_SEED, HUB_SIZE);

    // Load persisted hub state
    this.#loadHubState();

    // Generate building structures
    this.#generateStructures();

    // Setup camera
    const aspect = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 16 / 9;
    this.#camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 500);
    this.#cameraEuler.set(0, 0, 0);

    // Spawn player at center of hub
    const cx = Math.floor(HUB_SIZE / 2);
    const cy = this.#terrain.heightmap[cx][cx] + 1;
    this.#playerEntity = this.world.spawn(
      IsPlayer(),
      Position({ x: cx, y: cy, z: cx }),
      Velocity(),
      Health({ current: 100, max: 100 }),
    );

    if (this.#camera) {
      this.#camera.position.set(cx, cy + 1.6, cx);
    }

    // Spawn NPC entities
    this.#spawnNPCs();

    console.log(
      `[HubScene] Hub ready — ${this.#buildings.length} buildings, ${this.#npcs.length} NPCs, ` +
      `${this.#structureBlocks.length} structure blocks`,
    );
  }

  update(dt: number): void {
    this.#applyPlayerMovement(dt);
    this.#applyCameraLook();
    this.#checkBuildingProximity();
    this.#handleInteraction();
    this.#syncCameraToPlayer();
  }

  exit(): void {
    console.log('[HubScene] exit — saving hub state');

    // Save hub state before leaving
    this.#saveHubState();

    // Clean up entities
    if (this.#playerEntity?.isAlive()) {
      this.#playerEntity.destroy();
    }
    for (const npc of this.#npcEntities) {
      if (npc.isAlive()) npc.destroy();
    }

    this.#playerEntity = null;
    this.#npcEntities = [];
    this.#terrain = null;
    this.#camera = null;
    this.#nearbyBuilding = null;
    this.#showingOverlay = false;
    this.#structureBlocks = [];
  }

  // --- Terrain & structures ---

  #generateStructures(): void {
    this.#structureBlocks = [];

    for (const building of this.#buildings) {
      const generator = STRUCTURE_GENERATORS[building.id];
      if (!generator) continue;

      // Use building positions from content config, Y from terrain heightmap
      const bx = Math.min(Math.max(Math.round(building.position.x + HUB_SIZE / 2), 0), HUB_SIZE - 1);
      const bz = Math.min(Math.max(Math.round(building.position.z + HUB_SIZE / 2), 0), HUB_SIZE - 1);
      const by = this.#terrain ? this.#terrain.heightmap[bx]?.[bz] ?? 6 : 6;

      const blocks = generator({ x: bx, y: by, z: bz });
      this.#structureBlocks.push(...blocks);
    }
  }

  // --- NPC spawning ---

  #spawnNPCs(): void {
    for (const npc of this.#npcs) {
      // Check if required building exists (always does for hub)
      const nx = Math.round(npc.position.x + HUB_SIZE / 2);
      const nz = Math.round(npc.position.z + HUB_SIZE / 2);
      const ny = this.#terrain ? this.#terrain.heightmap[nx]?.[nz] ?? 6 : 6;

      const entity = this.world.spawn(
        Position({ x: nx, y: ny + 1, z: nz }),
      );
      this.#npcEntities.push(entity);
    }
  }

  // --- Player movement (simplified — no combat in hub) ---

  #applyPlayerMovement(dt: number): void {
    if (!this.#playerEntity) return;

    const intent = this.world.get(MovementIntent);
    if (!intent) return;

    // Camera-relative movement
    const yaw = this.#cameraEuler.y;
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const worldX = intent.dirX * cosYaw - intent.dirZ * sinYaw;
    const worldZ = intent.dirX * sinYaw + intent.dirZ * cosYaw;

    const pos = this.#playerEntity.get(Position);
    if (!pos) return;

    const newX = pos.x + worldX * PLAYER_MOVE_SPEED * dt;
    const newZ = pos.z + worldZ * PLAYER_MOVE_SPEED * dt;

    // Clamp to terrain bounds
    const clampedX = Math.max(0, Math.min(HUB_SIZE - 1, newX));
    const clampedZ = Math.max(0, Math.min(HUB_SIZE - 1, newZ));

    // Snap Y to terrain height
    const terrainY = this.#terrain
      ? this.#terrain.heightmap[Math.floor(clampedX)]?.[Math.floor(clampedZ)] ?? 6
      : 6;

    this.#playerEntity.set(Position, {
      x: clampedX,
      y: terrainY + 1,
      z: clampedZ,
    });
  }

  #applyCameraLook(): void {
    if (!this.#camera) return;

    const look = this.world.get(LookIntent);
    if (!look) return;

    this.#cameraEuler.y -= look.deltaX * this.#cameraSensitivity;
    this.#cameraEuler.x -= look.deltaY * this.#cameraSensitivity;

    const maxPitch = Math.PI / 2 - 0.01;
    this.#cameraEuler.x = Math.max(-maxPitch, Math.min(maxPitch, this.#cameraEuler.x));

    this.#camera.quaternion.setFromEuler(this.#cameraEuler);
  }

  #syncCameraToPlayer(): void {
    if (!this.#camera || !this.#playerEntity) return;

    const pos = this.#playerEntity.get(Position);
    if (pos) {
      this.#camera.position.set(pos.x, pos.y + 1.6, pos.z);
    }
  }

  // --- Building interaction ---

  #checkBuildingProximity(): void {
    if (!this.#playerEntity) {
      this.#nearbyBuilding = null;
      return;
    }

    const pos = this.#playerEntity.get(Position);
    if (!pos) {
      this.#nearbyBuilding = null;
      return;
    }

    let closest: HubBuilding | null = null;
    let closestDist = INTERACTION_RANGE;

    for (const building of this.#buildings) {
      const bx = building.position.x + HUB_SIZE / 2;
      const bz = building.position.z + HUB_SIZE / 2;
      const dx = pos.x - bx;
      const dz = pos.z - bz;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < closestDist) {
        closestDist = dist;
        closest = building;
      }
    }

    this.#nearbyBuilding = closest;
  }

  #handleInteraction(): void {
    const interactActive = this.#actionMap.isActive('interact');

    // Detect press (rising edge)
    if (interactActive && !this.#interactPressed) {
      this.#interactPressed = true;

      if (this.#nearbyBuilding) {
        if (this.#nearbyBuilding.id === 'docks') {
          // Dock departure — transition to island select
          console.log('[HubScene] Departing from docks → islandSelect');
          this.#sceneDirector.transition('islandSelect');
          return;
        }

        // Toggle building overlay
        this.#showingOverlay = !this.#showingOverlay;

        if (this.#showingOverlay) {
          this.#showBuildingOverlay(this.#nearbyBuilding);
        } else {
          this.#hideBuildingOverlay();
        }
      }
    } else if (!interactActive) {
      this.#interactPressed = false;
    }
  }

  #showBuildingOverlay(building: HubBuilding): void {
    const currentLevel = this.#hubState.buildingLevels[building.id] ?? 1;
    const nextLevel = building.levels.find(l => l.level === currentLevel + 1);

    console.log(
      `[HubScene] Building: ${building.name} (Level ${currentLevel}/${building.maxLevel})` +
      (nextLevel ? ` — Upgrade cost: ${JSON.stringify(nextLevel.cost)}` : ' — MAX LEVEL'),
    );
  }

  #hideBuildingOverlay(): void {
    console.log('[HubScene] Closing building overlay');
  }

  /** Upgrade a building if the player has enough resources. */
  upgradeBuilding(buildingId: string): boolean {
    const building = this.#buildings.find(b => b.id === buildingId);
    if (!building) return false;

    const currentLevel = this.#hubState.buildingLevels[buildingId] ?? 1;
    const nextLevel = building.levels.find(l => l.level === currentLevel + 1);
    if (!nextLevel) return false; // Already max level

    // Check resources
    for (const [resource, amount] of Object.entries(nextLevel.cost)) {
      if ((this.#hubState.resources[resource] ?? 0) < amount) {
        console.log(`[HubScene] Not enough ${resource} — need ${amount}`);
        return false;
      }
    }

    // Deduct resources
    for (const [resource, amount] of Object.entries(nextLevel.cost)) {
      this.#hubState.resources[resource] = (this.#hubState.resources[resource] ?? 0) - amount;
    }

    // Level up
    this.#hubState.buildingLevels[buildingId] = currentLevel + 1;
    console.log(`[HubScene] Upgraded ${building.name} to level ${currentLevel + 1}`);

    // Persist immediately
    this.#saveHubState();
    return true;
  }

  // --- Persistence ---

  #loadHubState(): void {
    this.#saveManager.loadState()
      .then((state) => {
        if (state?.koota && typeof state.koota === 'object') {
          const saved = state.koota as { hubState?: HubState };
          if (saved.hubState) {
            this.#hubState = saved.hubState;
            console.log('[HubScene] Loaded hub state:', this.#hubState.buildingLevels);
          }
        }
      })
      .catch((err) => {
        console.warn('[HubScene] Failed to load hub state:', err);
      });
  }

  #saveHubState(): void {
    this.#saveManager.saveState({
      koota: { hubState: this.#hubState },
      yuka: null,
      scene: 'hub',
    }).catch((err) => {
      console.warn('[HubScene] Failed to save hub state:', err);
    });
  }

  // --- Accessors for testing and UI ---

  get terrain(): TerrainData | null {
    return this.#terrain;
  }

  get structureBlocks(): VoxelBlock[] {
    return this.#structureBlocks;
  }

  get nearbyBuilding(): HubBuilding | null {
    return this.#nearbyBuilding;
  }

  get hubState(): HubState {
    return this.#hubState;
  }

  get isShowingOverlay(): boolean {
    return this.#showingOverlay;
  }
}
