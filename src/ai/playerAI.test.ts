import { describe, expect, it, vi } from 'vitest';

import type { GameInstance } from '../engine/GameEngine';
import type { EngineEvent, EngineState } from '../engine/types';
import { PlayerAI } from './playerAI';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal GameInstance mock — only the methods PlayerAI calls. */
function mockGame() {
  return {
    setMobileInput: vi.fn(),
    triggerAttack: vi.fn(),
    // Stubs for the rest of GameInstance (unused by PlayerAI)
    getState: vi.fn(),
    onEvent: vi.fn(),
    togglePause: vi.fn(),
    captureSnapshot: vi.fn(),
    cycleBlock: vi.fn(),
    cycleShape: vi.fn(),
    getSelectedBlockName: vi.fn(),
    getBlockDeltas: vi.fn(),
    flushBlockDeltas: vi.fn(),
    destroy: vi.fn(),
  } satisfies Record<keyof GameInstance, unknown>;
}

/** Builds a baseline EngineState with safe defaults. Override specific fields as needed. */
function baseState(overrides: Partial<EngineState> = {}): EngineState {
  return {
    playerHealth: 100,
    maxHealth: 100,
    enemyCount: 0,
    biomeName: 'forest',
    bossNearby: false,
    bossHealthPct: 1,
    bossPhase: 1,
    paused: false,
    phase: 'playing',
    context: 'explore',
    suggestedTargetPos: null,
    threatLevel: 'none',
    canDodge: true,
    stamina: 100,
    maxStamina: 100,
    comboStep: 0,
    isBlocking: false,
    playerX: 0,
    playerZ: 0,
    minimapMarkers: [],
    selectedBlockName: 'stone',
    selectedShapeName: 'Cube',
    selectedBlockLabel: 'Stone [Cube]',
    lookingAtBlock: false,
    placementPreview: null,
    breakingProgress: 0,
    bossPosition: null,
    bossDefeated: false,
    playerYaw: 0,
    enemyPositions: [],
    bossName: 'Forest Guardian',
    targetBlockPosition: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PlayerAI', () => {
  it('creates with empty report', () => {
    const ai = new PlayerAI(mockGame() as unknown as GameInstance);
    const report = ai.getReport();
    expect(report.framesRun).toBe(0);
    expect(report.enemiesKilled).toBe(0);
    expect(report.chestsOpened).toBe(0);
    expect(report.landmarksDiscovered).toBe(0);
    expect(report.bossDefeated).toBe(false);
    expect(report.playerDeaths).toBe(0);
    expect(report.screenshots).toEqual([]);
  });

  it('tracks enemy kills from events', () => {
    const ai = new PlayerAI(mockGame() as unknown as GameInstance);
    ai.handleEvent({ type: 'enemyKilled', position: { x: 1, y: 0, z: 1 } });
    ai.handleEvent({ type: 'enemyKilled', position: { x: 2, y: 0, z: 2 } });
    expect(ai.getReport().enemiesKilled).toBe(2);
  });

  it('tracks chest opens from events', () => {
    const ai = new PlayerAI(mockGame() as unknown as GameInstance);
    ai.handleEvent({ type: 'chestOpened', tier: 'common', items: [{ name: 'Wood', amount: 5 }] });
    expect(ai.getReport().chestsOpened).toBe(1);
  });

  it('tracks landmark discoveries from events', () => {
    const ai = new PlayerAI(mockGame() as unknown as GameInstance);
    ai.handleEvent({ type: 'landmarkDiscovered', position: { x: 10, z: 20 } });
    expect(ai.getReport().landmarksDiscovered).toBe(1);
  });

  it('tracks boss defeated from events', () => {
    const ai = new PlayerAI(mockGame() as unknown as GameInstance);
    expect(ai.getReport().bossDefeated).toBe(false);
    ai.handleEvent({ type: 'bossDefeated', bossId: 'forest_guardian', tomeAbility: 'overgrowth' });
    expect(ai.getReport().bossDefeated).toBe(true);
  });

  it('tracks player deaths from events', () => {
    const ai = new PlayerAI(mockGame() as unknown as GameInstance);
    ai.handleEvent({ type: 'playerDied' });
    ai.handleEvent({ type: 'playerDied' });
    expect(ai.getReport().playerDeaths).toBe(2);
  });

  it('ignores unrelated events', () => {
    const ai = new PlayerAI(mockGame() as unknown as GameInstance);
    ai.handleEvent({ type: 'playerDamaged', amount: 5 } as EngineEvent);
    ai.handleEvent({ type: 'lootPickup', itemType: 'gem' } as EngineEvent);
    const r = ai.getReport();
    expect(r.enemiesKilled).toBe(0);
    expect(r.playerDeaths).toBe(0);
  });

  it('increments framesRun on each update', () => {
    const game = mockGame();
    const ai = new PlayerAI(game as unknown as GameInstance);
    const state = baseState();

    ai.update(state);
    ai.update(state);
    ai.update(state);

    expect(ai.getReport().framesRun).toBe(3);
  });

  it('explores when no enemies are nearby', () => {
    const game = mockGame();
    const ai = new PlayerAI(game as unknown as GameInstance);
    const state = baseState({ enemyPositions: [] });

    ai.update(state);

    expect(game.setMobileInput).toHaveBeenCalledTimes(1);
    const input = game.setMobileInput.mock.calls[0][0];
    // Should produce non-zero movement (wandering)
    expect(Math.abs(input.moveX) + Math.abs(input.moveZ)).toBeGreaterThan(0);
    // Should NOT trigger attack during exploration
    expect(game.triggerAttack).not.toHaveBeenCalled();
  });

  it('enters combat mode when enemies are within range', () => {
    const game = mockGame();
    const ai = new PlayerAI(game as unknown as GameInstance);
    // Enemy at distance ~7 (within the 10-unit engage radius)
    const state = baseState({
      playerX: 0,
      playerZ: 0,
      enemyPositions: [{ x: 5, y: 1, z: 5, health: 30, maxHealth: 30, type: 'slime' }],
    });

    ai.update(state);

    expect(game.setMobileInput).toHaveBeenCalledTimes(1);
    const input = game.setMobileInput.mock.calls[0][0];
    // Should be moving toward the enemy (positive x and negative z or positive z depending on direction)
    expect(input.moveX).toBeGreaterThan(0); // enemy is at +x
  });

  it('attacks when enemy is in melee range', () => {
    const game = mockGame();
    const ai = new PlayerAI(game as unknown as GameInstance);
    // Enemy at distance ~1.4 (within melee range of 2)
    const state = baseState({
      playerX: 0,
      playerZ: 0,
      enemyPositions: [{ x: 1, y: 0, z: 1, health: 20, maxHealth: 30, type: 'slime' }],
    });

    ai.update(state);

    expect(game.triggerAttack).toHaveBeenCalledTimes(1);
  });

  it('seeks shrine when undiscovered shrines exist', () => {
    const game = mockGame();
    const ai = new PlayerAI(game as unknown as GameInstance);
    const state = baseState({
      playerX: 0,
      playerZ: 0,
      minimapMarkers: [{ x: 20, z: 20, type: 'shrine' }],
      enemyPositions: [], // no enemies nearby
    });

    ai.update(state);

    expect(game.setMobileInput).toHaveBeenCalledTimes(1);
    const input = game.setMobileInput.mock.calls[0][0];
    // Should move toward the shrine (positive x and positive z)
    expect(input.moveX).toBeGreaterThan(0);
    expect(input.moveZ).toBeGreaterThan(0);
  });

  it('seeks boss when no shrines remain and boss is alive', () => {
    const game = mockGame();
    const ai = new PlayerAI(game as unknown as GameInstance);
    const state = baseState({
      playerX: 0,
      playerZ: 0,
      minimapMarkers: [], // all shrines discovered
      enemyPositions: [],
      bossPosition: { x: 30, y: 2, z: 0 },
      bossDefeated: false,
    });

    ai.update(state);

    expect(game.setMobileInput).toHaveBeenCalledTimes(1);
    const input = game.setMobileInput.mock.calls[0][0];
    // Should move toward boss (positive x)
    expect(input.moveX).toBeGreaterThan(0);
  });

  it('attacks boss when in melee range', () => {
    const game = mockGame();
    const ai = new PlayerAI(game as unknown as GameInstance);
    const state = baseState({
      playerX: 0,
      playerZ: 0,
      minimapMarkers: [],
      enemyPositions: [],
      bossPosition: { x: 1, y: 0, z: 0 }, // within melee + 1 range
      bossDefeated: false,
    });

    ai.update(state);

    expect(game.triggerAttack).toHaveBeenCalledTimes(1);
  });

  it('returns a defensive copy of the report', () => {
    const ai = new PlayerAI(mockGame() as unknown as GameInstance);
    const r1 = ai.getReport();
    r1.enemiesKilled = 999;
    r1.screenshots.push({ frame: 0, description: 'injected' });

    const r2 = ai.getReport();
    expect(r2.enemiesKilled).toBe(0);
    expect(r2.screenshots).toEqual([]);
  });

  it('falls back to explore when combat finds no enemy', () => {
    const game = mockGame();
    const ai = new PlayerAI(game as unknown as GameInstance);

    // First frame: enemy nearby -> combat mode
    const stateWithEnemy = baseState({
      playerX: 0,
      playerZ: 0,
      enemyPositions: [{ x: 5, y: 0, z: 0, health: 10, maxHealth: 10, type: 'bat' }],
    });
    ai.update(stateWithEnemy);

    // Second frame: enemy gone -> should gracefully fall back
    const stateNoEnemy = baseState({
      playerX: 0,
      playerZ: 0,
      enemyPositions: [],
    });
    ai.update(stateNoEnemy);

    // Should still set mobile input (exploring now)
    expect(game.setMobileInput).toHaveBeenCalledTimes(2);
    expect(game.triggerAttack).not.toHaveBeenCalled(); // enemy was at dist=5, out of melee range
  });
});
