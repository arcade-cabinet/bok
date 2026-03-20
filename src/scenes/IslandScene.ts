import type { World, Entity } from 'koota';
import { Vehicle, EntityManager } from 'yuka';
import { Scene } from './Scene.ts';
import {
  Position, Velocity, Health, Stamina, IsPlayer, MovementIntent,
  LookIntent, AttackIntent, DodgeState, ParryState, WeaponStats,
  Hittable, EnemyType, BossType, YukaRef, AIState, IslandState,
} from '../traits/index.ts';
import { ContentRegistry, type EnemyConfig, type WeaponConfig } from '../content/index.ts';
import { IslandGenerator, type IslandBlueprint } from '../generation/index.ts';
import { EnemySpawner, type SpawnedEnemy } from '../systems/spawning/index.ts';
import { createEnemyVehicle, AIBridge, type AIVehicle } from '../ai/index.ts';
import { MovementSystem } from '../systems/movement/index.ts';
import { combatSystem } from '../systems/combat/index.ts';
import { PLAYER_MOVE_SPEED, PLAYER_SPRINT_MULTIPLIER } from '../shared/index.ts';

/**
 * Playable island scene: generates terrain, spawns player + enemies,
 * runs movement/combat/AI each frame.
 */
export class IslandScene extends Scene {
  readonly #content: ContentRegistry;
  readonly #movementSystem = new MovementSystem();
  readonly #aiBridge = new AIBridge();
  readonly #yukaManager = new EntityManager();
  readonly #enemyEntities: Array<{ entity: Entity; vehicle: AIVehicle }> = [];
  #playerEntity: Entity | null = null;
  #playerVehicle: Vehicle | null = null;
  #blueprint: IslandBlueprint | null = null;

  constructor(world: World, runtime: unknown, content: ContentRegistry) {
    super('island', world, runtime);
    this.#content = content;
  }

  enter(): void {
    console.log('[IslandScene] Generating forest island...');

    // Generate island from forest biome
    const forestBiome = this.#content.getBiome('forest');
    const seed = 'bok-forest-' + Date.now();
    this.#blueprint = IslandGenerator.generate(forestBiome, seed, 1);

    // Set island state on world
    this.world.set(IslandState, {
      biome: 'forest',
      seed,
      difficulty: 1,
      bossDefeated: false,
      enemiesRemaining: this.#blueprint.enemySpawns.length,
    });

    // Spawn player
    this.#spawnPlayer();

    // Spawn enemies
    this.#spawnEnemies();

    // Spawn boss
    this.#spawnBoss();

    console.log(
      `[IslandScene] Forest island ready — player at (${this.#blueprint.playerSpawn.x}, ${this.#blueprint.playerSpawn.y}, ${this.#blueprint.playerSpawn.z}), ` +
      `${this.#enemyEntities.length} enemies, boss arena at (${this.#blueprint.bossArena.x}, ${this.#blueprint.bossArena.y}, ${this.#blueprint.bossArena.z})`,
    );
  }

  update(dt: number): void {
    // Step 1: Apply player movement from input
    this.#applyPlayerMovement(dt);

    // Step 2: Yuka AI update — drives enemy steering + FSM
    this.#yukaManager.update(dt);

    // Step 3: Sync Yuka AI decisions → Koota traits
    for (const { entity, vehicle } of this.#enemyEntities) {
      this.#aiBridge.syncToKoota(vehicle, entity);
    }

    // Step 4: Movement system — apply velocity to position
    this.#movementSystem.update(this.world, dt);

    // Step 5: Combat system — resolve attacks
    combatSystem(this.world);

    // Step 6: Sync Koota → Yuka (corrected positions, death triggers)
    for (const { entity, vehicle } of this.#enemyEntities) {
      this.#aiBridge.syncFromKoota(vehicle, entity);
    }

    // Step 7: Clean up dead enemies
    this.#cleanupDead();
  }

  exit(): void {
    console.log('[IslandScene] Cleaning up...');

    // Remove all entities
    if (this.#playerEntity?.isAlive()) {
      this.#playerEntity.destroy();
    }
    for (const { entity, vehicle } of this.#enemyEntities) {
      if (entity.isAlive()) entity.destroy();
      this.#yukaManager.remove(vehicle);
    }
    this.#enemyEntities.length = 0;
    this.#playerEntity = null;
    this.#playerVehicle = null;
    this.#blueprint = null;
  }

  #spawnPlayer(): void {
    if (!this.#blueprint) return;

    const spawn = this.#blueprint.playerSpawn;
    const woodenSword = this.#content.getWeapon('wooden-sword');

    this.#playerEntity = this.world.spawn(
      IsPlayer(),
      Position({ x: spawn.x, y: spawn.y, z: spawn.z }),
      Velocity(),
      Health({ current: 100, max: 100 }),
      Stamina({ current: 100, max: 100, regenRate: 20 }),
      AttackIntent({ active: false, comboStep: 0, timestamp: 0 }),
      DodgeState({ active: false, iFrames: false, cooldownRemaining: 0 }),
      ParryState({ blocking: false, parryWindow: false, parryTimestamp: 0 }),
      WeaponStats({
        baseDamage: woodenSword.baseDamage,
        attackSpeed: woodenSword.attackSpeed,
        range: woodenSword.range,
        comboMultipliers: woodenSword.combo.map(c => c.damageMultiplier).join(','),
        weaponId: woodenSword.id,
      }),
      Hittable(),
    );

    // Create a player vehicle for AI targeting
    this.#playerVehicle = new Vehicle();
    this.#playerVehicle.position.set(spawn.x, spawn.y, spawn.z);
  }

  #spawnEnemies(): void {
    if (!this.#blueprint || !this.#playerVehicle) return;

    // Build enemy config map from blueprint
    const configMap = new Map<string, EnemyConfig>();
    for (const sp of this.#blueprint.enemySpawns) {
      if (!configMap.has(sp.enemyId)) {
        try {
          configMap.set(sp.enemyId, this.#content.getEnemy(sp.enemyId));
        } catch {
          // Skip unknown enemies
        }
      }
    }

    const spawnedEnemies = EnemySpawner.spawn(this.#blueprint.enemySpawns, configMap);

    for (const spawned of spawnedEnemies) {
      const config = configMap.get(spawned.configId)!;

      // Create Koota entity
      const entity = this.world.spawn(
        Position({ x: spawned.position.x, y: spawned.position.y, z: spawned.position.z }),
        Velocity(),
        Health({ current: spawned.health, max: spawned.health }),
        EnemyType({ configId: spawned.configId }),
        AIState({ state: 'patrol' }),
        Hittable(),
        WeaponStats({
          baseDamage: spawned.damage,
          attackSpeed: 1.0,
          range: 1.5,
          comboMultipliers: '1.0',
          weaponId: '',
        }),
      );

      // Create Yuka vehicle
      const vehicle = createEnemyVehicle(config, this.#playerVehicle);
      vehicle.position.set(spawned.position.x, spawned.position.y, spawned.position.z);

      // Store YukaRef on entity
      entity.add(YukaRef({ vehicle }));

      this.#yukaManager.add(vehicle);
      this.#enemyEntities.push({ entity, vehicle });
    }
  }

  #spawnBoss(): void {
    if (!this.#blueprint || !this.#playerVehicle) return;

    const forestBiome = this.#content.getBiome('forest');
    let bossConfig;
    try {
      bossConfig = this.#content.getBoss(forestBiome.bossId);
    } catch {
      console.warn('[IslandScene] Boss config not found:', forestBiome.bossId);
      return;
    }

    const arena = this.#blueprint.bossArena;

    const entity = this.world.spawn(
      Position({ x: arena.x, y: arena.y, z: arena.z }),
      Velocity(),
      Health({ current: bossConfig.health, max: bossConfig.health }),
      BossType({ configId: bossConfig.id, phase: 1 }),
      AIState({ state: 'patrol' }),
      Hittable(),
      WeaponStats({
        baseDamage: 25,
        attackSpeed: 0.8,
        range: 3.0,
        comboMultipliers: '1.0,1.3,2.0',
        weaponId: '',
      }),
    );

    // Create Yuka vehicle for boss (uses enemy config shape)
    const bossAsEnemy = {
      id: bossConfig.id,
      name: bossConfig.name,
      health: bossConfig.health,
      speed: 2.5,
      damage: 25,
      attackPattern: 'boss',
      attacks: bossConfig.phases[0].attacks,
      drops: [],
    };
    const vehicle = createEnemyVehicle(bossAsEnemy, this.#playerVehicle);
    vehicle.position.set(arena.x, arena.y, arena.z);

    entity.add(YukaRef({ vehicle }));

    this.#yukaManager.add(vehicle);
    this.#enemyEntities.push({ entity, vehicle });
  }

  #applyPlayerMovement(dt: number): void {
    if (!this.#playerEntity || !this.#playerVehicle) return;

    const intent = this.world.get(MovementIntent);
    if (!intent) return;

    const speed = intent.sprint
      ? PLAYER_MOVE_SPEED * PLAYER_SPRINT_MULTIPLIER
      : PLAYER_MOVE_SPEED;

    this.#playerEntity.set(Velocity, {
      x: intent.dirX * speed,
      y: 0, // Gravity deferred to Rapier integration
      z: intent.dirZ * speed,
    });

    // Sync player position to Yuka vehicle for AI targeting
    const pos = this.#playerEntity.get(Position);
    if (pos) {
      this.#playerVehicle.position.set(pos.x, pos.y, pos.z);
    }
  }

  #cleanupDead(): void {
    for (let i = this.#enemyEntities.length - 1; i >= 0; i--) {
      const { entity, vehicle } = this.#enemyEntities[i];
      const health = entity.get(Health);
      if (health && health.current <= 0) {
        if (entity.isAlive()) entity.destroy();
        this.#yukaManager.remove(vehicle);
        this.#enemyEntities.splice(i, 1);

        // Update island state
        const islandState = this.world.get(IslandState);
        if (islandState) {
          this.world.set(IslandState, {
            ...islandState,
            enemiesRemaining: Math.max(0, islandState.enemiesRemaining - 1),
          });
        }
      }
    }
  }
}
