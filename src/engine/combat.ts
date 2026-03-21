/**
 * @module engine/combat
 * @role Handle player attacks, enemy attacks, loot drops, boss phases
 * @input Enemies, camera, scene, audio functions
 * @output Combat state, update function, event emitter
 */
import * as THREE from 'three';

import {
  playBossPhase,
  playEnemyDeath,
  playHitImpact,
  playPlayerHurt,
  playSwordSwing,
  playVictory,
} from '../audio/GameAudio.ts';
import { hapticImpact } from '../platform/CapacitorBridge.ts';
import type { BossState, EnemyState, EngineEventListener } from './types.ts';

const ATTACK_RANGE = 2.5;
const CONTACT_RANGE = 1.8;
const PLAYER_DAMAGE = 15;
const ENEMY_DAMAGE = 10;
const ATTACK_COOLDOWN = 0.4;

interface LootDrop {
  mesh: THREE.Mesh;
  type: string;
  origin: THREE.Vector3;
}

export interface CombatState {
  playerHealth: number;
  maxHealth: number;
  playerAttackCooldown: number;
  phase: 'playing' | 'dead' | 'victory';
  lootDrops: LootDrop[];
}

export interface CombatSystem {
  state: CombatState;
  triggerAttack: () => void;
  update: (dt: number, cameraPos: THREE.Vector3) => void;
  cleanup: () => void;
}

/**
 * Create the combat system. Manages player/enemy attacks, loot drops, boss phases.
 * Emits events to React via the listener callback.
 */
export function createCombat(
  scene: THREE.Scene,
  enemies: EnemyState[],
  boss: BossState,
  bossMesh: THREE.Object3D,
  onEvent: EngineEventListener,
  bossContentId = 'ancient-treant',
  bossTomeAbility = 'dash',
): CombatSystem {
  const lootGeom = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const lootMats: Record<string, THREE.MeshLambertMaterial> = {
    'health-potion': new THREE.MeshLambertMaterial({ color: 0xff4444 }),
    'tome-page': new THREE.MeshLambertMaterial({ color: 0xffdd00 }),
  };

  const state: CombatState = {
    playerHealth: 100,
    maxHealth: 100,
    playerAttackCooldown: 0,
    phase: 'playing',
    lootDrops: [],
  };

  let pendingAttack = false;

  function spawnLoot(pos: THREE.Vector3, type: string): void {
    const mat = lootMats[type] ?? lootMats['health-potion'];
    const mesh = new THREE.Mesh(lootGeom, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    state.lootDrops.push({ mesh, type, origin: pos.clone() });
  }

  function update(dt: number, cameraPos: THREE.Vector3): void {
    if (state.phase !== 'playing') return;

    state.playerAttackCooldown = Math.max(0, state.playerAttackCooldown - dt);

    // Auto-attack on proximity (contact combat)
    if (!pendingAttack && state.playerAttackCooldown <= 0) {
      for (const e of enemies) {
        const dx = cameraPos.x - e.mesh.position.x;
        const dz = cameraPos.z - e.mesh.position.z;
        if (Math.sqrt(dx * dx + dz * dz) < CONTACT_RANGE) {
          pendingAttack = true;
          break;
        }
      }
    }

    // Execute attack
    if (pendingAttack && state.playerAttackCooldown <= 0) {
      pendingAttack = false;
      state.playerAttackCooldown = ATTACK_COOLDOWN;
      playSwordSwing();

      let closestIdx = -1;
      let closestDist = ATTACK_RANGE;
      for (let i = 0; i < enemies.length; i++) {
        const dx = cameraPos.x - enemies[i].mesh.position.x;
        const dz = cameraPos.z - enemies[i].mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      }

      if (closestIdx >= 0) {
        const target = enemies[closestIdx];
        target.health -= PLAYER_DAMAGE;
        playHitImpact();
        hapticImpact('medium');

        // Hit flash — scale bounce (works with both box meshes and GLB models)
        const origScale = target.mesh.scale.clone();
        target.mesh.scale.multiplyScalar(1.3);
        setTimeout(() => {
          if (target.mesh.parent) target.mesh.scale.copy(origScale);
        }, 100);

        if (target.health <= 0) {
          const isBoss = target.mesh === bossMesh;
          const pos = target.mesh.position.clone();
          pos.y += 0.3;

          scene.remove(target.mesh);
          enemies.splice(closestIdx, 1);
          playEnemyDeath();
          spawnLoot(pos, isBoss ? 'tome-page' : 'health-potion');
          onEvent({ type: 'enemyKilled', position: { x: pos.x, y: pos.y, z: pos.z } });

          if (isBoss && !boss.defeated) {
            boss.defeated = true;
            playVictory();
            state.phase = 'victory';
            onEvent({ type: 'bossDefeated', bossId: bossContentId, tomeAbility: bossTomeAbility });
          }
        }
      }
    }

    // Boss phase transitions
    if (!boss.defeated) {
      const bossEntry = enemies.find((e) => e.mesh === bossMesh);
      if (bossEntry) {
        const pct = bossEntry.health / boss.maxHealth;
        if (pct <= 0.66 && boss.phase === 1) {
          boss.phase = 2;
          playBossPhase();
          // Phase 2: scale up boss slightly
          boss.vehicle.maxSpeed = 2.5;
          onEvent({ type: 'bossPhaseChange', phase: 2 });
        }
        if (pct <= 0.33 && boss.phase === 2) {
          boss.phase = 3;
          playBossPhase();
          bossMesh.scale.multiplyScalar(1.2); // Phase 3: even bigger
          boss.vehicle.maxSpeed = 3.5;
          onEvent({ type: 'bossPhaseChange', phase: 3 });
        }
      }
    }

    // Enemies attack player
    for (const enemy of enemies) {
      const dx = cameraPos.x - enemy.mesh.position.x;
      const dz = cameraPos.z - enemy.mesh.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1.8) {
        enemy.attackCooldown -= dt;
        if (enemy.attackCooldown <= 0) {
          enemy.attackCooldown = 1.5;
          state.playerHealth = Math.max(0, state.playerHealth - ENEMY_DAMAGE);
          playPlayerHurt();
          hapticImpact('heavy');
          onEvent({ type: 'playerDamaged', amount: ENEMY_DAMAGE });

          if (state.playerHealth <= 0) {
            state.phase = 'dead';
            onEvent({ type: 'playerDied' });
          }
        }
      }
    }

    // Loot pickup + animation
    for (let i = state.lootDrops.length - 1; i >= 0; i--) {
      const drop = state.lootDrops[i];
      drop.mesh.rotation.y += dt * 3;
      drop.mesh.position.y = drop.origin.y + Math.sin(Date.now() * 0.003) * 0.15;

      const dx = cameraPos.x - drop.mesh.position.x;
      const dz = cameraPos.z - drop.mesh.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1.5) {
        scene.remove(drop.mesh);
        state.lootDrops.splice(i, 1);
        if (drop.type === 'health-potion') {
          state.playerHealth = Math.min(state.maxHealth, state.playerHealth + 25);
        }
        onEvent({ type: 'lootPickup', itemType: drop.type });
      }
    }
  }

  return {
    state,
    triggerAttack: () => {
      pendingAttack = true;
    },
    update,
    cleanup: () => {
      for (const drop of state.lootDrops) scene.remove(drop.mesh);
      state.lootDrops.length = 0;
    },
  };
}
