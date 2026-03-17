/**
 * Seasonal particle visual configs — pure data, no ECS or Three.js.
 * Consumed by AmbientParticlesBehavior (or a seasonal variant) to
 * drive per-season ambient particle effects.
 *
 * Vår:    cherry blossoms (pink/white, brief, gentle fall)
 * Sommar: pollen/dust motes (subtle golden, very small, few)
 * Höst:   falling leaves (gold/brown, tumble, larger)
 * Vinter: snowflakes (white, slow drift, dense)
 */

import type { SeasonId } from "./season-data.ts";
import { Season } from "./season-data.ts";

// ─── Types ───

export interface SeasonParticleConfig {
	/** Human label for the particle type. */
	label: string;
	/** Hex colors to randomly pick from. */
	colors: number[];
	/** Number of particles to spawn. */
	count: number;
	/** Point size (world units). */
	size: number;
	/** Base opacity [0,1]. */
	opacity: number;
	/** Downward fall speed (units/s). */
	fallSpeed: number;
	/** Lateral drift amplitude (units). */
	drift: number;
	/** Whether particles rotate/wobble (leaves). */
	tumble: boolean;
}

// ─── Per-Season Configs ───

const CONFIGS: Record<SeasonId, SeasonParticleConfig> = {
	[Season.Var]: {
		label: "blossoms",
		colors: [0xffb7c5, 0xffc0cb, 0xffffff, 0xffe4e1],
		count: 200,
		size: 0.15,
		opacity: 0.6,
		fallSpeed: 1.0,
		drift: 0.8,
		tumble: false,
	},
	[Season.Sommar]: {
		label: "pollen",
		colors: [0xffd700, 0xdaa520, 0xf0e68c],
		count: 100,
		size: 0.06,
		opacity: 0.25,
		fallSpeed: 0.3,
		drift: 0.4,
		tumble: false,
	},
	[Season.Host]: {
		label: "leaves",
		colors: [0xdaa520, 0xcd853f, 0xb8860b, 0xd2691e, 0xa0522d],
		count: 150,
		size: 0.25,
		opacity: 0.7,
		fallSpeed: 1.5,
		drift: 1.2,
		tumble: true,
	},
	[Season.Vinter]: {
		label: "snow",
		colors: [0xffffff, 0xf0f8ff, 0xe8e8e8],
		count: 350,
		size: 0.1,
		opacity: 0.8,
		fallSpeed: 1.2,
		drift: 0.6,
		tumble: false,
	},
};

// ─── Public API ───

/** Get the particle visual config for a given season. */
export function getSeasonParticles(season: SeasonId): SeasonParticleConfig {
	return CONFIGS[season];
}
