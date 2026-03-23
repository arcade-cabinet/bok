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
// Types
// ---------------------------------------------------------------------------

export interface BlockInteractionConfig {
  /** Max distance for block interaction (default: 6) */
  reachDistance: number;
  /** Currently selected block ID to place */
  selectedBlockId: number;
  /** Currently selected block shape */
  selectedShape: string; // 'cube' | 'slabBottom' | 'ramp' etc.
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
  selectedShape: string;
  /** Cycle to the next placeable block in the palette */
  cycleBlock: (direction: 1 | -1) => void;
  /** Get the name of the currently selected block */
  getSelectedBlockName: () => string;
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
  let selectedShape = config.selectedShape ?? 'cube';

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

    voxelMap.setVoxel('Ground', {
      position: { x: pos.x, y: pos.y, z: pos.z },
      blockId: selectedBlockId,
    });

    const delta: BlockDelta = { x: pos.x, y: pos.y, z: pos.z, blockId: selectedBlockId };
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

  function getSelectedBlockName(): string {
    return blockNames.get(selectedBlockId) ?? 'Unknown';
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
    set selectedShape(shape: string) {
      selectedShape = shape;
    },
    cycleBlock,
    getSelectedBlockName,
    palette,
  };
}
