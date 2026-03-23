import { describe, expect, it } from 'vitest';
import { ActionButtons } from './ActionButtons';

describe('ActionButtons', () => {
  it('is a function component', () => {
    expect(typeof ActionButtons).toBe('function');
  });

  it('returns a non-null element', () => {
    const result = ActionButtons({ onAttack: () => {}, onDodge: () => {} });
    expect(result).not.toBeNull();
  });

  it('accepts all callback props without error', () => {
    expect(() =>
      ActionButtons({
        onAttack: () => {},
        onDodge: () => {},
        onBlock: () => {},
        onBlockRelease: () => {},
        onInteract: () => {},
        onJump: () => {},
        onPlaceBlock: () => {},
        onBreakBlock: () => {},
        onCycleShape: () => {},
        currentShapeName: 'Cube',
      }),
    ).not.toThrow();
  });

  it('does not throw when optional callbacks are omitted', () => {
    expect(() => ActionButtons({ onAttack: () => {}, onDodge: () => {} })).not.toThrow();
  });
});
