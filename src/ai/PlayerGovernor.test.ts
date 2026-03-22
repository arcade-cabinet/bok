import { describe, expect, it } from 'vitest';
import type { EnemyState } from '../engine/types';
import { createPlayerGovernor } from './PlayerGovernor';

/** Create a minimal EnemyState mock at the given x/z position. */
function mockEnemy(x: number, z: number): EnemyState {
  return {
    mesh: { position: { x, y: 0, z } },
    health: 100,
    attackCooldown: 0,
    vehicle: {},
  } as unknown as EnemyState;
}

describe('PlayerGovernor', () => {
  it('creates without errors', () => {
    const governor = createPlayerGovernor();
    expect(governor).toBeDefined();
    expect(governor.update).toBeTypeOf('function');
    expect(governor.setContext).toBeTypeOf('function');
  });

  it('returns no target when no enemies', () => {
    const governor = createPlayerGovernor();
    governor.setContext(0, 0, 0, [], 100, 100);
    const output = governor.update(0.016);
    expect(output.suggestedTarget).toBe(-1);
  });

  it('returns target index of closest enemy within combat range (5 units)', () => {
    const governor = createPlayerGovernor();
    const enemies = [mockEnemy(3, 0)]; // 3 units away — within range
    governor.setContext(0, 0, 0, enemies, 100, 100);
    const output = governor.update(0.016);
    expect(output.suggestedTarget).toBe(0);
  });

  it('returns threatLevel high when enemy within 2.5 units', () => {
    const governor = createPlayerGovernor();
    const enemies = [mockEnemy(1, 0)]; // 1 unit away — within HIGH_THREAT_RANGE
    governor.setContext(0, 0, 0, enemies, 100, 100);
    const output = governor.update(0.016);
    expect(output.threatLevel).toBe('high');
  });

  it('returns threatLevel medium when enemy between 2.5 and 5 units', () => {
    const governor = createPlayerGovernor();
    const enemies = [mockEnemy(4, 0)]; // 4 units away — in combat range but not high threat
    governor.setContext(0, 0, 0, enemies, 100, 100);
    const output = governor.update(0.016);
    expect(output.threatLevel).toBe('medium');
  });

  it('returns threatLevel low when enemy beyond combat range but within detection range', () => {
    const governor = createPlayerGovernor();
    const enemies = [mockEnemy(8, 0)]; // 8 units away — beyond COMBAT_RANGE but within 2x range
    governor.setContext(0, 0, 0, enemies, 100, 100);
    const output = governor.update(0.016);
    expect(output.threatLevel).toBe('low');
  });

  it('returns threatLevel none when no enemies at all', () => {
    const governor = createPlayerGovernor();
    governor.setContext(0, 0, 0, [], 100, 100);
    const output = governor.update(0.016);
    expect(output.threatLevel).toBe('none');
  });

  it('canDodge is false when stamina < 25', () => {
    const governor = createPlayerGovernor();
    governor.setContext(0, 0, 0, [], 24, 100);
    const output = governor.update(0.016);
    expect(output.canDodge).toBe(false);
  });

  it('canDodge is true when stamina >= 25', () => {
    const governor = createPlayerGovernor();
    governor.setContext(0, 0, 0, [], 25, 100);
    const output = governor.update(0.016);
    expect(output.canDodge).toBe(true);
  });

  it('targets the closest enemy among multiple enemies', () => {
    const governor = createPlayerGovernor();
    const enemies = [
      mockEnemy(4, 0), // 4 units away
      mockEnemy(2, 0), // 2 units away — closest
      mockEnemy(3, 0), // 3 units away
    ];
    governor.setContext(0, 0, 0, enemies, 100, 100);
    const output = governor.update(0.016);
    expect(output.suggestedTarget).toBe(1); // index of closest enemy
  });

  it('updates target when context changes between frames', () => {
    const governor = createPlayerGovernor();

    // Frame 1: enemy beyond combat range but within detection — low threat, no target
    const farEnemies = [mockEnemy(8, 0)];
    governor.setContext(0, 0, 0, farEnemies, 100, 100);
    const output1 = governor.update(0.016);
    expect(output1.suggestedTarget).toBe(-1);
    expect(output1.threatLevel).toBe('low');

    // Frame 2: enemy moves close — should now target it
    const closeEnemies = [mockEnemy(2, 0)];
    governor.setContext(0, 0, 0, closeEnemies, 100, 100);
    const output2 = governor.update(0.016);
    expect(output2.suggestedTarget).toBe(0);
    expect(output2.threatLevel).toBe('high');
  });
});
