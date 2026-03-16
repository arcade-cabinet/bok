/**
 * Procedural animation runtime.
 * Sine wave oscillators for breathing/idle, per-species animation configs,
 * and state-driven blending for smooth animation transitions.
 * Pure math — no Three.js dependency.
 */

import type { AnimStateId, SpeciesId } from "../ecs/traits/index.ts";

// ─── Sine Oscillators ───

/**
 * Sine wave oscillation.
 * @param time - Elapsed time
 * @param frequency - Oscillation speed (Hz-like)
 * @param amplitude - Maximum displacement
 * @param phase - Phase offset (radians)
 */
export function oscillate(time: number, frequency: number, amplitude: number, phase = 0): number {
	return Math.sin(time * frequency + phase) * amplitude;
}

// ─── Per-Species Animation Config ───

export interface AnimConfig {
	breathAmp: number;
	breathFreq: number;
	idleSwayAmp: number;
	idleSwayFreq: number;
	walkBobAmp: number;
	walkBobFreq: number;
	walkSwingAmp: number;
}

const DEFAULT_CONFIG: AnimConfig = {
	breathAmp: 0.03,
	breathFreq: 1.5,
	idleSwayAmp: 0.1,
	idleSwayFreq: 0.5,
	walkBobAmp: 0.06,
	walkBobFreq: 3.0,
	walkSwingAmp: 0.4,
};

const SPECIES_CONFIGS: Partial<Record<SpeciesId, AnimConfig>> = {
	morker: {
		breathAmp: 0.04,
		breathFreq: 1.2,
		idleSwayAmp: 0.15,
		idleSwayFreq: 0.7,
		walkBobAmp: 0.08,
		walkBobFreq: 2.5,
		walkSwingAmp: 0.6,
	},
	trana: {
		breathAmp: 0.02,
		breathFreq: 1.0,
		idleSwayAmp: 0.08,
		idleSwayFreq: 0.4,
		walkBobAmp: 0.04,
		walkBobFreq: 2.0,
		walkSwingAmp: 0.3,
	},
	lindorm: {
		breathAmp: 0.05,
		breathFreq: 0.8,
		idleSwayAmp: 0.2,
		idleSwayFreq: 0.3,
		walkBobAmp: 0.1,
		walkBobFreq: 1.5,
		walkSwingAmp: 0.0, // segments use follow-the-leader instead
	},
};

/** Look up animation config for a species. Falls back to default. */
export function getAnimConfig(species: SpeciesId): AnimConfig {
	return SPECIES_CONFIGS[species] ?? DEFAULT_CONFIG;
}

// ─── State Blending ───

/** Blendable animation parameters per state. */
export interface AnimParams {
	bodyBob: number;
	headSway: number;
	armSwing: number;
	moveSpeed: number;
}

/** Animation parameter targets per state. */
const STATE_PARAMS: Record<AnimStateId, AnimParams> = {
	idle: { bodyBob: 1.0, headSway: 1.0, armSwing: 0.3, moveSpeed: 0 },
	walk: { bodyBob: 1.5, headSway: 0.5, armSwing: 1.0, moveSpeed: 0.5 },
	chase: { bodyBob: 2.0, headSway: 0.2, armSwing: 1.5, moveSpeed: 1.0 },
	attack: { bodyBob: 0.5, headSway: 0.1, armSwing: 2.0, moveSpeed: 0 },
	flee: { bodyBob: 2.5, headSway: 0.3, armSwing: 1.8, moveSpeed: 1.2 },
	burn: { bodyBob: 3.0, headSway: 0.5, armSwing: 2.5, moveSpeed: 0.3 },
};

/** Get the target animation parameters for a given state. */
export function getStateParams(state: AnimStateId): AnimParams {
	return STATE_PARAMS[state];
}

/**
 * Linearly interpolate between two animation parameter sets.
 * @param from - Parameters for the previous state
 * @param to - Parameters for the target state
 * @param t - Blend factor [0,1] (clamped)
 */
export function blendAnimParams(from: AnimParams, to: AnimParams, t: number): AnimParams {
	const ct = clamp01(t);
	return {
		bodyBob: lerp(from.bodyBob, to.bodyBob, ct),
		headSway: lerp(from.headSway, to.headSway, ct),
		armSwing: lerp(from.armSwing, to.armSwing, ct),
		moveSpeed: lerp(from.moveSpeed, to.moveSpeed, ct),
	};
}

/**
 * Advance blend progress toward 1.0 at the given transition speed.
 * @param progress - Current blend progress [0,1]
 * @param dt - Time step in seconds
 * @param speed - Transition speed (1/seconds to complete, default 4.0)
 */
export function advanceBlend(progress: number, dt: number, speed = 4.0): number {
	return Math.min(1.0, progress + dt * speed);
}

// ─── Utilities ───

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function clamp01(v: number): number {
	return Math.max(0, Math.min(1, v));
}
