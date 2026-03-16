import type { World } from "koota";
import {
  PlayerTag,
  Health,
  Hunger,
  Stamina,
  MoveInput,
  PlayerState,
} from "../traits/index.ts";

export function survivalSystem(world: World, dt: number) {
  world
    .query(PlayerTag, Health, Hunger, Stamina, MoveInput, PlayerState)
    .updateEach(([health, hunger, stamina, input, state]) => {
      hunger.current = Math.max(0, hunger.current - dt * hunger.decayRate);

      if (hunger.current <= 0) {
        health.current = Math.max(0, health.current - dt);
      }

      if (stamina.current < stamina.max && !input.sprint && !input.jump) {
        stamina.current = Math.min(stamina.max, stamina.current + dt * stamina.regenRate);
      }

      if (state.damageFlash > 0) {
        state.damageFlash = Math.max(0, state.damageFlash - dt * 2);
      }

      if (health.current <= 0 && !state.isDead) {
        state.isDead = true;
        state.isRunning = false;
      }
    });
}
