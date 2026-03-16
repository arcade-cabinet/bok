import type { World } from "koota";
import { Health, Hunger, MoveInput, PlayerState, PlayerTag, Stamina } from "../traits/index.ts";
import { HUNGER_DRAIN_THRESHOLD, HUNGER_HEALTH_DRAIN_RATE, HUNGER_SLOW_THRESHOLD } from "./food.ts";

export function survivalSystem(world: World, dt: number) {
	world
		.query(PlayerTag, Health, Hunger, Stamina, MoveInput, PlayerState)
		.updateEach(([health, hunger, stamina, input, state]) => {
			hunger.current = Math.max(0, hunger.current - dt * hunger.decayRate);

			const hungerPct = hunger.max > 0 ? hunger.current / hunger.max : 0;

			// Critical hunger: health drain at increased rate
			if (hungerPct <= HUNGER_DRAIN_THRESHOLD) {
				health.current = Math.max(0, health.current - dt * HUNGER_HEALTH_DRAIN_RATE);
			} else if (hunger.current <= 0) {
				health.current = Math.max(0, health.current - dt);
			}

			// Hunger slow flag (read by movement system and UI)
			state.hungerSlowed = hungerPct <= HUNGER_SLOW_THRESHOLD && hungerPct > 0;

			if (stamina.current < stamina.max && !input.sprint && !input.jump) {
				stamina.current = Math.min(stamina.max, stamina.current + dt * stamina.regenRate);
			}

			if (state.damageFlash > 0) {
				state.damageFlash = Math.max(0, state.damageFlash - dt * 2);
			}

			// Decay camera shake
			if (state.shakeX !== 0 || state.shakeY !== 0) {
				const decay = Math.min(1, dt * 10);
				state.shakeX *= 1 - decay;
				state.shakeY *= 1 - decay;
				if (Math.abs(state.shakeX) < 0.001) state.shakeX = 0;
				if (Math.abs(state.shakeY) < 0.001) state.shakeY = 0;
			}

			if (health.current <= 0 && !state.isDead) {
				state.isDead = true;
				state.isRunning = false;
			}
		});
}
