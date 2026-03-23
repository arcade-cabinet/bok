/**
 * @module engine/hubDocks
 * @role Dock definitions and proximity detection for the hub island
 * @input Player position
 * @output Dock definitions, proximity results
 * @tested hub.test.ts
 *
 * Separated from hub.ts to allow pure-logic testing without Rapier/JollyPixel dependencies.
 */

/** A dock extending from the hub island shoreline — one per island biome. */
export interface DockDef {
  biomeId: string;
  name: string;
  x: number;
  z: number;
  direction: 'north' | 'south' | 'east' | 'west';
  color: number;
}

/** All 8 biome docks around the hub island perimeter. */
export const DOCKS: DockDef[] = [
  { biomeId: 'forest', name: 'Whispering Woods', x: 28, z: 8, direction: 'east', color: 0x2d5a27 },
  { biomeId: 'desert', name: 'Sunscorched Dunes', x: 28, z: 14, direction: 'east', color: 0xc2a355 },
  { biomeId: 'tundra', name: 'Frostbite Expanse', x: 28, z: 20, direction: 'east', color: 0x8ba5c7 },
  { biomeId: 'volcanic', name: 'Cinderpeak Caldera', x: 28, z: 26, direction: 'east', color: 0x8b2500 },
  { biomeId: 'swamp', name: 'Rothollow Marsh', x: 4, z: 8, direction: 'west', color: 0x3b4a1c },
  { biomeId: 'crystal-caves', name: 'Prismatic Depths', x: 4, z: 14, direction: 'west', color: 0x4b0082 },
  { biomeId: 'sky-ruins', name: 'Stormspire Remnants', x: 4, z: 20, direction: 'west', color: 0xb0d4f1 },
  { biomeId: 'deep-ocean', name: 'Abyssal Trench', x: 4, z: 26, direction: 'west', color: 0x0d2137 },
];

/** Pier length in blocks (extends from dock start into the water). */
export const PIER_LENGTH = 7;

/** Width of the pier walkway in blocks. */
export const PIER_WIDTH = 3;

/** Y level for the dock walkway surface (just above water). */
export const DOCK_SURFACE_Y = 3;

/** Proximity threshold for detecting the player near a dock (world units). */
export const DOCK_PROXIMITY_RADIUS = 6;

/** Result of checking which dock the player is near, if any. */
export interface DockProximity {
  biomeId: string;
  name: string;
  color: number;
  distance: number;
}

/**
 * Compute the midpoint of a dock's pier (used for proximity detection and label placement).
 */
export function getDockEndPosition(dock: DockDef): { x: number; z: number } {
  const dx = dock.direction === 'east' ? 1 : dock.direction === 'west' ? -1 : 0;
  const dz = dock.direction === 'south' ? 1 : dock.direction === 'north' ? -1 : 0;
  return {
    x: dock.x + dx * (PIER_LENGTH / 2),
    z: dock.z + dz * (PIER_LENGTH / 2),
  };
}

/**
 * Find the nearest dock to the player within proximity range.
 * Returns null if no dock is within DOCK_PROXIMITY_RADIUS.
 */
export function findNearbyDock(playerX: number, playerZ: number, docks: DockDef[]): DockProximity | null {
  let closest: DockProximity | null = null;
  let minDist = DOCK_PROXIMITY_RADIUS;

  for (const dock of docks) {
    // Check distance to pier midpoint
    const dx = dock.direction === 'east' ? 1 : dock.direction === 'west' ? -1 : 0;
    const dz = dock.direction === 'south' ? 1 : dock.direction === 'north' ? -1 : 0;
    const midX = dock.x + dx * (PIER_LENGTH / 2);
    const midZ = dock.z + dz * (PIER_LENGTH / 2);
    const dist = Math.sqrt((playerX - midX) ** 2 + (playerZ - midZ) ** 2);

    if (dist < minDist) {
      minDist = dist;
      closest = {
        biomeId: dock.biomeId,
        name: dock.name,
        color: dock.color,
        distance: dist,
      };
    }
  }
  return closest;
}
