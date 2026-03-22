import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Test createGameLoop public API: pause control, initial state, and accessors.
 * Uses a lightweight mock jpWorld (event emitter pattern) — no Three.js/DOM mocks.
 */

// Stub minimal document for pointer lock checks
beforeEach(() => {
  globalThis.document = {
    pointerLockElement: null,
    exitPointerLock: vi.fn(),
  } as unknown as Document;
});

// Mock heavy browser dependencies
vi.mock('@dimforge/rapier3d', () => ({
  default: { World: vi.fn() },
}));
vi.mock('../rendering/index.ts', () => ({
  DayNightCycle: vi.fn().mockImplementation(() => ({
    sceneObjects: [],
    update: vi.fn(),
    skyColor: { copy: vi.fn() },
  })),
}));
vi.mock('../ai/PlayerGovernor.ts', () => ({
  createPlayerGovernor: () => ({
    setContext: vi.fn(),
    update: () => ({ suggestedTarget: -1, threatLevel: 'none' as const, canDodge: true }),
  }),
}));
vi.mock('../content/index.ts', () => ({
  ContentRegistry: vi.fn().mockImplementation(() => ({
    getBiome: () => ({ bossId: 'test-boss' }),
    getBoss: () => ({ id: 'test-boss', tomePageDrop: 'dash' }),
  })),
}));

import { createGameLoop, type GameLoopContext } from './gameLoop';

/** Minimal mock jpWorld with event emitter + trigger helper. */
interface MockJpWorld {
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  _trigger: (event: string, ...args: unknown[]) => void;
}

function createMockContext(): GameLoopContext & { jpWorld: MockJpWorld } {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};

  const jpWorld: MockJpWorld = {
    on: (event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);
    },
    _trigger: (event: string, ...args: unknown[]) => {
      for (const h of handlers[event] ?? []) h(...args);
    },
  };

  return {
    jpWorld: jpWorld as GameLoopContext['jpWorld'] & MockJpWorld,
    rapierWorld: { step: vi.fn() } as unknown as GameLoopContext['rapierWorld'],
    gameWorld: {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
    } as unknown as GameLoopContext['gameWorld'],
    scene: {
      background: null,
      fog: null,
    } as unknown as GameLoopContext['scene'],
    dayNight: {
      update: vi.fn(),
      skyColor: { copy: vi.fn() },
      sceneObjects: [],
    } as unknown as GameLoopContext['dayNight'],
    cam: {
      camera: { position: { x: 10, y: 5, z: 10 } },
      euler: {} as unknown as GameLoopContext['cam']['euler'],
      applyMovement: vi.fn(),
      applyLook: vi.fn(),
      getPosition: vi.fn(),
    } as unknown as GameLoopContext['cam'],
    inputSystem: {
      update: vi.fn(),
      actionMap: { isActive: vi.fn().mockReturnValue(false) },
      keyboard: { parryDown: false },
    } as unknown as GameLoopContext['inputSystem'],
    enemies: [],
    yukaManager: { update: vi.fn() } as unknown as GameLoopContext['yukaManager'],
    combat: {
      state: { phase: 'playing', playerHealth: 100, maxHealth: 100 },
      triggerAttack: vi.fn(),
      update: vi.fn(),
      cleanup: vi.fn(),
    } as unknown as GameLoopContext['combat'],
    isMobile: false,
    mobileInput: { moveX: 0, moveZ: 0, lookX: 0, lookY: 0, action: null },
    getSurfaceY: () => 5,
    weatherSystem: null,
    particles: null,
  };
}

describe('createGameLoop', () => {
  it('returns isPaused false initially', () => {
    const ctx = createMockContext();
    const loop = createGameLoop(ctx);
    expect(loop.isPaused()).toBe(false);
  });

  it('togglePause flips pause state', () => {
    const ctx = createMockContext();
    const loop = createGameLoop(ctx);
    loop.togglePause();
    expect(loop.isPaused()).toBe(true);
    loop.togglePause();
    expect(loop.isPaused()).toBe(false);
  });

  it('getContext returns explore initially', () => {
    const ctx = createMockContext();
    const loop = createGameLoop(ctx);
    expect(loop.getContext()).toBe('explore');
  });

  it('getGovernorOutput returns default values initially', () => {
    const ctx = createMockContext();
    const loop = createGameLoop(ctx);
    const gov = loop.getGovernorOutput();
    expect(gov.suggestedTarget).toBe(-1);
    expect(gov.threatLevel).toBe('none');
    expect(gov.canDodge).toBe(true);
  });

  it('registers beforeFixedUpdate handler on jpWorld', () => {
    const ctx = createMockContext();
    createGameLoop(ctx);
    // Trigger physics step — should call rapierWorld.step()
    (ctx.jpWorld as MockJpWorld)._trigger('beforeFixedUpdate');
    expect(ctx.rapierWorld.step).toHaveBeenCalled();
  });

  it('beforeUpdate skips when paused', () => {
    const ctx = createMockContext();
    const loop = createGameLoop(ctx);
    loop.togglePause();
    (ctx.jpWorld as MockJpWorld)._trigger('beforeUpdate', 0.016);
    // Input should NOT be updated when paused
    expect(ctx.inputSystem.update).not.toHaveBeenCalled();
  });

  it('beforeUpdate skips when phase is not playing', () => {
    const ctx = createMockContext();
    (ctx.combat.state as { phase: string }).phase = 'dead';
    createGameLoop(ctx);
    (ctx.jpWorld as MockJpWorld)._trigger('beforeUpdate', 0.016);
    expect(ctx.inputSystem.update).not.toHaveBeenCalled();
  });

  it('beforeUpdate processes frame when playing and unpaused', () => {
    const ctx = createMockContext();
    createGameLoop(ctx);
    (ctx.jpWorld as MockJpWorld)._trigger('beforeUpdate', 0.016);
    // Input system should be updated
    expect(ctx.inputSystem.update).toHaveBeenCalled();
    // Combat should be updated
    expect(ctx.combat.update).toHaveBeenCalled();
  });
});
