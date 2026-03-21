import { createWorld, type World } from 'koota';
import { beforeEach, describe, expect, it } from 'vitest';
import type { BossConfig, ContentRegistry } from '../../content/index';
import { BossType, Health } from '../../traits/index';
import { bossPhaseSystem } from './BossPhaseSystem';

function mockContent(bossConfig: BossConfig): ContentRegistry {
  return {
    getBoss: (id: string) => {
      if (id === bossConfig.id) return bossConfig;
      throw new Error(`Unknown boss: ${id}`);
    },
  } as ContentRegistry;
}

const treantConfig: BossConfig = {
  id: 'ancient-treant',
  name: 'Ancient Treant',
  biome: 'forest',
  health: 300,
  tomePageDrop: 'page-forest',
  phases: [
    {
      healthThreshold: 1.0,
      attacks: [{ name: 'root-slam', type: 'melee', damage: 20, cooldown: 2, range: 3, telegraph: 0.5 }],
      description: 'Phase 1',
    },
    {
      healthThreshold: 0.66,
      attacks: [{ name: 'vine-whip', type: 'melee', damage: 30, cooldown: 1.5, range: 4, telegraph: 0.3 }],
      description: 'Phase 2',
    },
    {
      healthThreshold: 0.33,
      attacks: [{ name: 'forest-rage', type: 'aoe', damage: 40, cooldown: 1, range: 5, telegraph: 0.2 }],
      description: 'Phase 3',
    },
  ],
};

describe('BossPhaseSystem', () => {
  let world: World;
  const content = mockContent(treantConfig);

  beforeEach(() => {
    world = createWorld();
  });

  it('stays in phase 1 at full health', () => {
    const entity = world.spawn(BossType({ configId: 'ancient-treant', phase: 1 }), Health({ current: 300, max: 300 }));

    bossPhaseSystem(world, content);

    expect(entity.get(BossType)?.phase).toBe(1);
  });

  it('advances to phase 2 when health drops below 66%', () => {
    const entity = world.spawn(
      BossType({ configId: 'ancient-treant', phase: 1 }),
      Health({ current: 190, max: 300 }), // 63%
    );

    bossPhaseSystem(world, content);

    expect(entity.get(BossType)?.phase).toBe(2);
  });

  it('advances to phase 3 when health drops below 33%', () => {
    const entity = world.spawn(
      BossType({ configId: 'ancient-treant', phase: 1 }),
      Health({ current: 90, max: 300 }), // 30%
    );

    bossPhaseSystem(world, content);

    expect(entity.get(BossType)?.phase).toBe(3);
  });

  it('does not regress phases', () => {
    const entity = world.spawn(
      BossType({ configId: 'ancient-treant', phase: 3 }),
      Health({ current: 250, max: 300 }), // healed above threshold
    );

    bossPhaseSystem(world, content);

    expect(entity.get(BossType)?.phase).toBe(3);
  });

  it('skips unknown boss configs gracefully', () => {
    world.spawn(BossType({ configId: 'unknown-boss', phase: 1 }), Health({ current: 50, max: 100 }));

    // Should not throw
    expect(() => bossPhaseSystem(world, content)).not.toThrow();
  });
});
