import { describe, expect, it } from 'vitest';
import type { SerializedGameState } from './GameStateSerializer.ts';
import { parseGameState, stringifyGameState, validateGameState } from './GameStateSerializer.ts';

function makeValidState(overrides: Partial<SerializedGameState> = {}): SerializedGameState {
  return {
    version: 1,
    timestamp: Date.now(),
    config: { biome: 'forest', seed: 'abc123' },
    player: {
      position: { x: 0, y: 5, z: 0 },
      health: { current: 80, max: 100 },
      stamina: { current: 50, max: 100 },
      inventory: { wood: 5, stone: 3 },
      equippedWeapon: 'iron_sword',
    },
    enemies: [
      {
        id: 'enemy-1',
        type: 'skeleton',
        position: { x: 10, y: 5, z: 10 },
        health: { current: 30, max: 50 },
        aiState: 'patrol',
      },
    ],
    world: {
      modifiedVoxels: [{ x: 1, y: 2, z: 3, blockId: 7 }],
      openedChests: ['chest-a'],
      defeatedBoss: false,
    },
    stats: {
      killCount: 3,
      elapsed: 120,
      chestsOpened: 1,
    },
    ...overrides,
  };
}

describe('validateGameState', () => {
  it('returns true for a valid state', () => {
    expect(validateGameState(makeValidState())).toBe(true);
  });

  it('returns false for null', () => {
    expect(validateGameState(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(validateGameState(undefined)).toBe(false);
  });

  it('returns false for a non-object', () => {
    expect(validateGameState('hello')).toBe(false);
    expect(validateGameState(42)).toBe(false);
  });

  it('returns false when version is wrong', () => {
    expect(validateGameState({ ...makeValidState(), version: 2 })).toBe(false);
  });

  it('returns false when version is missing', () => {
    const state = makeValidState();
    const { version: _, ...noVersion } = state;
    expect(validateGameState(noVersion)).toBe(false);
  });

  it('returns false when timestamp is not a number', () => {
    expect(validateGameState({ ...makeValidState(), timestamp: 'not-a-number' })).toBe(false);
  });

  it('returns false when config is missing', () => {
    expect(validateGameState({ ...makeValidState(), config: null })).toBe(false);
  });

  it('returns false when config.biome is not a string', () => {
    expect(validateGameState({ ...makeValidState(), config: { biome: 123, seed: 'abc' } })).toBe(false);
  });

  it('returns false when player is missing', () => {
    expect(validateGameState({ ...makeValidState(), player: null })).toBe(false);
  });

  it('returns false when player.position is missing', () => {
    const state = makeValidState();
    expect(validateGameState({ ...state, player: { ...state.player, position: null } })).toBe(false);
  });

  it('returns false when player.inventory is null', () => {
    const state = makeValidState();
    expect(validateGameState({ ...state, player: { ...state.player, inventory: null } })).toBe(false);
  });

  it('returns false when enemies is not an array', () => {
    expect(validateGameState({ ...makeValidState(), enemies: 'not-array' })).toBe(false);
  });

  it('returns false when world.modifiedVoxels is not an array', () => {
    const state = makeValidState();
    expect(validateGameState({ ...state, world: { ...state.world, modifiedVoxels: 'nope' } })).toBe(false);
  });

  it('returns false when world.defeatedBoss is not boolean', () => {
    const state = makeValidState();
    expect(validateGameState({ ...state, world: { ...state.world, defeatedBoss: 'yes' } })).toBe(false);
  });

  it('returns false when stats.killCount is not a number', () => {
    const state = makeValidState();
    expect(validateGameState({ ...state, stats: { ...state.stats, killCount: 'three' } })).toBe(false);
  });

  it('accepts a state with empty enemies array', () => {
    expect(validateGameState(makeValidState({ enemies: [] }))).toBe(true);
  });

  it('accepts a state with null equippedWeapon', () => {
    const state = makeValidState();
    state.player.equippedWeapon = null;
    expect(validateGameState(state)).toBe(true);
  });
});

describe('stringifyGameState / parseGameState', () => {
  it('round-trips a valid state', () => {
    const original = makeValidState();
    const json = stringifyGameState(original);
    const parsed = parseGameState(json);
    expect(parsed).not.toBeNull();
    expect(parsed?.version).toBe(1);
    expect(parsed?.config.biome).toBe('forest');
    expect(parsed?.player.health.current).toBe(80);
    expect(parsed?.enemies).toHaveLength(1);
    expect(parsed?.world.defeatedBoss).toBe(false);
    expect(parsed?.stats.killCount).toBe(3);
  });

  it('returns null for invalid JSON', () => {
    expect(parseGameState('not json')).toBeNull();
  });

  it('returns null for valid JSON but invalid state', () => {
    expect(parseGameState('{"version":2}')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseGameState('')).toBeNull();
  });
});
