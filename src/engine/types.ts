/**
 * @module engine/types
 * @role Shared types for engine modules
 */
import type { Systems } from '@jolly-pixel/engine';
import type * as THREE from 'three';
import type { Vehicle } from 'yuka';

/** JollyPixel World instance type (WebGL-backed) */
export type JpWorld = Systems.World<THREE.WebGLRenderer>;

/** Surface height lookup function */
export type SurfaceHeightFn = (x: number, z: number) => number;

/** Enemy runtime state */
export interface EnemyState {
  mesh: THREE.Object3D;
  vehicle: Vehicle;
  health: number;
  maxHealth: number;
  damage: number;
  type: string;
  attackCooldown: number;
  /** Set to true when health reaches 0 — triggers fade/shrink death animation */
  dying?: boolean;
  /** Remaining seconds on the death animation (starts at 0.5) */
  deathTimer?: number;
}

/** Boss runtime state */
export interface BossState {
  mesh: THREE.Object3D;
  vehicle: Vehicle;
  health: number;
  maxHealth: number;
  attackCooldown: number;
  phase: number;
  defeated: boolean;
}

/** Game mode — Creative (build freely) or Survival (combat + goals) */
export type GameMode = 'creative' | 'survival';

/** Game configuration from menu */
export interface GameStartConfig {
  biome: string;
  seed: string;
  mode: GameMode;
}

/** Threat level from the player governor */
export type ThreatLevel = 'none' | 'low' | 'medium' | 'high';

/** Minimap marker sent to React for canvas rendering */
export interface MinimapMarker {
  x: number;
  z: number;
  type: 'enemy' | 'chest' | 'shrine';
}

/** Engine state exposed to React via polling */
export interface EngineState {
  playerHealth: number;
  maxHealth: number;
  enemyCount: number;
  biomeName: string;
  bossNearby: boolean;
  bossHealthPct: number;
  bossPhase: number;
  paused: boolean;
  phase: 'playing' | 'dead' | 'victory' | 'paused';
  context: 'combat' | 'climb' | 'drop' | 'explore';
  /** Governor: suggested target enemy world position (null if none) */
  suggestedTargetPos: { x: number; y: number; z: number } | null;
  /** Governor: current threat assessment */
  threatLevel: ThreatLevel;
  /** Governor: whether stamina allows dodging */
  canDodge: boolean;
  /** Current stamina value */
  stamina: number;
  /** Maximum stamina value */
  maxStamina: number;
  /** Current combo step (0-2) */
  comboStep: number;
  /** Whether the player is currently blocking */
  isBlocking: boolean;
  /** Player world position for minimap centering */
  playerX: number;
  playerZ: number;
  /** Minimap markers: enemies and loot drops */
  minimapMarkers: MinimapMarker[];
  /** Name of the currently selected block for placement */
  selectedBlockName: string;
  /** Display name of the currently selected block shape (e.g. "Cube", "Slab") */
  selectedShapeName: string;
  /** Combined block label: type + shape (e.g. "Stone [Slab]") */
  selectedBlockLabel: string;
  /** Whether the player is looking at a breakable block within reach */
  lookingAtBlock: boolean;
  /** Ghost preview position and shape for the placement wireframe */
  placementPreview: { x: number; y: number; z: number; shape: string } | null;
  /** Block breaking progress: 0 = not breaking, 0-1 = in progress */
  breakingProgress: number;
}

/** Boss attack configuration for a single phase */
export interface BossAttackConfig {
  name: string;
  type: 'melee' | 'ranged' | 'aoe' | 'summon';
  damage: number;
  cooldown: number;
  range: number;
  telegraph: number;
}

/** Boss phase configuration — health threshold + available attacks */
export interface BossPhaseConfig {
  healthThreshold: number;
  attacks: BossAttackConfig[];
  arenaChange?: string;
  description: string;
}

/** Events the engine can emit to React */
export type EngineEvent =
  | { type: 'playerDamaged'; amount: number }
  | { type: 'enemyKilled'; position: { x: number; y: number; z: number } }
  | { type: 'attackHit'; damage: number; position: { x: number; y: number; z: number } }
  | { type: 'bossPhaseChange'; phase: number }
  | { type: 'bossDefeated'; bossId: string; tomeAbility: string }
  | { type: 'playerDied' }
  | { type: 'lootPickup'; itemType: string }
  | { type: 'parry' }
  | { type: 'block'; damage: number }
  | { type: 'chestOpened'; tier: string; items: Array<{ name: string; amount: number }> }
  | { type: 'bossTelegraph'; attackName: string; duration: number }
  | { type: 'bossSummon'; attackName: string }
  | { type: 'landmarkDiscovered'; position: { x: number; z: number } }
  | { type: 'blockPlaced'; position: { x: number; y: number; z: number }; blockId: number }
  | { type: 'blockBroken'; position: { x: number; y: number; z: number }; blockId: number }
  | { type: 'resourceGathered'; resourceId: string; resourceName: string; resourceIcon: string; amount: number };

export type EngineEventListener = (event: EngineEvent) => void;

/** Mobile joystick input fed from React touch controls */
export interface MobileInput {
  moveX: number; // -1 to 1 absolute
  moveZ: number; // -1 to 1 absolute
  lookX: number; // -1 to 1 absolute — continuous rotation rate
  lookY: number; // -1 to 1 absolute — continuous rotation rate
  action: 'attack' | 'defend' | 'dodge' | 'jump' | 'crouch' | 'interact' | 'placeBlock' | 'breakBlock' | null;
}
