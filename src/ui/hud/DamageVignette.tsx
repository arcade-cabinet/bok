interface DamageVignetteProps {
	health: number;
	damageFlash: number;
}

export function DamageVignette({ health, damageFlash }: DamageVignetteProps) {
	const isLowHealth = health < 20 && health > 0;

	return (
		<div
			className={`absolute inset-0 pointer-events-none z-[3] vignette-damage ${
				isLowHealth ? "animate-low-health" : ""
			}`}
			style={{
				opacity: isLowHealth ? undefined : Math.max(0, Math.min(1, damageFlash)),
			}}
		/>
	);
}
