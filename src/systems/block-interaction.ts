/**
 * @module systems/block-interaction
 * @role Block placement and breaking via Rapier raycasting against voxel terrain
 * @input Camera, Rapier world, VoxelRenderer, ChunkWorld
 * @output BlockInteractionSystem with place/break/query methods and delta tracking
 * @tested block-interaction.test.ts
 */
import type RAPIER from '@dimforge/rapier3d';
import type { VoxelRenderer } from '@jolly-pixel/voxel.renderer';
import type * as THREE from 'three';

import type { ChunkWorld } from '../engine/chunkWorld';

// ---------------------------------------------------------------------------
// Tool & Block Breaking Data
// ---------------------------------------------------------------------------

/** Tool tiers and their base break speed multipliers (seconds per unit hardness) */
export const TOOL_BREAK_SPEEDS: Record<string, number> = {
  hand: 2.0, // 2 seconds per hardness unit with bare hands
  wood: 1.0, // Wood tools
  stone: 0.7, // Stone tools
  gold: 0.4, // Gold tools
  diamond: 0.2, // Diamond tools
};

/** Block hardness values — multiplied by tool speed to get total break time */
export const BLOCK_HARDNESS: Record<number, number> = {
  // Base blocks
  1: 0.5, // Grass — easy
  2: 0.5, // Dirt — easy
  3: 1.5, // Stone — medium
  5: 0.3, // Sand — very easy
  6: 1.0, // Wood — medium
  7: 0.2, // Leaves — instant-ish

  // Desert
  10: 0.3, // Sand Surface
  11: 1.2, // Sandstone
  12: 1.5, // Desert Stone
  14: 0.4, // Cactus

  // Tundra
  20: 0.5, // Snow Top
  21: 0.6, // Frozen Dirt
  22: 1.0, // Ice
  24: 1.8, // Permafrost

  // Volcanic
  30: 3.0, // Obsidian — very hard
  31: 0.3, // Ash
  32: 2.0, // Basalt
  34: 2.5, // Magma Crust

  // Swamp
  40: 0.4, // Mud Surface
  41: 0.5, // Peat
  42: 1.5, // Swamp Stone
  44: 0.8, // Dead Wood

  // Crystal
  50: 0.6, // Crystal Surface
  51: 1.5, // Geode Wall
  52: 2.0, // Amethyst
  54: 2.0, // Quartz

  // Sky
  60: 0.3, // Cloud Top
  61: 0.3, // Cloud Base
  62: 1.5, // Sky Stone
  64: 1.0, // Wind Block

  // Ocean
  70: 0.5, // Coral Surface
  71: 0.8, // Sea Floor
  72: 1.5, // Ocean Stone

  // Shaped blocks (100+) — inherit hardness from their material
  100: 1.5, // Stone Slab
  101: 1.0, // Wood Slab
  102: 0.3, // Sand Slab
  110: 1.5, // Stone Pole
  111: 1.0, // Wood Pole
  120: 0.5, // Grass Ramp
  121: 1.5, // Stone Ramp
  122: 0.3, // Sand Ramp
  130: 1.5, // Stone Stairs
  131: 1.0, // Wood Stairs
  140: 1.5, // Stone Ceiling
};

/** Default hardness for blocks not explicitly listed */
export const DEFAULT_BLOCK_HARDNESS = 1.0;

/**
 * Required minimum tool tier for certain blocks.
 * If the player's tool is below this tier, they cannot break the block at all.
 * null = any tool (including hand) works.
 */
export const BLOCK_TOOL_REQUIREMENT: Record<number, string | null> = {
  30: 'diamond', // Obsidian needs diamond pickaxe
};

/** Tool tier ordering for requirement checks */
const TOOL_TIER_ORDER: string[] = ['hand', 'wood', 'stone', 'gold', 'diamond'];

/**
 * Check if a tool tier meets the minimum requirement for a block.
 * Returns true if the tool can break the block, false if the tool is too weak.
 */
export function canToolBreakBlock(toolTier: string, blockId: number): boolean {
  const requirement = BLOCK_TOOL_REQUIREMENT[blockId] ?? null;
  if (requirement === null) return true;
  const toolLevel = TOOL_TIER_ORDER.indexOf(toolTier);
  const requiredLevel = TOOL_TIER_ORDER.indexOf(requirement);
  if (toolLevel === -1 || requiredLevel === -1) return false;
  return toolLevel >= requiredLevel;
}

/**
 * Calculate the total time (in seconds) to break a block with a given tool.
 * Formula: blockHardness * toolBreakSpeed
 */
export function calculateBreakTime(blockId: number, toolTier: string): number {
  const hardness = BLOCK_HARDNESS[blockId] ?? DEFAULT_BLOCK_HARDNESS;
  const speed = TOOL_BREAK_SPEEDS[toolTier] ?? TOOL_BREAK_SPEEDS.hand;
  return hardness * speed;
}

// ---------------------------------------------------------------------------
// Breaking State
// ---------------------------------------------------------------------------

/** Tracks ongoing block breaking progress */
export interface BreakingState {
  /** Target block position X */
  targetX: number;
  /** Target block position Y */
  targetY: number;
  /** Target block position Z */
  targetZ: number;
  /** Target block ID */
  targetBlockId: number;
  /** Breaking progress from 0.0 to 1.0 */
  progress: number;
  /** Total time (seconds) needed to break this block */
  totalTime: number;
}

/**
 * Create a fresh breaking state for a target block.
 */
export function createBreakingState(x: number, y: number, z: number, blockId: number, toolTier: string): BreakingState {
  return {
    targetX: x,
    targetY: y,
    targetZ: z,
    targetBlockId: blockId,
    progress: 0,
    totalTime: calculateBreakTime(blockId, toolTier),
  };
}

/**
 * Advance breaking progress by dt seconds.
 * Returns the new progress value (clamped to 1.0).
 */
export function advanceBreaking(state: BreakingState, dt: number): number {
  state.progress = Math.min(1.0, state.progress + dt / state.totalTime);
  return state.progress;
}

/**
 * Check if the breaking target has changed (player looked at a different block).
 */
export function breakingTargetChanged(state: BreakingState | null, target: BlockTarget | null): boolean {
  if (!state || !target) return true;
  return state.targetX !== target.x || state.targetY !== target.y || state.targetZ !== target.z;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Shapes the player can cycle through when placing blocks */
export const PLACEABLE_SHAPES = ['cube', 'slabBottom', 'slabTop', 'poleY', 'ramp', 'stair'] as const;
export type PlaceableShape = (typeof PLACEABLE_SHAPES)[number];

/** Human-readable display names for each shape */
export const SHAPE_DISPLAY_NAMES: Record<PlaceableShape, string> = {
  cube: 'Cube',
  slabBottom: 'Slab',
  slabTop: 'Ceiling',
  poleY: 'Pole',
  ramp: 'Ramp',
  stair: 'Stair',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlockInteractionConfig {
  /** Max distance for block interaction (default: 6) */
  reachDistance: number;
  /** Currently selected block ID to place */
  selectedBlockId: number;
  /** Currently selected block shape */
  selectedShape: PlaceableShape;
}

export interface BlockTarget {
  x: number;
  y: number;
  z: number;
  blockId: number;
}

export interface BlockInteractionResult {
  /** Block the player is looking at (for breaking) */
  targetBlock: BlockTarget | null;
  /** Position where a new block would be placed */
  placementPosition: { x: number; y: number; z: number } | null;
  /** Normal of the face being looked at */
  faceNormal: { x: number; y: number; z: number } | null;
}

/** A single block modification (place or break) for persistence */
export interface BlockDelta {
  x: number;
  y: number;
  z: number;
  blockId: number; // 0 = removed, >0 = placed
}

/** Preview data for the ghost wireframe at the placement position */
export interface PlacementPreview {
  position: { x: number; y: number; z: number };
  shape: PlaceableShape;
}

// ---------------------------------------------------------------------------
// Block type + shape → block ID mapping
// ---------------------------------------------------------------------------

/**
 * Map from base block type name to { shape → block ID }.
 * Only block types that have shaped variants are included.
 * 'cube' entries point back to the base block ID.
 */
const TYPE_SHAPE_MAP: Record<string, Partial<Record<PlaceableShape, number>>> = {
  Stone: { cube: 3, slabBottom: 100, poleY: 110, ramp: 121, stair: 130, slabTop: 140 },
  Wood: { cube: 6, slabBottom: 101, poleY: 111, stair: 131 },
  Sand: { cube: 5, slabBottom: 102, ramp: 122 },
  Grass: { cube: 1, ramp: 120 },
  Dirt: { cube: 2 },
};

/**
 * Resolve the correct block ID for a given block type name and shape.
 * Falls back to the cube variant if the requested shape does not exist
 * for that type. Returns the original block ID if type has no shape map entry.
 */
export function getBlockIdForTypeAndShape(
  blockTypeName: string,
  shape: PlaceableShape,
  fallbackBlockId: number,
): number {
  const entry = TYPE_SHAPE_MAP[blockTypeName];
  if (!entry) return fallbackBlockId;
  return entry[shape] ?? entry.cube ?? fallbackBlockId;
}

// ---------------------------------------------------------------------------
// Coordinate helpers (pure, tested)
// ---------------------------------------------------------------------------

/**
 * Convert a continuous ray hit position + face normal into the discrete
 * voxel coordinate the ray struck. We step slightly backward along the
 * ray (into the hit surface) to land inside the target voxel.
 */
export function hitToVoxelCoord(
  hitX: number,
  hitY: number,
  hitZ: number,
  normalX: number,
  normalY: number,
  normalZ: number,
): { x: number; y: number; z: number } {
  // Step a small epsilon INTO the block (opposite of normal) and floor
  const eps = 0.01;
  return {
    x: Math.floor(hitX - normalX * eps + 0.5),
    y: Math.floor(hitY - normalY * eps + 0.5),
    z: Math.floor(hitZ - normalZ * eps + 0.5),
  };
}

/**
 * Given the voxel that was hit and the face normal, compute the adjacent
 * voxel coordinate where a new block would be placed.
 */
export function placementFromHit(
  voxelX: number,
  voxelY: number,
  voxelZ: number,
  normalX: number,
  normalY: number,
  normalZ: number,
): { x: number; y: number; z: number } {
  return {
    x: voxelX + Math.round(normalX),
    y: voxelY + Math.round(normalY),
    z: voxelZ + Math.round(normalZ),
  };
}

/**
 * Get the camera forward direction as a unit vector from a Three.js camera.
 */
export function getCameraForward(camera: THREE.PerspectiveCamera): { x: number; y: number; z: number } {
  // Camera looks down -Z in local space; transform into world space
  const dir = { x: 0, y: 0, z: -1 };
  // Apply camera quaternion
  const q = camera.quaternion;
  const ix = q.w * dir.x + q.y * dir.z - q.z * dir.y;
  const iy = q.w * dir.y + q.z * dir.x - q.x * dir.z;
  const iz = q.w * dir.z + q.x * dir.y - q.y * dir.x;
  const iw = -q.x * dir.x - q.y * dir.y - q.z * dir.z;
  return {
    x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
    y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
    z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
  };
}

// ---------------------------------------------------------------------------
// Raycast
// ---------------------------------------------------------------------------

export interface RaycastHit {
  /** World position of the hit point */
  position: { x: number; y: number; z: number };
  /** Surface normal at the hit point */
  normal: { x: number; y: number; z: number };
  /** Distance from ray origin */
  distance: number;
}

/**
 * Cast a ray through the Rapier physics world to find the first voxel
 * collider hit within `maxDistance`.
 */
export function raycastVoxel(
  rapierModule: typeof RAPIER,
  rapierWorld: RAPIER.World,
  origin: { x: number; y: number; z: number },
  direction: { x: number; y: number; z: number },
  maxDistance: number,
): RaycastHit | null {
  const ray = new rapierModule.Ray(
    new rapierModule.Vector3(origin.x, origin.y, origin.z),
    new rapierModule.Vector3(direction.x, direction.y, direction.z),
  );

  const hit = rapierWorld.castRayAndGetNormal(ray, maxDistance, true);
  if (!hit) return null;

  const toi = hit.timeOfImpact;
  const hitPos = {
    x: origin.x + direction.x * toi,
    y: origin.y + direction.y * toi,
    z: origin.z + direction.z * toi,
  };

  return {
    position: hitPos,
    normal: { x: hit.normal.x, y: hit.normal.y, z: hit.normal.z },
    distance: toi,
  };
}

// ---------------------------------------------------------------------------
// Block Interaction System
// ---------------------------------------------------------------------------

export interface BlockInteractionSystem {
  /** Query what the player is looking at right now */
  query: (camera: THREE.PerspectiveCamera) => BlockInteractionResult;
  /** Place a block at the current placement position. Returns the delta or null. */
  placeBlock: (camera: THREE.PerspectiveCamera) => BlockDelta | null;
  /** Break the block the player is looking at. Returns the delta or null. */
  breakBlock: (camera: THREE.PerspectiveCamera) => BlockDelta | null;
  /** Get all accumulated deltas since last flush */
  getDeltas: () => readonly BlockDelta[];
  /** Clear accumulated deltas (after persisting) */
  flushDeltas: () => void;
  /** Get/set the selected block ID */
  selectedBlockId: number;
  /** Get/set the selected shape */
  selectedShape: PlaceableShape;
  /** Cycle to the next placeable block in the palette */
  cycleBlock: (direction: 1 | -1) => void;
  /** Cycle to the next shape and return its display name */
  cycleShape: () => string;
  /** Get the currently selected shape identifier */
  getSelectedShape: () => PlaceableShape;
  /** Get placement preview for the ghost wireframe */
  getPlacementPreview: (camera: THREE.PerspectiveCamera) => PlacementPreview | null;
  /** Get the name of the currently selected block */
  getSelectedBlockName: () => string;
  /** Get a display label combining block type + shape (e.g. "Stone [Slab]") */
  getSelectedBlockLabel: () => string;
  /** The list of placeable block IDs in the palette */
  readonly palette: readonly number[];
}

/**
 * Create the block interaction system. Manages raycasting, placement,
 * breaking, and delta tracking for persistence.
 */
export function createBlockInteraction(
  rapierModule: typeof RAPIER,
  rapierWorld: RAPIER.World,
  voxelMap: VoxelRenderer,
  _chunkWorld: ChunkWorld,
  config: Partial<BlockInteractionConfig> = {},
): BlockInteractionSystem {
  const reachDistance = config.reachDistance ?? 6;
  let selectedBlockId = config.selectedBlockId ?? 1;
  let selectedShape: PlaceableShape = config.selectedShape ?? 'cube';
  let shapeIndex = PLACEABLE_SHAPES.indexOf(selectedShape);

  // Build a palette of placeable blocks from the block registry
  const palette: number[] = [];
  const blockNames = new Map<number, string>();

  // Collect all registered block definitions that are collidable (placeable)
  // We iterate IDs 1-200 to cover base, biome, and shaped blocks
  for (let id = 1; id <= 200; id++) {
    const def = voxelMap.blockRegistry.get(id);
    if (def?.collidable) {
      palette.push(id);
      blockNames.set(id, def.name);
    }
  }

  // If palette is empty (shouldn't happen), add a default
  if (palette.length === 0) {
    palette.push(1);
    blockNames.set(1, 'Block');
  }

  // Ensure selectedBlockId is in the palette
  if (!palette.includes(selectedBlockId)) {
    selectedBlockId = palette[0];
  }

  // Accumulated deltas for persistence
  const deltas: BlockDelta[] = [];

  function query(camera: THREE.PerspectiveCamera): BlockInteractionResult {
    const origin = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    const direction = getCameraForward(camera);

    const hit = raycastVoxel(rapierModule, rapierWorld, origin, direction, reachDistance);
    if (!hit) {
      return { targetBlock: null, placementPosition: null, faceNormal: null };
    }

    const voxelPos = hitToVoxelCoord(
      hit.position.x,
      hit.position.y,
      hit.position.z,
      hit.normal.x,
      hit.normal.y,
      hit.normal.z,
    );

    // Look up the actual block at this position
    const voxelEntry = voxelMap.getVoxel({ x: voxelPos.x, y: voxelPos.y, z: voxelPos.z });
    const blockId = voxelEntry?.blockId ?? 0;

    const placementPos = placementFromHit(voxelPos.x, voxelPos.y, voxelPos.z, hit.normal.x, hit.normal.y, hit.normal.z);

    return {
      targetBlock: blockId > 0 ? { ...voxelPos, blockId } : null,
      placementPosition: placementPos,
      faceNormal: hit.normal,
    };
  }

  function placeBlock(camera: THREE.PerspectiveCamera): BlockDelta | null {
    const result = query(camera);
    if (!result.placementPosition) return null;

    const pos = result.placementPosition;

    // Don't place where the player is standing (within 1 block of camera)
    const dx = pos.x - camera.position.x;
    const dy = pos.y - camera.position.y;
    const dz = pos.z - camera.position.z;
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.8) return null;

    // Don't place below Y=0
    if (pos.y < 0) return null;

    // Resolve the block ID for the selected type + shape combination
    const baseName = blockNames.get(selectedBlockId) ?? '';
    const resolvedId = getBlockIdForTypeAndShape(baseName, selectedShape, selectedBlockId);

    voxelMap.setVoxel('Ground', {
      position: { x: pos.x, y: pos.y, z: pos.z },
      blockId: resolvedId,
    });

    const delta: BlockDelta = { x: pos.x, y: pos.y, z: pos.z, blockId: resolvedId };
    deltas.push(delta);

    return delta;
  }

  function breakBlock(camera: THREE.PerspectiveCamera): BlockDelta | null {
    const result = query(camera);
    if (!result.targetBlock) return null;

    const pos = result.targetBlock;

    voxelMap.removeVoxel('Ground', {
      position: { x: pos.x, y: pos.y, z: pos.z },
    });

    const delta: BlockDelta = { x: pos.x, y: pos.y, z: pos.z, blockId: 0 };
    deltas.push(delta);

    return delta;
  }

  function cycleBlock(direction: 1 | -1): void {
    const currentIdx = palette.indexOf(selectedBlockId);
    const nextIdx = (currentIdx + direction + palette.length) % palette.length;
    selectedBlockId = palette[nextIdx];
  }

  function cycleShape(): string {
    shapeIndex = (shapeIndex + 1) % PLACEABLE_SHAPES.length;
    selectedShape = PLACEABLE_SHAPES[shapeIndex];
    return SHAPE_DISPLAY_NAMES[selectedShape];
  }

  function getSelectedShape(): PlaceableShape {
    return selectedShape;
  }

  function getPlacementPreview(camera: THREE.PerspectiveCamera): PlacementPreview | null {
    const result = query(camera);
    if (!result.placementPosition) return null;
    return {
      position: result.placementPosition,
      shape: selectedShape,
    };
  }

  function getSelectedBlockName(): string {
    return blockNames.get(selectedBlockId) ?? 'Unknown';
  }

  function getSelectedBlockLabel(): string {
    const name = getSelectedBlockName();
    if (selectedShape === 'cube') return name;
    return `${name} [${SHAPE_DISPLAY_NAMES[selectedShape]}]`;
  }

  return {
    query,
    placeBlock,
    breakBlock,
    getDeltas: () => deltas,
    flushDeltas: () => {
      deltas.length = 0;
    },
    get selectedBlockId() {
      return selectedBlockId;
    },
    set selectedBlockId(id: number) {
      selectedBlockId = id;
    },
    get selectedShape() {
      return selectedShape;
    },
    set selectedShape(shape: PlaceableShape) {
      selectedShape = shape;
      shapeIndex = PLACEABLE_SHAPES.indexOf(shape);
    },
    cycleBlock,
    cycleShape,
    getSelectedShape,
    getPlacementPreview,
    getSelectedBlockName,
    getSelectedBlockLabel,
    palette,
  };
}
