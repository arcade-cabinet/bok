import { describe, expect, it, vi } from 'vitest';
import { ActionButtons } from './ActionButtons';

describe('ActionButtons', () => {
  /**
   * ActionButtons is a React component — we test its contract as a pure
   * function returning a virtual DOM tree (no real DOM needed).
   */

  it('returns a non-null element with all 4 buttons', () => {
    const result = ActionButtons({ onAttack: () => {}, onDodge: () => {} });
    expect(result).not.toBeNull();
    expect(result.props.children).toHaveLength(4);
  });

  it('calls onAttack when attack button fires onPointerDown', () => {
    const onAttack = vi.fn();
    const onDodge = vi.fn();
    const tree = ActionButtons({ onAttack, onDodge });

    // The tree is a div with four button children
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

  it('calls onBlock when block button fires onPointerDown', () => {
    const onBlock = vi.fn();
    const tree = ActionButtons({ onAttack: () => {}, onDodge: () => {}, onBlock });

    const [_attackBtn, _dodgeBtn, blockBtn] = tree.props.children;

    const fakeEvent = { preventDefault: vi.fn() };
    blockBtn.props.onPointerDown(fakeEvent);

    expect(onBlock).toHaveBeenCalledOnce();
    expect(fakeEvent.preventDefault).toHaveBeenCalledOnce();
  });

  it('calls onBlockRelease when block button fires onPointerUp', () => {
    const onBlockRelease = vi.fn();
    const tree = ActionButtons({ onAttack: () => {}, onDodge: () => {}, onBlockRelease });

    const [_attackBtn, _dodgeBtn, blockBtn] = tree.props.children;

    const fakeEvent = { preventDefault: vi.fn() };
    blockBtn.props.onPointerUp(fakeEvent);

    expect(onBlockRelease).toHaveBeenCalledOnce();
    expect(fakeEvent.preventDefault).toHaveBeenCalledOnce();
  });

  it('calls onBlockRelease when pointer leaves block button', () => {
    const onBlockRelease = vi.fn();
    const tree = ActionButtons({ onAttack: () => {}, onDodge: () => {}, onBlockRelease });

    const [_attackBtn, _dodgeBtn, blockBtn] = tree.props.children;

    const fakeEvent = { preventDefault: vi.fn() };
    blockBtn.props.onPointerLeave(fakeEvent);

    expect(onBlockRelease).toHaveBeenCalledOnce();
  });

  it('calls onInteract when interact button fires onPointerDown', () => {
    const onInteract = vi.fn();
    const tree = ActionButtons({ onAttack: () => {}, onDodge: () => {}, onInteract });

    const [_attackBtn, _dodgeBtn, _blockBtn, interactBtn] = tree.props.children;

    const fakeEvent = { preventDefault: vi.fn() };
    interactBtn.props.onPointerDown(fakeEvent);

    expect(onInteract).toHaveBeenCalledOnce();
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

  it('block button has correct test id', () => {
    const tree = ActionButtons({ onAttack: () => {}, onDodge: () => {} });
    const [_, _d, blockBtn] = tree.props.children;
    expect(blockBtn.props['data-testid']).toBe('block-button');
  });

  it('interact button has correct test id', () => {
    const tree = ActionButtons({ onAttack: () => {}, onDodge: () => {} });
    const [_, _d, _b, interactBtn] = tree.props.children;
    expect(interactBtn.props['data-testid']).toBe('interact-button');
  });

  it('does not throw when optional callbacks are omitted', () => {
    const tree = ActionButtons({ onAttack: () => {}, onDodge: () => {} });
    const [_attackBtn, _dodgeBtn, blockBtn, interactBtn] = tree.props.children;

    const fakeEvent = { preventDefault: vi.fn() };
    // Should not throw even without optional callbacks
    expect(() => blockBtn.props.onPointerDown(fakeEvent)).not.toThrow();
    expect(() => blockBtn.props.onPointerUp(fakeEvent)).not.toThrow();
    expect(() => blockBtn.props.onPointerLeave(fakeEvent)).not.toThrow();
    expect(() => interactBtn.props.onPointerDown(fakeEvent)).not.toThrow();
  });
});
