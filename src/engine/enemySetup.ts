/**
 * @module engine/enemySetup
 * @role Spawn biome-specific enemies and boss on terrain with Yuka AI
 * @input JpWorld, surface height lookup, seed, biome ID
 * @output Enemy state array, boss state, Yuka manager, actor cleanup
 *
 * Enemies are spawned as JollyPixel Actors with ModelRenderer components.
 * Model assets are enqueued for batch loading — actual geometry appears
 * after `loadRuntime()` triggers `awake()`. The actor `object3D` (a
 * THREE.Group) is positioned immediately for Yuka vehicle binding.
 *
 * Biome tinting is applied as a post-awake hook via the actor lifecycle.
 */

import type { Entity, World } from 'koota';
import type * as THREE from 'three';
import { Vehicle, EntityManager as YukaEntityManager } from 'yuka';
import { actions } from '../actions';
import { createEnemyBrain, ENEMY_AI_TYPES } from '../ai/enemyBrain';
import { ContentRegistry } from '../content/index.ts';
import type { EnemySpawnConfig } from '../content/types.ts';
import { PRNG } from '../generation/index.ts';
import { applyBiomeTint, applyBossTint } from '../systems/tint-model.ts';
import { Ref, YukaRef } from '../traits';
import { ENEMY_MODELS, type ModelActorResult, spawnModelActor } from './models.ts';
import type { BossState, EnemyState, JpWorld, SurfaceHeightFn } from './types.ts';

const BASE_ENEMY_COUNT = 6;

export interface EnemiesResult {
  enemies: EnemyState[];
  boss: BossState;
  bossMesh: THREE.Object3D;
  yukaManager: YukaEntityManager;
  /** All spawned model actors — kept for post-load tinting and cleanup. */
  actors: ModelActorResult[];
  /** Koota entity references for ECS-spawned enemies (parallel to enemies[]). */
  kootaEntities: Entity[];
  /** Koota entity reference for the boss. */
  kootaBossEntity: Entity | null;
  cleanup: () => void;
}

/**
 * Select an enemy type from a weighted pool using deterministic PRNG.
 * Exported for testing.
 */
export function selectEnemy(pool: ReadonlyArray<EnemySpawnConfig>, rng: PRNG): string {
  const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
  let roll = rng.next() * totalWeight;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.enemyId;
  }
  return pool[0].enemyId;
}

/**
 * Calculate enemy count from biome difficulty.
 * Harder biomes (higher minDifficulty enemies) spawn more enemies.
 */
export function calculateEnemyCount(pool: ReadonlyArray<EnemySpawnConfig>): number {
  const maxDifficulty = Math.max(...pool.map((e) => e.minDifficulty));
  return BASE_ENEMY_COUNT + maxDifficulty * 2;
}

/**
 * Spawn biome-specific enemies and a biome-specific boss on the terrain.
 *
 * Each enemy is a JollyPixel Actor with a ModelRenderer component. Models
 * are enqueued for batch loading via the AssetManager — actual geometry
 * appears after `loadRuntime()` triggers `awake()`. The actor's `object3D`
 * is positioned immediately for Yuka vehicle binding.
 *
 * Biome and boss tinting is deferred to a post-load pass (see
 * `applyTintsAfterLoad()`), since model meshes are not available until
 * the ModelRenderer `awake()` lifecycle phase completes.
 *
 * Stats (health, damage, speed) come from enemy content JSON.
 * Boss model and stats come from biome's bossId content JSON.
 */
export function spawnEnemies(
  jpWorld: JpWorld,
  scene: THREE.Scene,
  getSurfaceY: SurfaceHeightFn,
  islandSize: number,
  seed: string,
  biomeId: string,
  kootaWorld?: World,
): EnemiesResult {
  const yukaManager = new YukaEntityManager();
  const enemies: EnemyState[] = [];
  const actors: ModelActorResult[] = [];
  const kootaEntities: Entity[] = [];

  const content = new ContentRegistry();
  const biome = content.getBiome(biomeId);
  const enemyPool = biome.enemies;
  const enemyCount = calculateEnemyCount(enemyPool);

  const enemyPrng = new PRNG(`${seed}-enemies`);

  for (let i = 0; i < enemyCount; i++) {
    let ex: number, ez: number, ey: number;
    do {
      ex = 5 + Math.floor(enemyPrng.next() * (islandSize - 10));
      ez = 5 + Math.floor(enemyPrng.next() * (islandSize - 10));
      ey = getSurfaceY(ex, ez);
    } while (ey <= 3);

    const enemyType = selectEnemy(enemyPool, enemyPrng);
    const enemyConfig = content.getEnemy(enemyType);
    const modelPath = ENEMY_MODELS[enemyType];

    if (!modelPath) {
      throw new Error(`[Bok] No model mapping for enemy "${enemyType}". Add it to ENEMY_MODELS in models.ts`);
    }

    const actorResult = spawnModelActor(
      jpWorld,
      `enemy-${enemyType}-${i}`,
      modelPath,
      { x: ex + 0.5, y: ey, z: ez + 0.5 },
      0.8,
    );
    actorResult.object3D.castShadow = true;
    actors.push(actorResult);
    const mesh = actorResult.object3D;

    const vehicle = new Vehicle();
    vehicle.position.set(ex + 0.5, ey + 0.7, ez + 0.5);
    vehicle.maxSpeed = enemyConfig.speed;
    vehicle.mass = 1;
    // biome-ignore lint/suspicious/noExplicitAny: Yuka's setRenderComponent lacks type declarations
    (vehicle as any).setRenderComponent(mesh, (renderObj: THREE.Object3D) => {
      renderObj.position.set(vehicle.position.x, vehicle.position.y, vehicle.position.z);
    });

    // Attach GOAP brain based on enemy AI type
    const aiType = ENEMY_AI_TYPES[enemyType] ?? 'melee';
    createEnemyBrain(vehicle, aiType);

    yukaManager.add(vehicle);
    enemies.push({
      mesh: mesh as THREE.Mesh,
      vehicle,
      health: enemyConfig.health,
      maxHealth: enemyConfig.health,
      damage: enemyConfig.damage,
      type: enemyType,
      attackCooldown: 1.5,
    });

    // Spawn parallel Koota entity for ECS tracking
    if (kootaWorld) {
      try {
        const { spawnEnemy: spawnKootaEnemy } = actions(kootaWorld);
        const kootaEntity = spawnKootaEnemy({
          type: enemyType,
          x: ex + 0.5,
          y: ey,
          z: ez + 0.5,
          health: enemyConfig.health,
          damage: enemyConfig.damage,
          speed: enemyConfig.speed,
          modelName: modelPath ?? enemyType,
        });
        // Set Ref trait to the Three.js mesh for sync-rendering
        kootaEntity.set(Ref, mesh);
        // Set YukaRef to the Yuka vehicle for AI systems
        kootaEntity.set(YukaRef, vehicle);
        kootaEntities.push(kootaEntity);
      } catch (err) {
        console.warn(`[Bok] Failed to spawn Koota entity for enemy ${enemyType}:`, err);
      }
    }
  }

  // Boss — biome-specific model and stats
  const bossConfig = content.getBoss(biome.bossId);
  const bossModelPath = ENEMY_MODELS[biome.bossId] ?? ENEMY_MODELS.giant;

  const bossPos = { x: islandSize - 8, z: islandSize - 8 };
  const bossY = getSurfaceY(bossPos.x, bossPos.z);

  const bossActorResult = spawnModelActor(
    jpWorld,
    `boss-${biome.bossId}`,
    bossModelPath,
    { x: bossPos.x, y: bossY, z: bossPos.z },
    1.5,
  );
  bossActorResult.object3D.castShadow = true;
  actors.push(bossActorResult);
  const bossMesh = bossActorResult.object3D;

  const bossVehicle = new Vehicle();
  bossVehicle.position.set(bossPos.x, bossY + 1.5, bossPos.z);
  bossVehicle.maxSpeed = 1.5;
  bossVehicle.mass = 3;
  // biome-ignore lint/suspicious/noExplicitAny: Yuka's setRenderComponent lacks type declarations
  (bossVehicle as any).setRenderComponent(bossMesh, (obj: THREE.Object3D) => {
    obj.position.set(bossVehicle.position.x, bossVehicle.position.y, bossVehicle.position.z);
  });

  // Attach phase-aware BossBrain with CompositeGoal AI
  createEnemyBrain(bossVehicle, 'boss', bossConfig.phases);

  yukaManager.add(bossVehicle);

  // Boss also tracked in enemies array for unified combat
  enemies.push({
    mesh: bossMesh,
    vehicle: bossVehicle,
    health: bossConfig.health,
    maxHealth: bossConfig.health,
    damage: bossConfig.phases[0].attacks[0].damage,
    type: biome.bossId,
    attackCooldown: 2.0,
  });

  const boss: BossState = {
    mesh: bossMesh,
    vehicle: bossVehicle,
    health: bossConfig.health,
    maxHealth: bossConfig.health,
    attackCooldown: 2.0,
    phase: 1,
    defeated: false,
  };

  // Spawn Koota boss entity
  let kootaBossEntity: Entity | null = null;
  if (kootaWorld) {
    try {
      const { spawnBoss } = actions(kootaWorld);
      kootaBossEntity = spawnBoss({
        type: biome.bossId,
        x: bossPos.x,
        y: bossY,
        z: bossPos.z,
        health: bossConfig.health,
        modelName: bossModelPath,
      });
      kootaBossEntity.set(Ref, bossMesh);
      kootaBossEntity.set(YukaRef, bossVehicle);
    } catch (err) {
      console.warn('[Bok] Failed to spawn Koota boss entity:', err);
    }
  }

  console.log(`[Bok] Spawned ${enemyCount} enemies + boss (${biome.bossId}) for biome ${biomeId}`);

  return {
    enemies,
    boss,
    bossMesh,
    yukaManager,
    actors,
    kootaEntities,
    kootaBossEntity,
    cleanup: () => {
      for (const actorResult of actors) {
        if (!actorResult.actor.isDestroyed()) {
          actorResult.actor.destroy();
        }
      }
      // Destroy Koota entities
      for (const entity of kootaEntities) {
        try {
          entity.destroy();
        } catch {
          // Entity may already be destroyed
        }
      }
      if (kootaBossEntity) {
        try {
          kootaBossEntity.destroy();
        } catch {
          // Entity may already be destroyed
        }
      }
      for (const e of enemies) {
        // Remove any non-actor meshes (fallback boxes) from the scene
        if (!e.mesh.userData?.isActor) {
          scene.remove(e.mesh);
        }
        yukaManager.remove(e.vehicle);
      }
      yukaManager.remove(bossVehicle);
      enemies.length = 0;
    },
  };
}

/**
 * Apply biome tinting to all enemy model actors after their models have loaded.
 * Call this after `loadRuntime()` / `runtime.start()` so that ModelRenderer
 * has completed its `awake()` and populated the actor's object3D with mesh children.
 */
export function applyTintsAfterLoad(actors: ModelActorResult[], biomeId: string): void {
  for (const actorResult of actors) {
    const actorName = actorResult.actor.name;
    if (actorName.startsWith('boss-')) {
      applyBossTint(actorResult.object3D, biomeId);
    } else if (actorName.startsWith('enemy-')) {
      applyBiomeTint(actorResult.object3D, biomeId);
    }
  }
}

/**
 * Update enemy AI each frame — chase player when close, wander otherwise.
 */
export function updateEnemyAI(
  enemies: EnemyState[],
  cameraPosition: THREE.Vector3,
  dt: number,
  yukaManager: YukaEntityManager,
): void {
  yukaManager.update(dt);

  for (const enemy of enemies) {
    const dx = cameraPosition.x - enemy.vehicle.position.x;
    const dz = cameraPosition.z - enemy.vehicle.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 15 && dist > 1.5) {
      enemy.vehicle.velocity.set((dx / dist) * 2, 0, (dz / dist) * 2);
    } else if (dist >= 15) {
      enemy.vehicle.velocity.set((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5);
    } else {
      enemy.vehicle.velocity.set(0, 0, 0);
    }
  }
}
