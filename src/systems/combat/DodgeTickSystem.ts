import type { World } from 'koota';
import { DodgeState, Stamina } from '../../traits/index';

/** Duration of i-frames during dodge (seconds). */
const IFRAMES_DURATION = 0.3;
/** Total dodge cooldown (seconds). */
const DODGE_COOLDOWN = 0.8;
/** Stamina cost per dodge. */
const DODGE_STAMINA_COST = 25;

/**
 * Ticks dodge timers each frame.
 * - After IFRAMES_DURATION, iFrames expire.
 * - After DODGE_COOLDOWN, cooldown expires and active resets.
 * - Deducts stamina on dodge activation and blocks dodge if stamina < cost.
 */
export function dodgeTickSystem(world: World, dt: number): void {
  const entities = world.query(DodgeState);

  for (const entity of entities) {
    const dodge = entity.get(DodgeState)!;
    if (!dodge.active) continue;

    // On first frame of dodge, check and deduct stamina
    if (dodge.cooldownRemaining <= 0) {
      // Fresh dodge — set cooldown and deduct stamina
      const stamina = entity.has(Stamina) ? entity.get(Stamina)! : null;
      if (stamina && stamina.current < DODGE_STAMINA_COST) {
        // Not enough stamina — cancel dodge
        entity.set(DodgeState, { active: false, iFrames: false, cooldownRemaining: 0 });
        continue;
      }
      if (stamina) {
        entity.set(Stamina, {
          current: Math.max(0, stamina.current - DODGE_STAMINA_COST),
          max: stamina.max,
          regenRate: stamina.regenRate,
        });
      }
      entity.set(DodgeState, {
        active: true,
        iFrames: true,
        cooldownRemaining: DODGE_COOLDOWN,
      });
      continue;
    }

    const newCooldown = dodge.cooldownRemaining - dt;
    const elapsed = DODGE_COOLDOWN - newCooldown;

    if (newCooldown <= 0) {
      // Cooldown expired — reset dodge entirely
      entity.set(DodgeState, { active: false, iFrames: false, cooldownRemaining: 0 });
    } else if (elapsed >= IFRAMES_DURATION && dodge.iFrames) {
      // i-frames expired, still in cooldown
      entity.set(DodgeState, { active: true, iFrames: false, cooldownRemaining: newCooldown });
    } else {
      entity.set(DodgeState, { active: dodge.active, iFrames: dodge.iFrames, cooldownRemaining: newCooldown });
    }
  }
}
