import type { World, Entity } from 'koota';
import { Vehicle, EntityManager } from 'yuka';
import * as THREE from 'three';
import { Scene } from './Scene.ts';
import {
  Position, Velocity, Health, Stamina, IsPlayer, MovementIntent,
  LookIntent, AttackIntent, DodgeState, ParryState, WeaponStats,
  Hittable, EnemyType, BossType, YukaRef, AIState, IslandState, Time,
} from '../traits/index.ts';
import { ContentRegistry, type EnemyConfig } from '../content/index.ts';
import { IslandGenerator, type IslandBlueprint } from '../generation/index.ts';
import { EnemySpawner } from '../systems/spawning/index.ts';
import { createEnemyVehicle, AIBridge, type AIVehicle } from '../ai/index.ts';
import { MovementSystem } from '../systems/movement/index.ts';
import {
  combatSystem, dodgeTickSystem, staminaSystem, dotSystem,
  knockbackSystem, bossPhaseSystem,
} from '../systems/combat/index.ts';
import { PLAYER_MOVE_SPEED, PLAYER_SPRINT_MULTIPLIER, PARRY_WINDOW } from '../shared/index.ts';
import type { InputSystem } from '../input/index.ts';

/**
 * Playable island scene: generates terrain, spawns player + enemies + boss,
 * runs movement/combat/AI each frame. First-person camera with pointer lock.
 */
export class IslandScene extends Scene {
  readonly #content: ContentRegistry;
  readonly #inputSystem: InputSystem;
  readonly #movementSystem = new MovementSystem();
  readonly #aiBridge = new AIBridge();
  readonly #yukaManager = new EntityManager();
  readonly #enemyEntities: Array<{ entity: Entity; vehicle: AIVehicle }> = [];
  #playerEntity: Entity | null = null;
  #playerVehicle: Vehicle | null = null;
  #blueprint: IslandBlueprint | null = null;

  // First-person camera
  #camera: THREE.PerspectiveCamera | null = null;
  readonly #cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  readonly #cameraSensitivity = 0.002;

  constructor(world: World, runtime: unknown, content: ContentRegistry, inputSystem: InputSystem) {
    super('island', world, runtime);
    this.#content = content;
    this.#inputSystem = inputSystem;
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

    // Setup first-person camera
    this.#setupCamera();

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

    // Step 2: Apply camera look from input
    this.#applyCameraLook();

    // Step 3: Check attack input + close parry window after PARRY_WINDOW
    this.#checkAttackInput();
    this.#tickParryWindow();

    // Step 4: Set dt on vehicles for FSM states, then Yuka AI update
    for (const { vehicle } of this.#enemyEntities) {
      this.#aiBridge.setDt(vehicle, dt);
    }
    this.#yukaManager.update(dt);

    // Step 5: Sync Yuka AI decisions → Koota traits
    for (const { entity, vehicle } of this.#enemyEntities) {
      this.#aiBridge.syncToKoota(vehicle, entity);
    }

    // Step 6: Dodge tick — decrement timers, expire i-frames
    dodgeTickSystem(this.world, dt);

    // Step 7: Stamina — drain/regen
    staminaSystem(this.world, dt);

    // Step 8: Movement system — apply velocity to position
    this.#movementSystem.update(this.world, dt);

    // Step 9: Knockback — apply knockback to velocity
    knockbackSystem(this.world);

    // Step 10: Combat system — resolve attacks (checks dodge/parry/blocking)
    combatSystem(this.world);

    // Step 11: DoT — tick damage-over-time effects
    dotSystem(this.world, dt);

    // Step 12: Boss phases — check health thresholds
    bossPhaseSystem(this.world, this.#content);

    // Step 13: Sync Koota → Yuka (corrected positions, death triggers)
    for (const { entity, vehicle } of this.#enemyEntities) {
      this.#aiBridge.syncFromKoota(vehicle, entity);
    }

    // Step 14: Sync player camera to position
    this.#syncCameraToPlayer();

    // Step 15: Clean up dead enemies
    this.#cleanupDead();
  }

  exit(): void {
    console.log('[IslandScene] Cleaning up...');

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
    this.#camera = null;
  }

  #setupCamera(): void {
    // Create a perspective camera for first-person view
    // JollyPixel runtime exposes the Three.js scene — we add our camera to it
    this.#camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.#cameraEuler.set(0, 0, 0);
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

    // Position camera at player spawn
    if (this.#camera) {
      this.#camera.position.set(spawn.x, spawn.y + 1.6, spawn.z); // Eye height
    }
  }

  #spawnEnemies(): void {
    if (!this.#blueprint || !this.#playerVehicle) return;

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

      const vehicle = createEnemyVehicle(config, this.#playerVehicle);
      vehicle.position.set(spawned.position.x, spawned.position.y, spawned.position.z);
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

  #applyPlayerMovement(_dt: number): void {
    if (!this.#playerEntity || !this.#playerVehicle) return;

    const intent = this.world.get(MovementIntent);
    if (!intent) return;

    const speed = intent.sprint
      ? PLAYER_MOVE_SPEED * PLAYER_SPRINT_MULTIPLIER
      : PLAYER_MOVE_SPEED;

    // Transform movement direction by camera yaw so WASD is camera-relative
    const yaw = this.#cameraEuler.y;
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const worldX = intent.dirX * cosYaw - intent.dirZ * sinYaw;
    const worldZ = intent.dirX * sinYaw + intent.dirZ * cosYaw;

    this.#playerEntity.set(Velocity, {
      x: worldX * speed,
      y: 0,
      z: worldZ * speed,
    });

    // Sync player position to Yuka vehicle for AI targeting
    const pos = this.#playerEntity.get(Position);
    if (pos) {
      this.#playerVehicle.position.set(pos.x, pos.y, pos.z);
    }
  }

  #applyCameraLook(): void {
    if (!this.#camera) return;

    const look = this.world.get(LookIntent);
    if (!look) return;

    // Apply mouse/gamepad look to camera euler angles
    this.#cameraEuler.y -= look.deltaX * this.#cameraSensitivity;
    this.#cameraEuler.x -= look.deltaY * this.#cameraSensitivity;

    // Clamp pitch
    const maxPitch = Math.PI / 2 - 0.01;
    this.#cameraEuler.x = Math.max(-maxPitch, Math.min(maxPitch, this.#cameraEuler.x));

    this.#camera.quaternion.setFromEuler(this.#cameraEuler);
  }

  #checkAttackInput(): void {
    if (!this.#playerEntity) return;

    const time = this.world.get(Time);
    if (!time) return;

    // Left mouse → attack, right mouse → parry
    if (this.#inputSystem.keyboard.attackDown) {
      const current = this.#playerEntity.get(AttackIntent);
      if (!current?.active) {
        this.#playerEntity.set(AttackIntent, {
          active: true,
          comboStep: current?.comboStep ?? 0,
          timestamp: time.elapsed,
        });
      }
    }

    if (this.#inputSystem.keyboard.parryDown) {
      this.#playerEntity.set(ParryState, {
        blocking: true,
        parryWindow: true,
        parryTimestamp: time.elapsed,
      });
    } else {
      const parry = this.#playerEntity.get(ParryState);
      if (parry?.blocking) {
        this.#playerEntity.set(ParryState, {
          blocking: false,
          parryWindow: false,
          parryTimestamp: parry.parryTimestamp,
        });
      }
    }

    // Dodge on space (mapped to 'dodge' action)
    if (this.#inputSystem.actionMap.isActive('dodge')) {
      const dodge = this.#playerEntity.get(DodgeState);
      if (!dodge?.active) {
        this.#playerEntity.set(DodgeState, {
          active: true,
          iFrames: true,
          cooldownRemaining: 0, // DodgeTickSystem will set the real cooldown
        });
      }
    }
  }

  /** H2: Close parry window after PARRY_WINDOW duration, keep blocking. */
  #tickParryWindow(): void {
    if (!this.#playerEntity) return;

    const parry = this.#playerEntity.get(ParryState);
    if (!parry || !parry.parryWindow) return;

    const time = this.world.get(Time);
    if (!time) return;

    const elapsed = time.elapsed - parry.parryTimestamp;
    if (elapsed >= PARRY_WINDOW) {
      this.#playerEntity.set(ParryState, {
        blocking: parry.blocking, // stay blocking if button still held
        parryWindow: false,
        parryTimestamp: parry.parryTimestamp,
      });
    }
  }

  #syncCameraToPlayer(): void {
    if (!this.#camera || !this.#playerEntity) return;

    const pos = this.#playerEntity.get(Position);
    if (pos) {
      this.#camera.position.set(pos.x, pos.y + 1.6, pos.z); // Eye height offset
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
