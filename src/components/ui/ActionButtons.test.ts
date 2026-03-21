import { describe, expect, it, vi } from 'vitest';
import { ActionButtons } from './ActionButtons';

describe('ActionButtons', () => {
  /**
   * ActionButtons is a React component — we test its contract as a pure
   * function returning a virtual DOM tree (no real DOM needed).
   */

  it('returns a non-null element (renders)', () => {
    const result = ActionButtons({ onAttack: () => {}, onDodge: () => {} });
    expect(result).not.toBeNull();
    expect(result.props.children).toHaveLength(2);
  });

  it('calls onAttack when attack button fires onPointerDown', () => {
    const onAttack = vi.fn();
    const onDodge = vi.fn();
    const tree = ActionButtons({ onAttack, onDodge });

    // The tree is a div with two button children
    const [attackBtn] = tree.props.children;

    // Simulate the onPointerDown by calling the handler directly
    const fakeEvent = { preventDefault: vi.fn() };
    attackBtn.props.onPointerDown(fakeEvent);

    expect(onAttack).toHaveBeenCalledOnce();
    expect(onDodge).not.toHaveBeenCalled();
    expect(fakeEvent.preventDefault).toHaveBeenCalledOnce();
  });

  it('calls onDodge when dodge button fires onPointerDown', () => {
    const onAttack = vi.fn();
    const onDodge = vi.fn();
    const tree = ActionButtons({ onAttack, onDodge });

    const [_attackBtn, dodgeBtn] = tree.props.children;

    const fakeEvent = { preventDefault: vi.fn() };
    dodgeBtn.props.onPointerDown(fakeEvent);

    expect(onDodge).toHaveBeenCalledOnce();
    expect(onAttack).not.toHaveBeenCalled();
    expect(fakeEvent.preventDefault).toHaveBeenCalledOnce();
  });

  it('attack button has correct test id', () => {
    const tree = ActionButtons({ onAttack: () => {}, onDodge: () => {} });
    const [attackBtn] = tree.props.children;
    expect(attackBtn.props['data-testid']).toBe('attack-button');
  });

  it('dodge button has correct test id', () => {
    const tree = ActionButtons({ onAttack: () => {}, onDodge: () => {} });
    const [_, dodgeBtn] = tree.props.children;
    expect(dodgeBtn.props['data-testid']).toBe('dodge-button');
  });
});
