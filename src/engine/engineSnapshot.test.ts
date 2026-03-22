import { describe, expect, it } from 'vitest';
import { validateGameState } from '../persistence/GameStateSerializer.ts';
import { captureSnapshot, type SnapshotSources } from './engineSnapshot.ts';

function makeSnapshotSources(overrides: Partial<SnapshotSources> = {}): SnapshotSources {
  return {
    config: { biome: 'forest', seed: 'test-seed-123' },
    cameraPosition: { x: 5, y: 10, z: 15 },
    combatState: {
      playerHealth: 75,
      maxHealth: 100,
      killCount: 4,
      elapsed: 180,
    },
    enemies: [
      {
        id: 'enemy-0',
        type: 'minion',
        position: { x: 20, y: 5, z: 30 },
        health: 35,
        maxHealth: 50,
        aiState: 'active',
      },
      {
        id: 'enemy-1',
        type: 'boss',
        position: { x: 40, y: 8, z: 40 },
        health: 120,
        maxHealth: 200,
        aiState: 'active',
      },
    ],
    inventory: { wood: 10, stone: 5 },
    equippedWeapon: 'sword',
    openedChests: ['chest-a', 'chest-b'],
    defeatedBoss: false,
    ...overrides,
  };
}

describe('captureSnapshot', () => {
  it('produces a valid SerializedGameState', () => {
    const sources = makeSnapshotSources();
    const snapshot = captureSnapshot(sources);
    expect(validateGameState(snapshot)).toBe(true);
  });

  it('sets version to 1 and timestamp to a recent value', () => {
    const before = Date.now();
    const snapshot = captureSnapshot(makeSnapshotSources());
    const after = Date.now();

    expect(snapshot.version).toBe(1);
    expect(snapshot.timestamp).toBeGreaterThanOrEqual(before);
    expect(snapshot.timestamp).toBeLessThanOrEqual(after);
  });

  it('maps config correctly', () => {
    const snapshot = captureSnapshot(makeSnapshotSources({ config: { biome: 'desert', seed: 'abc' } }));
    expect(snapshot.config).toEqual({ biome: 'desert', seed: 'abc' });
  });

  it('maps player position from camera position', () => {
    const snapshot = captureSnapshot(makeSnapshotSources({ cameraPosition: { x: 1, y: 2, z: 3 } }));
    expect(snapshot.player.position).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('maps player health from combat state', () => {
    const snapshot = captureSnapshot(
      makeSnapshotSources({ combatState: { playerHealth: 42, maxHealth: 100, killCount: 0, elapsed: 0 } }),
    );
    expect(snapshot.player.health).toEqual({ current: 42, max: 100 });
  });

  it('defaults stamina to 100/100', () => {
    const snapshot = captureSnapshot(makeSnapshotSources());
    expect(snapshot.player.stamina).toEqual({ current: 100, max: 100 });
  });

  it('maps inventory and equippedWeapon', () => {
    const snapshot = captureSnapshot(makeSnapshotSources({ inventory: { iron: 3 }, equippedWeapon: 'axe' }));
    expect(snapshot.player.inventory).toEqual({ iron: 3 });
    expect(snapshot.player.equippedWeapon).toBe('axe');
  });

  it('handles null equippedWeapon', () => {
    const snapshot = captureSnapshot(makeSnapshotSources({ equippedWeapon: null }));
    expect(snapshot.player.equippedWeapon).toBeNull();
  });

  it('maps enemies with correct structure', () => {
    const sources = makeSnapshotSources();
    const snapshot = captureSnapshot(sources);

    expect(snapshot.enemies).toHaveLength(2);
    expect(snapshot.enemies[0]).toEqual({
      id: 'enemy-0',
      type: 'minion',
      position: { x: 20, y: 5, z: 30 },
      health: { current: 35, max: 50 },
      aiState: 'active',
    });
    expect(snapshot.enemies[1]).toEqual({
      id: 'enemy-1',
      type: 'boss',
      position: { x: 40, y: 8, z: 40 },
      health: { current: 120, max: 200 },
      aiState: 'active',
    });
  });

  it('handles empty enemies array', () => {
    const snapshot = captureSnapshot(makeSnapshotSources({ enemies: [] }));
    expect(snapshot.enemies).toEqual([]);
  });

  it('maps world state correctly', () => {
    const snapshot = captureSnapshot(makeSnapshotSources({ openedChests: ['c1'], defeatedBoss: true }));
    expect(snapshot.world.modifiedVoxels).toEqual([]);
    expect(snapshot.world.openedChests).toEqual(['c1']);
    expect(snapshot.world.defeatedBoss).toBe(true);
  });

  it('maps stats from combat state and openedChests', () => {
    const snapshot = captureSnapshot(
      makeSnapshotSources({
        combatState: { playerHealth: 100, maxHealth: 100, killCount: 7, elapsed: 300 },
        openedChests: ['a', 'b', 'c'],
      }),
    );
    expect(snapshot.stats).toEqual({ killCount: 7, elapsed: 300, chestsOpened: 3 });
  });

  it('round-trips through validate after JSON serialization', () => {
    const snapshot = captureSnapshot(makeSnapshotSources());
    const json = JSON.stringify(snapshot);
    const parsed: unknown = JSON.parse(json);
    expect(validateGameState(parsed)).toBe(true);
  });
});
