import { describe, expect, it } from 'vitest';
import { calculateBreakTime, canToolBreakBlock, TOOL_BREAK_SPEEDS } from './block-interaction';

describe('Tool tier system', () => {
  it('has 5 tool tiers in ascending speed', () => {
    const tiers = Object.keys(TOOL_BREAK_SPEEDS);
    expect(tiers).toEqual(['hand', 'wood', 'stone', 'gold', 'diamond']);

    // Each tier should be faster (lower seconds per hardness)
    for (let i = 1; i < tiers.length; i++) {
      expect(TOOL_BREAK_SPEEDS[tiers[i]]).toBeLessThan(TOOL_BREAK_SPEEDS[tiers[i - 1]]);
    }
  });

  it('diamond tool breaks blocks 10x faster than bare hands', () => {
    const ratio = TOOL_BREAK_SPEEDS.hand / TOOL_BREAK_SPEEDS.diamond;
    expect(ratio).toBe(10);
  });

  it('calculateBreakTime scales with tool tier', () => {
    const stoneBlockId = 3; // hardness 1.5
    const handTime = calculateBreakTime(stoneBlockId, 'hand');
    const woodTime = calculateBreakTime(stoneBlockId, 'wood');
    const diamondTime = calculateBreakTime(stoneBlockId, 'diamond');

    expect(handTime).toBe(3.0); // 1.5 * 2.0
    expect(woodTime).toBe(1.5); // 1.5 * 1.0
    expect(diamondTime).toBeCloseTo(0.3); // 1.5 * 0.2
  });

  it('canToolBreakBlock blocks obsidian with non-diamond tools', () => {
    expect(canToolBreakBlock('hand', 30)).toBe(false);
    expect(canToolBreakBlock('wood', 30)).toBe(false);
    expect(canToolBreakBlock('stone', 30)).toBe(false);
    expect(canToolBreakBlock('gold', 30)).toBe(false);
    expect(canToolBreakBlock('diamond', 30)).toBe(true);
  });

  it('canToolBreakBlock allows any tool for normal blocks', () => {
    expect(canToolBreakBlock('hand', 1)).toBe(true); // grass
    expect(canToolBreakBlock('hand', 3)).toBe(true); // stone
    expect(canToolBreakBlock('wood', 52)).toBe(true); // amethyst
  });
});
