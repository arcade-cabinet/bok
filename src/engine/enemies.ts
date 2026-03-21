/**
 * @module engine/enemies
 * @role Spawn enemies and boss on terrain with Yuka AI
 * @input Three.js scene, Yuka EntityManager, surface height lookup, seed
 * @output Enemy state array, boss state, Yuka manager
 */
import { Vehicle, EntityManager as YukaEntityManager } from 'yuka';
import * as THREE from 'three';

import { PRNG } from '../generation/index.ts';
import type { SurfaceHeightFn, EnemyState, BossState } from './types.ts';

const ENEMY_COUNT = 8;

export interface EnemiesResult {
  enemies: EnemyState[];
  boss: BossState;
  bossMesh: THREE.Mesh;
  yukaManager: YukaEntityManager;
  cleanup: () => void;
}

/**
 * Spawn regular enemies and a boss on the terrain.
 * Enemies are red box meshes with Yuka Vehicle AI.
 * Boss is a larger purple mesh at the far corner.
 */
export function spawnEnemies(
  scene: THREE.Scene,
  getSurfaceY: SurfaceHeightFn,
  islandSize: number,
  seed: string,
): EnemiesResult {
  const yukaManager = new YukaEntityManager();
  const enemies: EnemyState[] = [];

  // Shared geometry/material for regular enemies
  const enemyGeom = new THREE.BoxGeometry(0.7, 1.4, 0.7);
  const enemyMat = new THREE.MeshLambertMaterial({ color: 0xcc2222 });

  const enemyPrng = new PRNG(seed + '-enemies');

  for (let i = 0; i < ENEMY_COUNT; i++) {
    let ex: number, ez: number, ey: number;
    do {
      ex = 5 + Math.floor(enemyPrng.next() * (islandSize - 10));
      ez = 5 + Math.floor(enemyPrng.next() * (islandSize - 10));
      ey = getSurfaceY(ex, ez);
    } while (ey <= 3);

    const mesh = new THREE.Mesh(enemyGeom, enemyMat);
    mesh.position.set(ex + 0.5, ey + 0.7, ez + 0.5);
    mesh.castShadow = true;
    scene.add(mesh);

    const vehicle = new Vehicle();
    vehicle.position.set(ex + 0.5, ey + 0.7, ez + 0.5);
    vehicle.maxSpeed = 2;
    vehicle.mass = 1;
    (vehicle as any).setRenderComponent(mesh, (renderObj: THREE.Mesh) => {
      renderObj.position.set(vehicle.position.x, vehicle.position.y, vehicle.position.z);
    });

    yukaManager.add(vehicle);
    enemies.push({ mesh, vehicle, health: 30, attackCooldown: 1.5 });
  }

  // Boss — larger, tougher, at far corner
  const bossPos = { x: islandSize - 8, z: islandSize - 8 };
  const bossY = getSurfaceY(bossPos.x, bossPos.z);
  const bossMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 3.0, 1.5),
    new THREE.MeshLambertMaterial({ color: 0x660033 }),
  );
  bossMesh.position.set(bossPos.x, bossY + 1.5, bossPos.z);
  bossMesh.castShadow = true;
  scene.add(bossMesh);

  const bossVehicle = new Vehicle();
  bossVehicle.position.set(bossPos.x, bossY + 1.5, bossPos.z);
  bossVehicle.maxSpeed = 1.5;
  bossVehicle.mass = 3;
  (bossVehicle as any).setRenderComponent(bossMesh, (obj: THREE.Mesh) => {
    obj.position.set(bossVehicle.position.x, bossVehicle.position.y, bossVehicle.position.z);
  });
  yukaManager.add(bossVehicle);

  // Boss also tracked in enemies array for unified combat
  enemies.push({ mesh: bossMesh, vehicle: bossVehicle, health: 150, attackCooldown: 2.0 });

  const boss: BossState = {
    mesh: bossMesh,
    vehicle: bossVehicle,
    health: 150,
    maxHealth: 150,
    attackCooldown: 2.0,
    phase: 1,
    defeated: false,
  };

  console.log(`[Bok] Spawned ${ENEMY_COUNT} enemies + boss`);

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
      enemy.vehicle.velocity.set(dx / dist * 2, 0, dz / dist * 2);
    } else if (dist >= 15) {
      enemy.vehicle.velocity.set(
        (Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5,
      );
    } else {
      enemy.vehicle.velocity.set(0, 0, 0);
    }
  }
}
