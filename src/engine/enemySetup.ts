/**
 * @module engine/enemySetup
 * @role Spawn biome-specific enemies and boss on terrain with Yuka AI
 * @input Three.js scene, surface height lookup, seed, biome ID
 * @output Enemy state array, boss state, Yuka manager
 */

import * as THREE from 'three';
import { Vehicle, EntityManager as YukaEntityManager } from 'yuka';
import { createEnemyBrain, ENEMY_AI_TYPES } from '../ai/enemyBrain';
import { ContentRegistry } from '../content/index.ts';
import type { EnemySpawnConfig } from '../content/types.ts';
import { PRNG } from '../generation/index.ts';
import { applyBiomeTint, applyBossTint } from '../systems/tint-model.ts';
import { ENEMY_MODELS, loadModel } from './models.ts';
import type { BossState, EnemyState, SurfaceHeightFn } from './types.ts';

const BASE_ENEMY_COUNT = 6;

export interface EnemiesResult {
  enemies: EnemyState[];
  boss: BossState;
  bossMesh: THREE.Object3D;
  yukaManager: YukaEntityManager;
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
 * Enemies are selected from the biome's weighted enemy pool.
 * Stats (health, damage, speed) come from enemy content JSON.
 * Boss model and stats come from biome's bossId content JSON.
 */
export async function spawnEnemies(
  scene: THREE.Scene,
  getSurfaceY: SurfaceHeightFn,
  islandSize: number,
  seed: string,
  biomeId: string,
): Promise<EnemiesResult> {
  const yukaManager = new YukaEntityManager();
  const enemies: EnemyState[] = [];

  const content = new ContentRegistry();
  const biome = content.getBiome(biomeId);
  const enemyPool = biome.enemies;
  const enemyCount = calculateEnemyCount(enemyPool);

  // Fallback box for when GLB fails to load
  const fallbackGeom = new THREE.BoxGeometry(0.7, 1.4, 0.7);
  const fallbackMat = new THREE.MeshLambertMaterial({ color: 0xcc2222 });

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

    // Try loading GLB model, fall back to box mesh
    let mesh: THREE.Object3D;
    try {
      if (modelPath) {
        const model = await loadModel(modelPath);
        model.scale.setScalar(0.8);
        model.position.set(ex + 0.5, ey, ez + 0.5);
        model.castShadow = true;
        applyBiomeTint(model, biomeId);
        scene.add(model);
        mesh = model;
      } else {
        throw new Error('no model path');
      }
    } catch {
      const box = new THREE.Mesh(fallbackGeom, fallbackMat);
      box.position.set(ex + 0.5, ey + 0.7, ez + 0.5);
      box.castShadow = true;
      scene.add(box);
      mesh = box;
    }

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
  }

  // Boss — biome-specific model and stats
  const bossConfig = content.getBoss(biome.bossId);
  const bossModelPath = ENEMY_MODELS[biome.bossId] ?? ENEMY_MODELS.giant;

  const bossPos = { x: islandSize - 8, z: islandSize - 8 };
  const bossY = getSurfaceY(bossPos.x, bossPos.z);
  let bossMesh: THREE.Object3D;
  try {
    const bossModel = await loadModel(bossModelPath);
    bossModel.scale.setScalar(1.5);
    bossModel.position.set(bossPos.x, bossY, bossPos.z);
    bossModel.castShadow = true;
    applyBossTint(bossModel, biomeId);
    scene.add(bossModel);
    bossMesh = bossModel;
  } catch {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 3.0, 1.5),
      new THREE.MeshLambertMaterial({ color: 0x660033 }),
    );
    box.position.set(bossPos.x, bossY + 1.5, bossPos.z);
    box.castShadow = true;
    scene.add(box);
    bossMesh = box;
  }

  const bossVehicle = new Vehicle();
  bossVehicle.position.set(bossPos.x, bossY + 1.5, bossPos.z);
  bossVehicle.maxSpeed = 1.5;
  bossVehicle.mass = 3;
  // biome-ignore lint/suspicious/noExplicitAny: Yuka's setRenderComponent lacks type declarations
  (bossVehicle as any).setRenderComponent(bossMesh, (obj: THREE.Object3D) => {
    obj.position.set(bossVehicle.position.x, bossVehicle.position.y, bossVehicle.position.z);
  });
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

  console.log(`[Bok] Spawned ${enemyCount} enemies + boss (${biome.bossId}) for biome ${biomeId}`);

  return {
    enemies,
    boss,
    bossMesh,
    yukaManager,
    cleanup: () => {
      for (const e of enemies) {
        scene.remove(e.mesh);
        yukaManager.remove(e.vehicle);
      }
      scene.remove(bossMesh);
      yukaManager.remove(bossVehicle);
      enemies.length = 0;
    },
  };
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
