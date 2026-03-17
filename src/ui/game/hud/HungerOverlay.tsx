import { computeDesaturation } from "../../../ecs/systems/diegetic-effects.ts";

interface HungerOverlayProps {
	hunger: number;
	maxHunger?: number;
}

/**
 * Full-screen desaturation overlay driven by hunger level.
 * Applies a CSS saturate filter that ramps from 100% (well-fed) to 30% (starving).
 */
export function HungerOverlay({ hunger, maxHunger = 100 }: HungerOverlayProps) {
	const saturation = computeDesaturation(hunger, maxHunger);
	if (saturation >= 1) return null;

	return (
		<div
			data-testid="hunger-overlay"
			className="absolute inset-0 pointer-events-none z-[2]"
			style={{
				backdropFilter: `saturate(${saturation})`,
				WebkitBackdropFilter: `saturate(${saturation})`,
			}}
			aria-hidden="true"
		/>
	);
}
