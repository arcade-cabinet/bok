import type { World } from 'koota';
import { MovementIntent, Stamina } from '../../traits/index';

/** Stamina drain rate while sprinting (units/sec). */
const SPRINT_DRAIN_RATE = 10;

/**
 * Manages stamina: drains during sprint, regenerates when not sprinting.
 * Dodge cost is handled in DodgeTickSystem.
 */
export function staminaSystem(world: World, dt: number): void {
  const intent = world.get(MovementIntent);
  const isSprinting = intent?.sprint ?? false;

  const entities = world.query(Stamina);

  for (const entity of entities) {
    const stamina = entity.get(Stamina);
    if (!stamina) continue;

    let newCurrent = stamina.current;

    if (isSprinting) {
      newCurrent -= SPRINT_DRAIN_RATE * dt;
    } else {
      newCurrent += stamina.regenRate * dt;
    }

    newCurrent = Math.max(0, Math.min(stamina.max, newCurrent));

    if (newCurrent !== stamina.current) {
      entity.set(Stamina, {
        current: newCurrent,
        max: stamina.max,
        regenRate: stamina.regenRate,
      });
    }
  }
}
