import { describe, expect, it } from 'vitest';
import { DOCK_PROXIMITY_RADIUS, DOCKS, type DockDef, findNearbyDock, getDockEndPosition } from './hubDocks';

const ALL_BIOME_IDS = ['forest', 'desert', 'tundra', 'volcanic', 'swamp', 'crystal-caves', 'sky-ruins', 'deep-ocean'];

/** Helper to find a dock by biome — throws if not found so tests fail clearly. */
function getDock(biomeId: string): DockDef {
  const dock = DOCKS.find((d) => d.biomeId === biomeId);
  if (!dock) throw new Error(`Dock not found for biome: ${biomeId}`);
  return dock;
}

describe('DOCKS', () => {
  it('defines exactly 8 docks, one per biome', () => {
    expect(DOCKS).toHaveLength(8);
  });

  it('each dock has a unique biomeId matching a known biome', () => {
    const ids = DOCKS.map((d) => d.biomeId);
    expect(new Set(ids).size).toBe(8);
    for (const id of ids) {
      expect(ALL_BIOME_IDS).toContain(id);
    }
  });

  it('each dock has a non-empty name', () => {
    for (const dock of DOCKS) {
      expect(dock.name.length).toBeGreaterThan(0);
    }
  });

  it('each dock has a valid direction', () => {
    const validDirections = ['north', 'south', 'east', 'west'];
    for (const dock of DOCKS) {
      expect(validDirections).toContain(dock.direction);
    }
  });

  it('each dock has a color that is a non-negative integer', () => {
    for (const dock of DOCKS) {
      expect(Number.isInteger(dock.color)).toBe(true);
      expect(dock.color).toBeGreaterThanOrEqual(0);
      expect(dock.color).toBeLessThanOrEqual(0xffffff);
    }
  });

  it('forest dock is at a consistent position (x=28, z=8, east)', () => {
    const forest = getDock('forest');
    expect(forest.x).toBe(28);
    expect(forest.z).toBe(8);
    expect(forest.direction).toBe('east');
  });

  it('no two docks overlap at the same (x, z) position', () => {
    const positions = new Set(DOCKS.map((d) => `${d.x},${d.z}`));
    expect(positions.size).toBe(DOCKS.length);
  });
});

describe('getDockEndPosition', () => {
  it('returns a position offset from the dock start along its direction', () => {
    const eastDock: DockDef = { biomeId: 'test', name: 'Test', x: 28, z: 8, direction: 'east', color: 0x000000 };
    const end = getDockEndPosition(eastDock);
    expect(end.x).toBeGreaterThan(eastDock.x);
    expect(end.z).toBe(eastDock.z);
  });

  it('west dock extends in -x direction', () => {
    const westDock: DockDef = { biomeId: 'test', name: 'Test', x: 4, z: 8, direction: 'west', color: 0x000000 };
    const end = getDockEndPosition(westDock);
    expect(end.x).toBeLessThan(westDock.x);
    expect(end.z).toBe(westDock.z);
  });
});

describe('findNearbyDock', () => {
  it('returns null when player is far from all docks', () => {
    const result = findNearbyDock(16, 16, DOCKS);
    expect(result).toBeNull();
  });

  it('returns the forest dock when player stands at its midpoint', () => {
    const forestDock = getDock('forest');
    const mid = getDockEndPosition(forestDock);
    const result = findNearbyDock(mid.x, mid.z, DOCKS);
    expect(result).not.toBeNull();
    expect(result?.biomeId).toBe('forest');
    expect(result?.name).toBe('Whispering Woods');
  });

  it('returns the closest dock when player is between two', () => {
    // Stand right next to the forest dock end
    const forestDock = getDock('forest');
    const mid = getDockEndPosition(forestDock);
    const result = findNearbyDock(mid.x, mid.z, DOCKS);
    expect(result).not.toBeNull();
    expect(result?.biomeId).toBe('forest');
  });

  it('includes distance in the result', () => {
    const forestDock = getDock('forest');
    const mid = getDockEndPosition(forestDock);
    const result = findNearbyDock(mid.x + 1, mid.z, DOCKS);
    expect(result).not.toBeNull();
    expect(result?.distance).toBeGreaterThan(0);
    expect(result?.distance).toBeLessThan(DOCK_PROXIMITY_RADIUS);
  });

  it('respects the proximity radius boundary', () => {
    const forestDock = getDock('forest');
    const mid = getDockEndPosition(forestDock);
    // Place player well beyond the radius
    const farResult = findNearbyDock(mid.x + DOCK_PROXIMITY_RADIUS + 5, mid.z, DOCKS);
    expect(farResult).toBeNull();
  });
});
