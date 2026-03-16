/**
 * Quality preset data — device tiers, particle budgets, shadow map sizes,
 * render distance defaults. Pure data, no ECS/Three.js/React.
 */

/** Device performance tiers. */
export const DeviceTier = {
	Low: "low",
	Medium: "medium",
	High: "high",
} as const;
export type DeviceTierId = (typeof DeviceTier)[keyof typeof DeviceTier];

/** Full quality configuration applied at runtime. */
export interface QualityPreset {
	tier: DeviceTierId;
	/** Max render distance in chunks. */
	renderDistance: number;
	/** Shadow map resolution (square). */
	shadowMapSize: number;
	/** Max game particles (mining, combat, sprint). */
	particleBudget: number;
	/** Ambient floating particle count. */
	ambientParticles: number;
	/** Fog near/far ratio relative to render distance. */
	fogNear: number;
	fogFar: number;
}

/** Quality presets per device tier. */
export const QUALITY_PRESETS: Record<DeviceTierId, QualityPreset> = {
	low: {
		tier: "low",
		renderDistance: 2,
		shadowMapSize: 512,
		particleBudget: 100,
		ambientParticles: 100,
		fogNear: 10,
		fogFar: 0.85,
	},
	medium: {
		tier: "medium",
		renderDistance: 3,
		shadowMapSize: 1024,
		particleBudget: 200,
		ambientParticles: 200,
		fogNear: 15,
		fogFar: 0.9,
	},
	high: {
		tier: "high",
		renderDistance: 4,
		shadowMapSize: 1024,
		particleBudget: 500,
		ambientParticles: 300,
		fogNear: 20,
		fogFar: 0.95,
	},
};

/** Get quality preset by tier name. */
export function getPresetForTier(tier: DeviceTierId): QualityPreset {
	return QUALITY_PRESETS[tier];
}

/** Validate that a tier string is a known DeviceTierId. */
export function isValidTier(tier: string): tier is DeviceTierId {
	return tier === "low" || tier === "medium" || tier === "high";
}

/**
 * Clamp render distance to valid range.
 * Respects tier maximums: low=3, medium=4, high=5.
 */
export function clampRenderDistance(distance: number, tier: DeviceTierId): number {
	const maxByTier: Record<DeviceTierId, number> = { low: 3, medium: 4, high: 5 };
	return Math.max(2, Math.min(distance, maxByTier[tier]));
}
