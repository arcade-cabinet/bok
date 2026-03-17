// ─── Signal Glow Renderer ───
// Maps signal field strength to per-face glow intensity.
// Emitter runes always glow. Signal-carrying faces pulse.
// Pure math — no Three.js, no ECS.

import type { RuneIdValue } from "../ecs/systems/rune-data.ts";
import { RuneId } from "../ecs/systems/rune-data.ts";

/** Max signal strength that maps to full glow. */
const MAX_SIGNAL = 10;

/** Pulse frequency in Hz for powered runes. */
const PULSE_FREQ = 1.5;

/** Runes that always emit (constant glow). */
const EMITTERS = new Set<number>([RuneId.Kenaz, RuneId.Sowilo, RuneId.Ansuz]);

/**
 * Convert signal strength [0, MAX_SIGNAL] to glow intensity [0, 1].
 * Clamped. Non-linear (sqrt) for perceptual brightness.
 */
export function computeGlowIntensity(signalStrength: number): number {
	if (signalStrength <= 0) return 0;
	const normalized = Math.min(signalStrength / MAX_SIGNAL, 1);
	return Math.sqrt(normalized);
}

/**
 * Compute a pulse phase [0, 1] for animated glow.
 * Uses a smooth sine wave at PULSE_FREQ.
 */
export function computePulsePhase(timeSeconds: number): number {
	return (Math.sin(timeSeconds * PULSE_FREQ * Math.PI * 2) + 1) * 0.5;
}

/**
 * Check if a rune is a constant emitter (always glows).
 */
export function isEmitterGlow(runeId: number): boolean {
	return EMITTERS.has(runeId);
}

/**
 * Compute final glow value for a rune face, incorporating pulse.
 * Emitters glow at constant 0.8. Powered runes pulse between 0.3 and full glow.
 */
export function computeFaceGlow(runeId: RuneIdValue, signalStrength: number, timeSeconds: number): number {
	if (runeId === 0) return 0;

	if (isEmitterGlow(runeId)) {
		return 0.8 + computePulsePhase(timeSeconds) * 0.2;
	}

	const baseGlow = computeGlowIntensity(signalStrength);
	if (baseGlow <= 0) return 0;

	const pulse = computePulsePhase(timeSeconds);
	return baseGlow * (0.3 + pulse * 0.7);
}
