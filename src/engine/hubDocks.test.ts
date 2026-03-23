import { describe, expect, it } from 'vitest';
import { DOCKS, findNearbyDock, getDockEndPosition } from './hubDocks';

describe('hubDocks', () => {
  it('defines 8 docks — one per biome', () => {
    expect(DOCKS).toHaveLength(8);
    const ids = DOCKS.map((d) => d.biomeId);
    expect(new Set(ids).size).toBe(8);
  });

  it('forest dock is always accessible (first biome)', () => {
    const forest = DOCKS.find((d) => d.biomeId === 'forest');
    expect(forest).toBeDefined();
    expect(forest?.name).toBe('Whispering Woods');
  });

  it('getDockEndPosition returns midpoint of pier for east-facing dock', () => {
    const dock = DOCKS.find((d) => d.biomeId === 'forest');
    expect(dock).toBeDefined();
    if (!dock) return;
    const pos = getDockEndPosition(dock);
    expect(pos.x).toBe(dock.x + 3.5);
    expect(pos.z).toBe(dock.z);
  });

  it('getDockEndPosition returns midpoint of pier for west-facing dock', () => {
    const dock = DOCKS.find((d) => d.biomeId === 'swamp');
    expect(dock).toBeDefined();
    if (!dock) return;
    const pos = getDockEndPosition(dock);
    expect(pos.x).toBe(dock.x - 3.5);
    expect(pos.z).toBe(dock.z);
  });

  it('findNearbyDock returns dock when player is within proximity', () => {
    const dock = DOCKS.find((d) => d.biomeId === 'forest');
    expect(dock).toBeDefined();
    if (!dock) return;
    const endPos = getDockEndPosition(dock);
    const result = findNearbyDock(endPos.x, endPos.z, DOCKS);
    expect(result).not.toBeNull();
    expect(result?.biomeId).toBe('forest');
    expect(result?.distance).toBeCloseTo(0);
  });

  it('findNearbyDock returns null when player is far from all docks', () => {
    const result = findNearbyDock(16, 16, DOCKS); // center of hub
    expect(result).toBeNull();
  });

  it('findNearbyDock returns closest dock when near multiple', () => {
    const result = findNearbyDock(31, 11, DOCKS);
    expect(result).not.toBeNull();
    expect(['forest', 'desert']).toContain(result?.biomeId);
  });
});
