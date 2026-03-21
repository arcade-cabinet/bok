import { createWorld } from 'koota';
import { describe, expect, it } from 'vitest';
import { ContentRegistry } from './content/registry.ts';
import { IslandGenerator } from './generation/index.ts';
import { ActionMap } from './input/index.ts';
import { SaveManager } from './persistence/index.ts';
import { calculateDamage, type DamageInput } from './systems/combat/DamageCalculator.ts';
import { MovementSystem } from './systems/movement/MovementSystem.ts';
import { RunManager } from './systems/progression/RunManager.ts';
import { EnemySpawner } from './systems/spawning/EnemySpawner.ts';
import { Health, Position, Stamina, Velocity } from './traits/index.ts';

// --- Integration Tests ---

describe('Integration: Save/Load Round-Trip', () => {
  it('persists and restores full game state', async () => {
    const save = await SaveManager.createInMemory();

    // Save game state
    const state = {
      koota: {
        entities: [
          { id: 1, position: { x: 10, y: 0, z: 5 }, health: 80 },
          { id: 2, position: { x: -3, y: 0, z: 12 }, health: 30 },
        ],
      },
      yuka: { vehicles: ['enemy-1', 'enemy-2'] },
      scene: 'island',
    };
    await save.saveState(state);

    // Restore
    const loaded = await save.loadState();
    expect(loaded).not.toBeNull();
    expect(loaded?.scene).toBe('island');
    expect((loaded?.koota as { entities: unknown[] }).entities).toHaveLength(2);
    expect((loaded?.yuka as { vehicles: string[] }).vehicles).toContain('enemy-1');
  });

  it('persists unlocks across sessions', async () => {
    const save = await SaveManager.createInMemory();

    await save.addUnlock({ id: 'dash', type: 'tome_page', data: { ability: 'dash' } });
    await save.addUnlock({ id: 'fireball', type: 'tome_page', data: { ability: 'fireball' } });
    await save.addUnlock({ id: 'desert', type: 'biome', data: { name: 'Desert' } });

    const unlocks = await save.getUnlocks();
    expect(unlocks).toHaveLength(3);
    expect(unlocks.map((u) => u.id).sort()).toEqual(['dash', 'desert', 'fireball']);
  });

  it('persists run history across sessions', async () => {
    const save = await SaveManager.createInMemory();
    const mgr = new RunManager(save);

    mgr.startRun('seed-1', 'forest');
    mgr.visitIsland('forest-island');
    mgr.defeatBoss();
    await mgr.endRun('victory');

    mgr.startRun('seed-2', 'desert');
    await mgr.endRun('death');

    const runs = await save.getRuns();
    expect(runs).toHaveLength(2);
    // Newest run first (ORDER BY timestamp DESC)
    expect(runs[0].result).toBe('death');
    expect(runs[0].seed).toBe('seed-2');
    expect(runs[1].result).toBe('victory');
    expect(runs[1].seed).toBe('seed-1');
  });
});

describe('Integration: Full Run Simulation', () => {
  it('generates island → spawns enemies → simulates combat → boss defeat → progression', async () => {
    // 1. Load content
    const registry = new ContentRegistry();
    const forestConfig = registry.getBiome('forest');
    expect(forestConfig).toBeDefined();
    expect(forestConfig.id).toBe('forest');

    // 2. Generate island
    const blueprint = IslandGenerator.generate(forestConfig, 'test-seed-42', 1);
    expect(blueprint.biomeId).toBe('forest');
    expect(blueprint.terrain).toBeDefined();
    expect(blueprint.playerSpawn).toBeDefined();
    expect(blueprint.enemySpawns.length).toBeGreaterThan(0);
    expect(blueprint.bossArena).toBeDefined();

    // 3. Spawn enemies from blueprint
    const enemyConfigs = new Map(registry.getAllEnemies().map((e) => [e.id, e]));
    const spawnedEnemies = EnemySpawner.spawn(blueprint.enemySpawns, enemyConfigs);
    expect(spawnedEnemies.length).toBeGreaterThan(0);
    expect(spawnedEnemies[0].health).toBeGreaterThan(0);

    // 4. Create Koota world with player + enemies
    const world = createWorld();
    const player = world.spawn(Position(blueprint.playerSpawn), Velocity, Health({ current: 100, max: 100 }), Stamina);

    const enemyEntities = spawnedEnemies.map((e) =>
      world.spawn(Position(e.position), Velocity, Health({ current: e.health, max: e.health })),
    );

    // Player + enemies (world entity may also be counted by Koota)
    expect(world.entities.length).toBeGreaterThanOrEqual(1 + enemyEntities.length);

    // 5. Simulate movement
    const movementSystem = new MovementSystem();
    player.set(Velocity, { x: 1, y: 0, z: 0 });
    movementSystem.update(world, 1.0);
    const playerPos = player.get(Position)!;
    expect(playerPos.x).toBeCloseTo(blueprint.playerSpawn.x + 1);

    // 6. Simulate combat — player attacks enemy
    const woodenSword = registry.getWeapon('wooden-sword');
    const damageInput: DamageInput = {
      weaponBaseDamage: woodenSword.baseDamage,
      comboMultiplier: 1.0,
      critMultiplier: 1.0,
      armorReduction: 0,
    };
    const damage = calculateDamage(damageInput);
    expect(damage).toBe(woodenSword.baseDamage);

    // Apply damage to first enemy
    const enemyHealth = enemyEntities[0].get(Health)!;
    const newHealth = enemyHealth.current - damage;
    enemyEntities[0].set(Health, { current: Math.max(0, newHealth), max: enemyHealth.max });
    expect(enemyEntities[0].get(Health)?.current).toBeLessThan(enemyHealth.max);

    // 7. Simulate boss defeat + run progression
    const save = await SaveManager.createInMemory();
    const runMgr = new RunManager(save);
    runMgr.startRun('test-seed-42', 'forest');
    runMgr.visitIsland('forest-main');
    runMgr.defeatBoss();
    await runMgr.endRun('victory');

    const runs = await save.getRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0].result).toBe('victory');
    expect(runs[0].biomes).toContain('forest');

    // 8. Verify progression unlock
    await save.addUnlock({
      id: 'nature-wrath',
      type: 'tome_page',
      data: { ability: 'nature-wrath', source: 'ancient-treant' },
    });
    const unlocks = await save.getUnlocks();
    expect(unlocks).toHaveLength(1);
    expect(unlocks[0].id).toBe('nature-wrath');

    world.destroy();
  });

  it('handles player death during run', async () => {
    const save = await SaveManager.createInMemory();
    const runMgr = new RunManager(save);

    runMgr.startRun('death-seed', 'desert');
    runMgr.visitIsland('desert-main');

    // Simulate player death
    const world = createWorld();
    const player = world.spawn(Health({ current: 100, max: 100 }));

    // Take lethal damage
    player.set(Health, { current: 0, max: 100 });
    expect(player.get(Health)?.current).toBe(0);

    // End run as death
    await runMgr.endRun('death');
    expect(runMgr.getRunState()).toBeNull();

    const runs = await save.getRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0].result).toBe('death');

    world.destroy();
  });

  it('input system integrates with action map for player control', () => {
    const actionMap = ActionMap.desktopDefaults();

    // Simulate WASD input
    actionMap.setKeyDown('KeyW');
    actionMap.setKeyDown('KeyA');
    expect(actionMap.isActive('moveForward')).toBe(true);
    expect(actionMap.isActive('moveLeft')).toBe(true);
    expect(actionMap.isActive('moveBack')).toBe(false);

    // Simulate dodge (Q key — Space is jump)
    actionMap.setKeyDown('KeyQ');
    expect(actionMap.isActive('dodge')).toBe(true);

    // Release
    actionMap.setKeyUp('KeyW');
    expect(actionMap.isActive('moveForward')).toBe(false);
    expect(actionMap.isActive('moveLeft')).toBe(true);

    actionMap.reset();
    expect(actionMap.isActive('moveLeft')).toBe(false);
    expect(actionMap.isActive('dodge')).toBe(false);
  });

  it('content registry loads all biomes, enemies, weapons, and bosses', () => {
    const registry = new ContentRegistry();

    expect(registry.getAllBiomes()).toHaveLength(8);
    expect(registry.getAllEnemies()).toHaveLength(16);
    expect(registry.getAllWeapons()).toHaveLength(15);
    expect(registry.getAllBosses()).toHaveLength(8);

    // Verify cross-references: each biome's enemies exist in enemy configs
    for (const biome of registry.getAllBiomes()) {
      for (const enemyRef of biome.enemies) {
        expect(() => registry.getEnemy(enemyRef.enemyId)).not.toThrow();
      }
      expect(() => registry.getBoss(biome.bossId)).not.toThrow();
    }
  });
});
