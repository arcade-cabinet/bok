import { describe, expect, it } from 'vitest';
import {
  advanceBreaking,
  breakingTargetChanged,
  calculateBreakTime,
  canToolBreakBlock,
  createBreakingState,
  getBlockIdForTypeAndShape,
  hitToVoxelCoord,
  PLACEABLE_SHAPES,
  placementFromHit,
  SHAPE_DISPLAY_NAMES,
} from './block-interaction';

describe('hitToVoxelCoord', () => {
  it('converts a hit on the +Y face of a block at (3, 5, 2) to the correct voxel', () => {
    // Hit the top of voxel at (3, 5, 2): hit point is (3.3, 6.0, 2.7), normal is (0, 1, 0)
    const result = hitToVoxelCoord(3.3, 6.0, 2.7, 0, 1, 0);
    expect(result).toEqual({ x: 3, y: 6, z: 3 });
  });

  it('converts a hit on the +X face to the correct voxel', () => {
    // Hit the +X face of voxel at (5, 3, 2). Voxel centers are at integers,
    // so the +X face of voxel 5 is at x=5.5. Stepping into the block by eps
    // gives 5.49, which rounds to voxel 5.
    const result = hitToVoxelCoord(5.5, 3.5, 2.5, 1, 0, 0);
    expect(result).toEqual({ x: 5, y: 4, z: 3 });
  });

  it('converts a hit on the -Z face to the correct voxel', () => {
    // Hit the front face of voxel at (2, 3, 4): hit at (2.5, 3.5, 3.5), normal (0, 0, -1)
    const result = hitToVoxelCoord(2.5, 3.5, 3.5, 0, 0, -1);
    // z: floor(3.5 - (-1)*0.01 + 0.5) = floor(3.5 + 0.01 + 0.5) = floor(4.01) = 4
    expect(result).toEqual({ x: 3, y: 4, z: 4 });
  });

  it('handles negative coordinates', () => {
    const result = hitToVoxelCoord(-3.5, 2.0, -1.5, 0, 1, 0);
    // y: floor(2.0 - 0.01 + 0.5) = floor(2.49) = 2
    // x: floor(-3.5 + 0.5) = floor(-3.0) = -3
    // z: floor(-1.5 + 0.5) = floor(-1.0) = -1
    expect(result).toEqual({ x: -3, y: 2, z: -1 });
  });
});

describe('placementFromHit', () => {
  it('places on top of a block (+Y normal)', () => {
    const result = placementFromHit(5, 3, 2, 0, 1, 0);
    expect(result).toEqual({ x: 5, y: 4, z: 2 });
  });

  it('places to the right of a block (+X normal)', () => {
    const result = placementFromHit(5, 3, 2, 1, 0, 0);
    expect(result).toEqual({ x: 6, y: 3, z: 2 });
  });

  it('places to the left of a block (-X normal)', () => {
    const result = placementFromHit(5, 3, 2, -1, 0, 0);
    expect(result).toEqual({ x: 4, y: 3, z: 2 });
  });

  it('places below a block (-Y normal)', () => {
    const result = placementFromHit(5, 3, 2, 0, -1, 0);
    expect(result).toEqual({ x: 5, y: 2, z: 2 });
  });

  it('places behind a block (+Z normal)', () => {
    const result = placementFromHit(5, 3, 2, 0, 0, 1);
    expect(result).toEqual({ x: 5, y: 3, z: 3 });
  });

  it('places in front of a block (-Z normal)', () => {
    const result = placementFromHit(5, 3, 2, 0, 0, -1);
    expect(result).toEqual({ x: 5, y: 3, z: 1 });
  });

  it('handles negative voxel coordinates', () => {
    const result = placementFromHit(-3, 0, -5, 0, 1, 0);
    expect(result).toEqual({ x: -3, y: 1, z: -5 });
  });
});

describe('calculateBreakTime', () => {
  it('calculates stone with wood tool = 1.5 * 1.0 = 1.5s', () => {
    // Stone (blockId 3) has hardness 1.5, wood tool speed is 1.0
    expect(calculateBreakTime(3, 'wood')).toBe(1.5);
  });

  it('calculates grass with diamond tool = 0.5 * 0.2 = 0.1s', () => {
    // Grass (blockId 1) has hardness 0.5, diamond tool speed is 0.2
    expect(calculateBreakTime(1, 'diamond')).toBeCloseTo(0.1);
  });

  it('calculates sand with bare hands = 0.3 * 2.0 = 0.6s', () => {
    expect(calculateBreakTime(5, 'hand')).toBeCloseTo(0.6);
  });

  it('calculates obsidian with diamond = 3.0 * 0.2 = 0.6s', () => {
    expect(calculateBreakTime(30, 'diamond')).toBeCloseTo(0.6);
  });

  it('calculates leaves with bare hands = 0.2 * 2.0 = 0.4s', () => {
    expect(calculateBreakTime(7, 'hand')).toBeCloseTo(0.4);
  });

  it('uses default hardness for unknown blocks', () => {
    // Unknown block gets DEFAULT_BLOCK_HARDNESS (1.0) * wood (1.0) = 1.0
    expect(calculateBreakTime(999, 'wood')).toBe(1.0);
  });

  it('uses hand speed for unknown tool tiers', () => {
    // Stone (1.5) * hand (2.0) = 3.0
    expect(calculateBreakTime(3, 'mythril')).toBe(3.0);
  });
});

describe('canToolBreakBlock', () => {
  it('allows any tool on blocks with no requirement', () => {
    expect(canToolBreakBlock('hand', 1)).toBe(true);
    expect(canToolBreakBlock('wood', 3)).toBe(true);
    expect(canToolBreakBlock('diamond', 5)).toBe(true);
  });

  it('blocks obsidian without diamond tool', () => {
    expect(canToolBreakBlock('hand', 30)).toBe(false);
    expect(canToolBreakBlock('wood', 30)).toBe(false);
    expect(canToolBreakBlock('stone', 30)).toBe(false);
    expect(canToolBreakBlock('gold', 30)).toBe(false);
  });

  it('allows obsidian with diamond tool', () => {
    expect(canToolBreakBlock('diamond', 30)).toBe(true);
  });

  it('returns false for unknown tool tiers on restricted blocks', () => {
    expect(canToolBreakBlock('mythril', 30)).toBe(false);
  });
});

describe('BreakingState', () => {
  it('creates a breaking state with correct totalTime', () => {
    const state = createBreakingState(5, 3, 2, 3, 'wood');
    expect(state.targetX).toBe(5);
    expect(state.targetY).toBe(3);
    expect(state.targetZ).toBe(2);
    expect(state.targetBlockId).toBe(3);
    expect(state.progress).toBe(0);
    expect(state.totalTime).toBe(1.5); // stone hardness 1.5 * wood speed 1.0
  });

  it('advances progress correctly over time', () => {
    const state = createBreakingState(0, 0, 0, 3, 'wood'); // totalTime = 1.5s
    advanceBreaking(state, 0.75); // half done
    expect(state.progress).toBeCloseTo(0.5);
    advanceBreaking(state, 0.75); // fully done
    expect(state.progress).toBe(1.0);
  });

  it('clamps progress at 1.0', () => {
    const state = createBreakingState(0, 0, 0, 7, 'diamond'); // totalTime = 0.04s
    advanceBreaking(state, 1.0); // way more than needed
    expect(state.progress).toBe(1.0);
  });

  it('detects target change when position differs', () => {
    const state = createBreakingState(5, 3, 2, 1, 'hand');
    expect(breakingTargetChanged(state, { x: 5, y: 3, z: 2, blockId: 1 })).toBe(false);
    expect(breakingTargetChanged(state, { x: 6, y: 3, z: 2, blockId: 1 })).toBe(true);
    expect(breakingTargetChanged(state, { x: 5, y: 4, z: 2, blockId: 1 })).toBe(true);
    expect(breakingTargetChanged(state, { x: 5, y: 3, z: 3, blockId: 1 })).toBe(true);
  });

  it('detects target change when state is null', () => {
    expect(breakingTargetChanged(null, { x: 5, y: 3, z: 2, blockId: 1 })).toBe(true);
  });

  it('detects target change when target is null', () => {
    const state = createBreakingState(5, 3, 2, 1, 'hand');
    expect(breakingTargetChanged(state, null)).toBe(true);
  });
});

describe('PLACEABLE_SHAPES', () => {
  it('contains all 6 expected shapes', () => {
    expect(PLACEABLE_SHAPES).toEqual(['cube', 'slabBottom', 'slabTop', 'poleY', 'ramp', 'stair']);
    expect(PLACEABLE_SHAPES.length).toBe(6);
  });

  it('has display names for every shape', () => {
    for (const shape of PLACEABLE_SHAPES) {
      expect(SHAPE_DISPLAY_NAMES[shape]).toBeDefined();
      expect(typeof SHAPE_DISPLAY_NAMES[shape]).toBe('string');
      expect(SHAPE_DISPLAY_NAMES[shape].length).toBeGreaterThan(0);
    }
  });
});

describe('getBlockIdForTypeAndShape', () => {
  it('returns base cube ID for cube shape', () => {
    expect(getBlockIdForTypeAndShape('Stone', 'cube', 3)).toBe(3);
    expect(getBlockIdForTypeAndShape('Wood', 'cube', 6)).toBe(6);
    expect(getBlockIdForTypeAndShape('Sand', 'cube', 5)).toBe(5);
  });

  it('returns shaped block IDs for non-cube shapes', () => {
    expect(getBlockIdForTypeAndShape('Stone', 'slabBottom', 3)).toBe(100);
    expect(getBlockIdForTypeAndShape('Wood', 'slabBottom', 6)).toBe(101);
    expect(getBlockIdForTypeAndShape('Stone', 'poleY', 3)).toBe(110);
    expect(getBlockIdForTypeAndShape('Stone', 'ramp', 3)).toBe(121);
    expect(getBlockIdForTypeAndShape('Stone', 'stair', 3)).toBe(130);
    expect(getBlockIdForTypeAndShape('Stone', 'slabTop', 3)).toBe(140);
  });

  it('falls back to cube when shape does not exist for type', () => {
    // Wood has no ramp variant — should fall back to Wood cube (6)
    expect(getBlockIdForTypeAndShape('Wood', 'ramp', 6)).toBe(6);
    // Dirt has only cube — should fall back for any other shape
    expect(getBlockIdForTypeAndShape('Dirt', 'slabBottom', 2)).toBe(2);
  });

  it('returns fallback block ID for unknown types', () => {
    expect(getBlockIdForTypeAndShape('Obsidian', 'cube', 30)).toBe(30);
    expect(getBlockIdForTypeAndShape('Unknown', 'ramp', 99)).toBe(99);
  });

  it('returns Grass ramp for Grass + ramp', () => {
    expect(getBlockIdForTypeAndShape('Grass', 'ramp', 1)).toBe(120);
  });

  it('returns Sand ramp for Sand + ramp', () => {
    expect(getBlockIdForTypeAndShape('Sand', 'ramp', 5)).toBe(122);
  });
});
