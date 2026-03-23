/**
 * @module engine/combat
 * @role Handle player attacks, enemy attacks, loot drops, boss phases
 * @input Enemies, camera, scene, audio functions, weapon config, defensive state
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
import { ContentRegistry, type WeaponConfig } from '../content/index.ts';
import { hapticImpact } from '../platform/CapacitorBridge.ts';
import type { ParticleSystem } from '../rendering/index.ts';
import { calculateDamage } from '../systems/combat/DamageCalculator.ts';
import type { SnapshotSources } from './engineSnapshot.ts';
import type { ChestState } from './lootSetup.ts';
import { checkChestInteraction, getLootTables } from './lootSetup.ts';
import type { BossPhaseConfig, BossState, EnemyState, EngineEventListener } from './types.ts';

const CONTACT_RANGE = 1.8;
const DEFAULT_ENEMY_DAMAGE = 10;

/** Defensive state fed from the game loop each frame */
export interface DefensiveState {
  dodgeIFrames: number;
  blockActive: boolean;
  parryWindow: number;
  stamina: number;
  maxStamina: number;
}

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
  update: (dt: number, cameraPos: THREE.Vector3, defensive?: DefensiveState) => void;
  cleanup: () => void;
  /** Current combo step (0-2) for HUD display */
  getComboStep: () => number;
  /** Return current combat-related data for mid-run snapshot capture */
  getSnapshotSources: () => Partial<SnapshotSources>;
}

/**
 * Create the combat system. Manages player/enemy attacks, loot drops, boss phases.
 * Uses weapon config for damage/range/speed and combo tracker for 3-hit chains.
 * Respects dodge i-frames, block damage reduction, and parry windows.
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
  bossPhases?: BossPhaseConfig[],
  weaponConfigOverride?: WeaponConfig,
  chests?: ChestState[],
  chestSeed?: string,
  particles?: ParticleSystem | null,
  gameMode: 'creative' | 'survival' = 'survival',
): CombatSystem {
  const lootGeom = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const lootMats: Record<string, THREE.MeshLambertMaterial> = {
    'health-potion': new THREE.MeshLambertMaterial({ color: 0xff4444 }),
    'tome-page': new THREE.MeshLambertMaterial({ color: 0xffdd00 }),
  };

  // Load weapon config from content registry or use override
  const content = new ContentRegistry();
  const equippedWeapon: WeaponConfig = weaponConfigOverride ?? content.getWeapon('wooden-sword');

  // Combo state — managed inline to account for attack cooldown
  // The combo window starts *after* the attack cooldown expires, not from the hit moment.
  let comboStep = 0; // 0, 1, 2 for 3-hit chain
  let comboTimer = 0; // seconds remaining in combo window

  const state: CombatState = {
    playerHealth: 100,
    maxHealth: 100,
    playerAttackCooldown: 0,
    phase: 'playing',
    lootDrops: [],
  };

  let pendingAttack = false;
  let killCount = 0;
  let elapsedTime = 0;

  function spawnLoot(pos: THREE.Vector3, type: string): void {
    const mat = lootMats[type] ?? lootMats['health-potion'];
    const mesh = new THREE.Mesh(lootGeom, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    state.lootDrops.push({ mesh, type, origin: pos.clone() });
  }

  // --- Boss phase attack state ---
  const bossAttackCooldowns: Map<string, number> = new Map();
  let bossTelegraphTimer = 0;
  let bossTelegraphAttack: BossPhaseConfig['attacks'][0] | null = null;

  /** Opened chest IDs for snapshot */
  const openedChestIds: string[] = [];

  function update(dt: number, cameraPos: THREE.Vector3, defensive?: DefensiveState): void {
    if (state.phase !== 'playing') return;
    elapsedTime += dt;

    // Default defensive state if not provided
    const def: DefensiveState = defensive ?? {
      dodgeIFrames: 0,
      blockActive: false,
      parryWindow: 0,
      stamina: 100,
      maxStamina: 100,
    };

    state.playerAttackCooldown = Math.max(0, state.playerAttackCooldown - dt);

    // Tick combo window — expires after cooldown + window
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) {
        comboStep = 0; // combo expired, reset
      }
    }

    // Auto-attack on proximity (contact combat) — skip dying enemies
    if (!pendingAttack && state.playerAttackCooldown <= 0) {
      for (const e of enemies) {
        if (e.dying) continue;
        const dx = cameraPos.x - e.mesh.position.x;
        const dz = cameraPos.z - e.mesh.position.z;
        if (Math.sqrt(dx * dx + dz * dz) < CONTACT_RANGE) {
          pendingAttack = true;
          break;
        }
      }
    }

    // Execute attack — uses weapon config for range, speed, and combo damage
    if (pendingAttack && state.playerAttackCooldown <= 0) {
      pendingAttack = false;

      // Read combo multiplier for current step
      const comboHit = equippedWeapon.combo[comboStep];
      const comboMultiplier = comboHit.damageMultiplier;

      // Advance combo step (wraps after full chain)
      comboStep = (comboStep + 1) % equippedWeapon.combo.length;

      // Attack cooldown based on weapon speed (attacks per second)
      const cooldownDuration = 1.0 / equippedWeapon.attackSpeed;
      state.playerAttackCooldown = cooldownDuration;

      // Combo window = cooldown + weapon's combo window (ms→s)
      // This ensures the player can chain attacks even when cooldown > windowMs
      comboTimer = cooldownDuration + comboHit.windowMs / 1000;
      playSwordSwing();

      // Find closest living enemy within weapon range
      let closestIdx = -1;
      let closestDist = equippedWeapon.range;
      for (let i = 0; i < enemies.length; i++) {
        if (enemies[i].dying) continue;
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

        // Calculate damage using the proper damage formula
        const finalDamage = calculateDamage({
          weaponBaseDamage: equippedWeapon.baseDamage,
          comboMultiplier,
          critMultiplier: 1.0, // Crit system deferred
          armorReduction: 0, // Enemies have no armor yet
        });

        target.health -= finalDamage;
        playHitImpact();
        hapticImpact('medium');

        const ex = target.mesh.position.x;
        const ey = target.mesh.position.y;
        const ez = target.mesh.position.z;

        // Emit hit particles at impact point
        particles?.emit('hit', { x: ex, y: ey + 0.5, z: ez }, 8);

        // Emit attackHit event for React (damage numbers + lighter screen shake)
        onEvent({ type: 'attackHit', damage: finalDamage, position: { x: ex, y: ey, z: ez } });

        // Hit flash — scale bounce (works with both box meshes and GLB models)
        const origScale = target.mesh.scale.clone();
        target.mesh.scale.multiplyScalar(1.3);
        setTimeout(() => {
          if (target.mesh.parent) target.mesh.scale.copy(origScale);
        }, 100);

        if (target.health <= 0 && !target.dying) {
          const isBoss = target.mesh === bossMesh;
          const pos = target.mesh.position.clone();
          pos.y += 0.3;

          // Death particles — larger red burst
          particles?.emit('enemyDeath', { x: pos.x, y: pos.y, z: pos.z }, 20);

          // Start death animation instead of instant removal
          target.dying = true;
          target.deathTimer = 0.5;

          killCount += 1;
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

    // Boss phase transitions (phase-config-aware)
    if (!boss.defeated) {
      const bossEntry = enemies.find((e) => e.mesh === bossMesh);
      if (bossEntry) {
        const pct = bossEntry.health / boss.maxHealth;

        if (bossPhases && bossPhases.length > 0) {
          // Phase-config-driven transitions
          for (let pi = bossPhases.length - 1; pi >= 0; pi--) {
            const phaseConfig = bossPhases[pi];
            const phaseNum = pi + 1;
            if (pct <= phaseConfig.healthThreshold && boss.phase < phaseNum) {
              boss.phase = phaseNum;
              playBossPhase();
              // Dramatic particle burst on phase change
              particles?.emit(
                'hit',
                {
                  x: bossMesh.position.x,
                  y: bossMesh.position.y + 1,
                  z: bossMesh.position.z,
                },
                30,
              );
              // Clear cooldowns and telegraph on phase change
              bossAttackCooldowns.clear();
              bossTelegraphTimer = 0;
              bossTelegraphAttack = null;
              onEvent({ type: 'bossPhaseChange', phase: phaseNum });
            }
          }
        } else {
          // Legacy fixed-threshold transitions
          if (pct <= 0.66 && boss.phase === 1) {
            boss.phase = 2;
            playBossPhase();
            boss.vehicle.maxSpeed = 2.5;
            onEvent({ type: 'bossPhaseChange', phase: 2 });
          }
          if (pct <= 0.33 && boss.phase === 2) {
            boss.phase = 3;
            playBossPhase();
            bossMesh.scale.multiplyScalar(1.2);
            boss.vehicle.maxSpeed = 3.5;
            onEvent({ type: 'bossPhaseChange', phase: 3 });
          }
        }
      }
    }

    // --- Boss phase attacks (telegraph + execute) ---
    if (bossPhases && bossPhases.length > 0 && !boss.defeated) {
      const currentPhaseConfig = bossPhases[boss.phase - 1];
      if (currentPhaseConfig) {
        // Tick attack cooldowns
        for (const [name, cd] of bossAttackCooldowns) {
          if (cd > 0) bossAttackCooldowns.set(name, cd - dt);
        }

        // If telegraphing, tick the timer
        if (bossTelegraphAttack) {
          bossTelegraphTimer -= dt;
          if (bossTelegraphTimer <= 0) {
            // Execute the attack
            const atk = bossTelegraphAttack;
            bossTelegraphAttack = null;

            const bDx = cameraPos.x - bossMesh.position.x;
            const bDz = cameraPos.z - bossMesh.position.z;
            const bDist = Math.sqrt(bDx * bDx + bDz * bDz);

            if (atk.type === 'summon') {
              onEvent({ type: 'bossSummon', attackName: atk.name });
            } else if (gameMode !== 'creative' && (atk.type === 'ranged' || bDist <= atk.range)) {
              // Ranged always hits if in range at selection, melee/aoe check range at execution
              // Creative mode: skip all boss damage to player
              const dmg = atk.damage;
              state.playerHealth = Math.max(0, state.playerHealth - dmg);
              if (dmg > 0) {
                playPlayerHurt();
                hapticImpact('heavy');
                onEvent({ type: 'playerDamaged', amount: dmg });
              }
              if (state.playerHealth <= 0) {
                state.phase = 'dead';
                onEvent({ type: 'playerDied' });
              }
            }

            // Put attack on cooldown
            bossAttackCooldowns.set(atk.name, atk.cooldown);
          }
        } else {
          // Select next attack
          const bDx = cameraPos.x - bossMesh.position.x;
          const bDz = cameraPos.z - bossMesh.position.z;
          const bDist = Math.sqrt(bDx * bDx + bDz * bDz);

          for (const atk of currentPhaseConfig.attacks) {
            const cd = bossAttackCooldowns.get(atk.name) ?? 0;
            if (cd > 0) continue;
            if (bDist > atk.range) continue;

            // Start telegraph
            bossTelegraphAttack = atk;
            bossTelegraphTimer = atk.telegraph;
            onEvent({ type: 'bossTelegraph', attackName: atk.name, duration: atk.telegraph });
            break;
          }
        }
      }
    }

    // --- Dying enemy animation (shrink + fade over 0.5s) ---
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if (!enemy.dying || enemy.deathTimer === undefined) continue;

      enemy.deathTimer -= dt;
      const t = Math.max(0, enemy.deathTimer / 0.5);
      enemy.mesh.scale.setScalar(t);

      // Fade material opacity if it supports transparency
      enemy.mesh.traverse((child) => {
        if ('material' in child) {
          const mat = (child as THREE.Mesh).material;
          if (mat && !Array.isArray(mat)) {
            (mat as THREE.MeshLambertMaterial).transparent = true;
            (mat as THREE.MeshLambertMaterial).opacity = t;
          }
        }
      });

      if (enemy.deathTimer <= 0) {
        scene.remove(enemy.mesh);
        enemies.splice(i, 1);
      }
    }

    // Enemies attack player — respects dodge i-frames, block, and parry
    for (const enemy of enemies) {
      // Skip dying enemies and boss for generic contact damage when boss phases are configured
      if (enemy.dying) continue;
      if (gameMode === 'creative') continue; // Creative mode: player is invincible
      if (bossPhases && bossPhases.length > 0 && enemy.mesh === bossMesh) continue;

      const dx = cameraPos.x - enemy.mesh.position.x;
      const dz = cameraPos.z - enemy.mesh.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1.8) {
        enemy.attackCooldown -= dt;
        if (enemy.attackCooldown <= 0) {
          enemy.attackCooldown = 1.5;

          // Dodge i-frames: skip damage entirely
          if (def.dodgeIFrames > 0) {
            continue;
          }

          // Parry window: negate all damage
          if (def.parryWindow > 0) {
            onEvent({ type: 'parry' });
            hapticImpact('light');
            continue;
          }

          // Use per-enemy damage from content config
          const enemyDmg = enemy.damage ?? DEFAULT_ENEMY_DAMAGE;

          // Block: reduce damage by 50%, minimum 1
          if (def.blockActive) {
            const reduced = Math.max(1, Math.floor(enemyDmg * 0.5));
            state.playerHealth = Math.max(0, state.playerHealth - reduced);
            playPlayerHurt();
            hapticImpact('medium');
            onEvent({ type: 'block', damage: reduced });

            if (state.playerHealth <= 0) {
              state.phase = 'dead';
              onEvent({ type: 'playerDied' });
            }
            continue;
          }

          // Full damage
          state.playerHealth = Math.max(0, state.playerHealth - enemyDmg);
          playPlayerHurt();
          hapticImpact('heavy');
          onEvent({ type: 'playerDamaged', amount: enemyDmg });

          if (state.playerHealth <= 0) {
            state.phase = 'dead';
            onEvent({ type: 'playerDied' });
          }
        }
      }
    }

    // Chest interaction
    if (chests && chestSeed) {
      const lootTables = getLootTables();
      const result = checkChestInteraction(cameraPos, chests, lootTables, chestSeed);
      if (result) {
        openedChestIds.push(result.chest.id);
        const items = result.items.map((i) => ({
          name: i.itemId
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
          amount: i.amount,
        }));
        hapticImpact('light');
        onEvent({ type: 'chestOpened', tier: result.chest.tier, items });
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
    getComboStep: () => comboStep,
    cleanup: () => {
      for (const drop of state.lootDrops) scene.remove(drop.mesh);
      state.lootDrops.length = 0;
    },
    getSnapshotSources: (): Partial<SnapshotSources> => ({
      combatState: {
        playerHealth: state.playerHealth,
        maxHealth: state.maxHealth,
        killCount,
        elapsed: Math.round(elapsedTime),
      },
      enemies: enemies.map((e, i) => ({
        id: `enemy-${i}`,
        type: e.mesh === bossMesh ? 'boss' : 'minion',
        position: {
          x: e.mesh.position.x,
          y: e.mesh.position.y,
          z: e.mesh.position.z,
        },
        health: e.health,
        maxHealth: e.mesh === bossMesh ? boss.maxHealth : 50,
        aiState: 'active',
      })),
      openedChests: openedChestIds,
      defeatedBoss: boss.defeated,
    }),
  };
}
