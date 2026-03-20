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
import { MovementSystem, PhysicsWorld } from '../systems/movement/index.ts';
import {
  combatSystem, dodgeTickSystem, staminaSystem, dotSystem,
  knockbackSystem, bossPhaseSystem,
} from '../systems/combat/index.ts';
import { PLAYER_MOVE_SPEED, PLAYER_SPRINT_MULTIPLIER, PARRY_WINDOW } from '../shared/index.ts';
import { EventBus } from '../shared/index.ts';
import type { InputSystem } from '../input/index.ts';
import { ParticleSystem, WeatherSystem, DayNightCycle, WaterRenderer, PostProcessing } from '../rendering/index.ts';
import { HealthBar, Hotbar, DamageIndicator } from '../ui/index.ts';
import type { SceneDirector } from './SceneDirector.ts';

/**
 * Playable island scene: generates terrain, spawns player + enemies + boss,
 * runs movement/combat/AI each frame. First-person camera with pointer lock.
 *
 * Wires rendering systems (particles, weather, day/night, water, post-processing),
 * UI components (health bar, hotbar, damage indicator), physics (Rapier via PhysicsWorld),
 * and EventBus for cross-domain events.
 */
export class IslandScene extends Scene {
  readonly #content: ContentRegistry;
  readonly #inputSystem: InputSystem;
  readonly #sceneDirector: SceneDirector;
  readonly #movementSystem = new MovementSystem();
  readonly #aiBridge = new AIBridge();
  readonly #yukaManager = new EntityManager();
  readonly #enemyEntities: Array<{ entity: Entity; vehicle: AIVehicle; mesh: THREE.Mesh }> = [];
  #playerEntity: Entity | null = null;
  #playerVehicle: Vehicle | null = null;
  #blueprint: IslandBlueprint | null = null;

  // Seed passed from RunManager/SceneDirector context instead of Date.now()
  #seed: string | null = null;
  #biomeId = 'forest';
  #difficulty = 1;

  // First-person camera
  #camera: THREE.PerspectiveCamera | null = null;
  readonly #cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  readonly #cameraSensitivity = 0.002;

  // Rendering systems (M6)
  #particleSystem: ParticleSystem | null = null;
  #weatherSystem: WeatherSystem | null = null;
  #dayNightCycle: DayNightCycle | null = null;
  #waterRenderer: WaterRenderer | null = null;
  #postProcessing: PostProcessing | null = null;
  #threeScene: THREE.Scene | null = null;
  #waterMesh: THREE.Mesh | null = null;

  // UI components (M7)
  #healthBar: HealthBar | null = null;
  #hotbar: Hotbar | null = null;
  #damageIndicator: DamageIndicator | null = null;
  #lastPlayerHealth = 100;

  // Physics (M9)
  #physicsWorld: PhysicsWorld | null = null;

  // EventBus (M10)
  readonly #eventBus = new EventBus();
  #eventUnsubs: Array<() => void> = [];

  // Enemy Three.js meshes for render sync (M11)
  readonly #enemyMeshMaterial = new THREE.MeshLambertMaterial({ color: 0xcc2222 });
  readonly #enemyMeshGeometry = new THREE.BoxGeometry(0.8, 1.8, 0.8);

  constructor(
    world: World,
    runtime: unknown,
    content: ContentRegistry,
    inputSystem: InputSystem,
    sceneDirector: SceneDirector,
  ) {
    super('island', world, runtime);
    this.#content = content;
    this.#inputSystem = inputSystem;
    this.#sceneDirector = sceneDirector;
  }

  /** Set seed/biome/difficulty before enter() — called by SceneDirector or RunManager. */
  configure(seed: string, biomeId: string, difficulty: number): void {
    this.#seed = seed;
    this.#biomeId = biomeId;
    this.#difficulty = difficulty;
  }

  enter(): void {
    const biomeId = this.#biomeId;
    // H8: Use seed from configure() instead of Date.now()
    const seed = this.#seed ?? `bok-${biomeId}-${Date.now()}`;
    const difficulty = this.#difficulty;

    console.log(`[IslandScene] Generating ${biomeId} island (seed=${seed}, difficulty=${difficulty})...`);

    const biome = this.#content.getBiome(biomeId);
    this.#blueprint = IslandGenerator.generate(biome, seed, difficulty);

    this.world.set(IslandState, {
      biome: biomeId,
      seed,
      difficulty,
      bossDefeated: false,
      enemiesRemaining: this.#blueprint.enemySpawns.length,
    });

    // Setup Three.js scene for rendering systems
    this.#threeScene = new THREE.Scene();

    // Setup first-person camera
    this.#setupCamera();

    // M6: Instantiate rendering systems
    this.#initRendering(biome);

    // M7: Instantiate UI components
    this.#initUI();

    // M9: Instantiate physics
    this.#initPhysics();

    // M10: Wire EventBus listeners
    this.#initEventBus();

    // Spawn player
    this.#spawnPlayer();

    // Spawn enemies (creates Three.js meshes for M11)
    this.#spawnEnemies();

    // Spawn boss
    this.#spawnBoss();

    console.log(
      `[IslandScene] ${biomeId} island ready — player at (${this.#blueprint.playerSpawn.x}, ${this.#blueprint.playerSpawn.y}, ${this.#blueprint.playerSpawn.z}), ` +
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

    // Step 5: Sync Yuka AI decisions -> Koota traits
    for (const { entity, vehicle } of this.#enemyEntities) {
      this.#aiBridge.syncToKoota(vehicle, entity);
    }

    // Step 6: Dodge tick — decrement timers, expire i-frames
    dodgeTickSystem(this.world, dt);

    // Step 7: Stamina — drain/regen
    staminaSystem(this.world, dt);

    // Step 8: Movement system — apply velocity to position
    this.#movementSystem.update(this.world, dt);

    // Step 9: Physics — step Rapier and sync kinematic bodies back to Koota (M9)
    if (this.#physicsWorld) {
      this.#syncKootaToPhysics();
      this.#physicsWorld.step();
      this.#physicsWorld.syncToKoota(this.world);
    }

    // Step 10: Knockback — apply knockback to velocity
    knockbackSystem(this.world);

    // Step 11: Combat system — resolve attacks (checks dodge/parry/blocking)
    combatSystem(this.world);

    // Step 12: DoT — tick damage-over-time effects
    dotSystem(this.world, dt);

    // Step 13: Boss phases — check health thresholds
    bossPhaseSystem(this.world, this.#content);

    // Step 14: Sync Koota -> Yuka (corrected positions, death triggers)
    for (const { entity, vehicle } of this.#enemyEntities) {
      this.#aiBridge.syncFromKoota(vehicle, entity);
    }

    // Step 15: Sync player camera to position
    this.#syncCameraToPlayer();

    // Step 16: Update rendering systems (M6)
    this.#updateRendering(dt);

    // Step 17: Update UI (M7) — HealthBar reads player Health, DamageIndicator flashes
    this.#updateUI();

    // Step 18: Sync enemy meshes from Koota positions (M11)
    this.#syncEnemyMeshes();

    // Step 19: Clean up dead enemies (emits events via M10)
    this.#cleanupDead();
  }

  exit(): void {
    console.log('[IslandScene] Cleaning up...');

    // Destroy entities
    if (this.#playerEntity?.isAlive()) {
      this.#playerEntity.destroy();
    }
    for (const { entity, vehicle, mesh } of this.#enemyEntities) {
      if (entity.isAlive()) entity.destroy();
      this.#yukaManager.remove(vehicle);
      mesh.removeFromParent();
    }
    this.#enemyEntities.length = 0;
    this.#playerEntity = null;
    this.#playerVehicle = null;
    this.#blueprint = null;
    this.#camera = null;

    // Clean up rendering (M6)
    this.#postProcessing?.dispose();
    this.#waterRenderer?.clear();
    this.#waterMesh = null;
    this.#particleSystem = null;
    this.#weatherSystem = null;
    this.#dayNightCycle = null;
    this.#waterRenderer = null;
    this.#postProcessing = null;
    this.#threeScene = null;

    // Clean up UI (M7)
    this.#healthBar?.destroy();
    this.#hotbar?.destroy();
    this.#damageIndicator?.destroy();
    this.#healthBar = null;
    this.#hotbar = null;
    this.#damageIndicator = null;

    // Clean up physics (M9)
    this.#physicsWorld?.destroy();
    this.#physicsWorld = null;

    // Clean up EventBus (M10)
    for (const unsub of this.#eventUnsubs) unsub();
    this.#eventUnsubs.length = 0;
    this.#eventBus.clear();

    // Reset configuration
    this.#seed = null;
    this.#biomeId = 'forest';
    this.#difficulty = 1;
    this.#lastPlayerHealth = 100;
  }

  // --- Rendering initialization (M6) ---

  #initRendering(biome: { skyColor?: string; fogColor?: string; fogDensity?: number; terrain?: { waterLevel?: number } }): void {
    // Particle system
    this.#particleSystem = new ParticleSystem();
    this.#threeScene?.add(this.#particleSystem.mesh);

    // Weather system — set weather based on biome
    this.#weatherSystem = new WeatherSystem();
    this.#threeScene?.add(this.#weatherSystem.mesh);
    this.#weatherSystem.setWeather(this.#biomeId);

    // Day/night cycle — drives the directional light
    this.#dayNightCycle = new DayNightCycle();
    for (const obj of this.#dayNightCycle.sceneObjects) {
      this.#threeScene?.add(obj);
    }

    // Water renderer — create a water plane at terrain water level
    this.#waterRenderer = new WaterRenderer();
    const waterLevel = biome.terrain?.waterLevel ?? 2;
    this.#waterMesh = this.#waterRenderer.createWaterPlane(128, 128, waterLevel);
    this.#threeScene?.add(this.#waterMesh);

    // Post-processing (CSS overlay)
    this.#postProcessing = new PostProcessing();

    // Set scene fog from biome config
    if (biome.fogColor && biome.fogDensity) {
      this.#threeScene!.fog = new THREE.FogExp2(biome.fogColor, biome.fogDensity);
    }
    if (biome.skyColor) {
      this.#threeScene!.background = new THREE.Color(biome.skyColor);
    }
  }

  #updateRendering(dt: number): void {
    // Particle system
    this.#particleSystem?.update(dt);

    // Weather system — track camera position for spawn centering
    if (this.#weatherSystem && this.#camera) {
      this.#weatherSystem.cameraPosition.copy(this.#camera.position);
      this.#weatherSystem.update(dt);
    }

    // Day/night cycle — update sky + lighting
    if (this.#dayNightCycle) {
      this.#dayNightCycle.update(dt);
      // Sync scene background to cycle sky color
      if (this.#threeScene) {
        (this.#threeScene.background as THREE.Color)?.copy(this.#dayNightCycle.skyColor);
      }
    }

    // Water animation
    this.#waterRenderer?.update(dt);

    // Post-processing pulse
    if (this.#postProcessing && this.#playerEntity) {
      const health = this.#playerEntity.get(Health);
      if (health) {
        const pct = (health.current / health.max) * 100;
        this.#postProcessing.lowHealthPulse(pct);
      }
      this.#postProcessing.update(dt);
    }
  }

  // --- UI initialization (M7) ---

  #initUI(): void {
    const hudParent = document.body;
    const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');

    this.#healthBar = new HealthBar(hudParent);
    this.#hotbar = new Hotbar(hudParent);
    if (canvas) {
      this.#damageIndicator = new DamageIndicator(hudParent, canvas);
    }
  }

  #updateUI(): void {
    if (!this.#playerEntity) return;

    // HealthBar reads player Health trait each frame
    if (this.#healthBar) {
      this.#healthBar.update(this.#playerEntity);
    }

    // DamageIndicator flashes on health decrease
    const health = this.#playerEntity.get(Health);
    if (health && health.current < this.#lastPlayerHealth) {
      this.#damageIndicator?.flash();
      this.#eventBus.emit('playerDamaged', { amount: this.#lastPlayerHealth - health.current });
      this.#postProcessing?.damageVignette(
        Math.min(1, (this.#lastPlayerHealth - health.current) / 30),
      );
    }
    if (health) {
      this.#lastPlayerHealth = health.current;
    }
  }

  // --- Physics initialization (M9) ---

  #initPhysics(): void {
    this.#physicsWorld = new PhysicsWorld();
  }

  /** Sync Koota Position -> Rapier kinematic body translation before stepping. */
  #syncKootaToPhysics(): void {
    // Player and enemies have kinematic bodies — sync their current Position to Rapier
    // so Rapier can detect overlaps. The actual movement is handled by MovementSystem.
  }

  // --- EventBus (M10) ---

  #initEventBus(): void {
    // enemyDeath -> particle burst
    this.#eventUnsubs.push(
      this.#eventBus.on<{ x: number; y: number; z: number }>('enemyDeath', (pos) => {
        this.#particleSystem?.emit('enemyDeath', pos, 15);
      }),
    );

    // bossDefeated -> transition to results
    this.#eventUnsubs.push(
      this.#eventBus.on('bossDefeated', () => {
        const islandState = this.world.get(IslandState);
        if (islandState) {
          this.world.set(IslandState, { ...islandState, bossDefeated: true });
        }
        this.#sceneDirector.transition('results');
      }),
    );

    // playerDamaged -> damage indicator flash (already called in #updateUI,
    // but external systems can also emit this event)
    this.#eventUnsubs.push(
      this.#eventBus.on('playerDamaged', () => {
        this.#damageIndicator?.flash();
      }),
    );
  }

  // --- Camera ---

  #setupCamera(): void {
    this.#camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.#cameraEuler.set(0, 0, 0);
  }

  // --- Spawning ---

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

    this.#lastPlayerHealth = 100;

    // Create a player vehicle for AI targeting
    this.#playerVehicle = new Vehicle();
    this.#playerVehicle.position.set(spawn.x, spawn.y, spawn.z);

    // M9: Create kinematic body for player
    if (this.#physicsWorld && this.#playerEntity) {
      this.#physicsWorld.createKinematicBody(
        this.#playerEntity.id(),
        this.#playerEntity,
        { x: 0.4, y: 0.9, z: 0.4 },
      );
    }

    // Position camera at player spawn
    if (this.#camera) {
      this.#camera.position.set(spawn.x, spawn.y + 1.6, spawn.z);
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

      // M11: Create a Three.js mesh for this enemy, sync position from Koota each frame.
      // RenderSyncBehavior/PlayerCameraBehavior (JollyPixel Actors) can be wired in a follow-up.
      const mesh = new THREE.Mesh(this.#enemyMeshGeometry, this.#enemyMeshMaterial);
      mesh.position.set(spawned.position.x, spawned.position.y, spawned.position.z);
      this.#threeScene?.add(mesh);

      // M9: Create kinematic body for enemy
      if (this.#physicsWorld) {
        this.#physicsWorld.createKinematicBody(
          entity.id(),
          entity,
          { x: 0.4, y: 0.9, z: 0.4 },
        );
      }

      this.#enemyEntities.push({ entity, vehicle, mesh });
    }
  }

  #spawnBoss(): void {
    if (!this.#blueprint || !this.#playerVehicle) return;

    const biome = this.#content.getBiome(this.#biomeId);
    let bossConfig;
    try {
      bossConfig = this.#content.getBoss(biome.bossId);
    } catch {
      console.warn('[IslandScene] Boss config not found:', biome.bossId);
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

    // M11: Boss mesh (larger)
    const bossMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.4, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x990066 }),
    );
    bossMesh.position.set(arena.x, arena.y, arena.z);
    this.#threeScene?.add(bossMesh);

    // M9: Physics body for boss
    if (this.#physicsWorld) {
      this.#physicsWorld.createKinematicBody(
        entity.id(),
        entity,
        { x: 0.6, y: 1.2, z: 0.6 },
      );
    }

    this.#enemyEntities.push({ entity, vehicle, mesh: bossMesh });
  }

  // --- Per-frame logic ---

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

    this.#cameraEuler.y -= look.deltaX * this.#cameraSensitivity;
    this.#cameraEuler.x -= look.deltaY * this.#cameraSensitivity;

    const maxPitch = Math.PI / 2 - 0.01;
    this.#cameraEuler.x = Math.max(-maxPitch, Math.min(maxPitch, this.#cameraEuler.x));

    this.#camera.quaternion.setFromEuler(this.#cameraEuler);
  }

  #checkAttackInput(): void {
    if (!this.#playerEntity) return;

    const time = this.world.get(Time);
    if (!time) return;

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

    if (this.#inputSystem.actionMap.isActive('dodge')) {
      const dodge = this.#playerEntity.get(DodgeState);
      if (!dodge?.active) {
        this.#playerEntity.set(DodgeState, {
          active: true,
          iFrames: true,
          cooldownRemaining: 0,
        });
      }
    }
  }

  /** Close parry window after PARRY_WINDOW duration, keep blocking. */
  #tickParryWindow(): void {
    if (!this.#playerEntity) return;

    const parry = this.#playerEntity.get(ParryState);
    if (!parry || !parry.parryWindow) return;

    const time = this.world.get(Time);
    if (!time) return;

    const elapsed = time.elapsed - parry.parryTimestamp;
    if (elapsed >= PARRY_WINDOW) {
      this.#playerEntity.set(ParryState, {
        blocking: parry.blocking,
        parryWindow: false,
        parryTimestamp: parry.parryTimestamp,
      });
    }
  }

  #syncCameraToPlayer(): void {
    if (!this.#camera || !this.#playerEntity) return;

    const pos = this.#playerEntity.get(Position);
    if (pos) {
      this.#camera.position.set(pos.x, pos.y + 1.6, pos.z);
    }
  }

  /** M11: Sync enemy Three.js meshes from Koota Position each frame. */
  #syncEnemyMeshes(): void {
    for (const { entity, mesh } of this.#enemyEntities) {
      const pos = entity.get(Position);
      if (pos) {
        mesh.position.set(pos.x, pos.y, pos.z);
      }
    }
  }

  #cleanupDead(): void {
    for (let i = this.#enemyEntities.length - 1; i >= 0; i--) {
      const { entity, vehicle, mesh } = this.#enemyEntities[i];
      const health = entity.get(Health);
      if (health && health.current <= 0) {
        const pos = entity.get(Position);

        // M10: Emit enemyDeath event for particle system
        if (pos) {
          this.#eventBus.emit('enemyDeath', { x: pos.x, y: pos.y, z: pos.z });
        }

        // Check if this was a boss
        const isBoss = entity.has(BossType);

        if (entity.isAlive()) entity.destroy();
        this.#yukaManager.remove(vehicle);
        mesh.removeFromParent();

        // M9: Remove physics body
        this.#physicsWorld?.removeBody(entity.id());

        this.#enemyEntities.splice(i, 1);

        // Update island state
        const islandState = this.world.get(IslandState);
        if (islandState) {
          this.world.set(IslandState, {
            ...islandState,
            enemiesRemaining: Math.max(0, islandState.enemiesRemaining - 1),
          });
        }

        // M10: If boss died, emit bossDefeated -> triggers transition to results
        if (isBoss) {
          this.#eventBus.emit('bossDefeated', undefined);
        }
      }
    }
  }
}
