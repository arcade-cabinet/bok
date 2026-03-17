import {
	computeEdgeBlur,
	computeScreenCracks,
	computeTunnelVision,
	isHealthCritical,
	isHungerBobUnsteady,
	isHungerCritical,
	isRecovering,
	isStaminaCritical,
} from "../../../ecs/systems/diegetic-effects.ts";

export interface MetaVitalsProps {
	health: number;
	maxHealth?: number;
	hunger: number;
	maxHunger?: number;
	stamina: number;
	maxStamina?: number;
	/** Previous frame health — for recovery edge detection. */
	prevHealth?: number;
}

/**
 * Diegetic screen effects driven by player vitals.
 * Composites tunnel vision, screen cracks, hunger desaturation,
 * and stamina edge blur as CSS overlay layers.
 */
export function MetaVitals({
	health,
	maxHealth = 100,
	hunger,
	maxHunger = 100,
	stamina,
	maxStamina = 100,
	prevHealth,
}: MetaVitalsProps) {
	const healthCrit = isHealthCritical(health, maxHealth);
	const hungerCrit = isHungerCritical(hunger, maxHunger);
	const staminaCrit = isStaminaCritical(stamina, maxStamina);
	const anyCritical = healthCrit || hungerCrit || staminaCrit;

	const tunnelOpacity = computeTunnelVision(health, maxHealth);
	const cracksOpacity = computeScreenCracks(health, maxHealth);
	const edgeBlur = computeEdgeBlur(stamina, maxStamina);
	const bobUnsteady = isHungerBobUnsteady(hunger, maxHunger);

	const recovering = prevHealth !== undefined && isRecovering(health, maxHealth, prevHealth);

	return (
		<div
			data-testid="meta-vitals"
			data-any-critical={String(anyCritical)}
			data-health-critical={String(healthCrit)}
			data-hunger-critical={String(hungerCrit)}
			data-stamina-critical={String(staminaCrit)}
			data-recovering={String(recovering)}
			className="absolute inset-0 pointer-events-none z-[4]"
			aria-hidden="true"
		>
			{/* Health: tunnel vision */}
			{tunnelOpacity > 0 && (
				<div
					data-testid="tunnel-vision"
					className="absolute inset-0 tunnel-vision"
					style={{ opacity: tunnelOpacity }}
				/>
			)}

			{/* Health: screen cracks */}
			{cracksOpacity > 0 && (
				<div
					data-testid="screen-cracks"
					className="absolute inset-0 screen-cracks"
					style={{ opacity: cracksOpacity }}
				/>
			)}

			{/* Hunger: deep desaturation + bob unsteadiness marker */}
			{hungerCrit && (
				<div
					data-testid="hunger-desat"
					data-bob-unsteady={String(bobUnsteady)}
					className={`absolute inset-0 ${bobUnsteady ? "hunger-bob-unsteady" : ""}`}
					style={{
						backdropFilter: "saturate(0.2) brightness(0.85)",
						WebkitBackdropFilter: "saturate(0.2) brightness(0.85)",
					}}
				/>
			)}

			{/* Stamina: edge blur */}
			{edgeBlur > 0 && (
				<div
					data-testid="stamina-blur"
					className="absolute inset-0 stamina-blur"
					style={{
						opacity: edgeBlur / 4,
						backdropFilter: `blur(${edgeBlur}px)`,
						WebkitBackdropFilter: `blur(${edgeBlur}px)`,
						mask: "radial-gradient(ellipse at center, transparent 40%, black 100%)",
						WebkitMaskImage: "radial-gradient(ellipse at center, transparent 40%, black 100%)",
					}}
				/>
			)}
		</div>
	);
}
