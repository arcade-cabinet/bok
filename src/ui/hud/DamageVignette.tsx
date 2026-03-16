import { computeVignetteIntensity, isHealthCritical } from "../../ecs/systems/diegetic-effects.ts";

interface DamageVignetteProps {
	health: number;
	maxHealth?: number;
	damageFlash: number;
}

export function DamageVignette({ health, maxHealth = 100, damageFlash }: DamageVignetteProps) {
	const baseIntensity = computeVignetteIntensity(health, maxHealth);
	const critical = isHealthCritical(health, maxHealth);
	// Merge: persistent health vignette + transient damage flash
	const opacity = Math.min(1, Math.max(baseIntensity, damageFlash));

	return (
		<div
			data-testid="damage-vignette"
			className={`absolute inset-0 pointer-events-none z-[3] vignette-damage ${critical ? "animate-low-health" : ""}`}
			style={{ opacity: critical ? undefined : opacity }}
			aria-hidden="true"
		/>
	);
}
