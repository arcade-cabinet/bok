// ─── Naudiz NOT Gate ───
// Pure math: signal inversion logic.
// Outputs signal when receiving none, silent when powered.
// No ECS, no Three.js.

import { NAUDIZ_OUTPUT_STRENGTH } from "./computational-rune-data.ts";
import type { FaceIndex } from "./rune-data.ts";
import type { SignalTypeId } from "./signal-data.ts";
import { SignalType } from "./signal-data.ts";
import type { SignalEmitter, SignalMap } from "./signal-propagation.ts";

/**
 * Compute Naudiz NOT gate output.
 * Returns NAUDIZ_OUTPUT_STRENGTH if input is 0, otherwise 0.
 */
export function computeNaudizOutput(inputStrength: number): number {
	return inputStrength > 0 ? 0 : NAUDIZ_OUTPUT_STRENGTH;
}

/**
 * Get the maximum signal strength of any type at a block position.
 * Returns 0 if no signal is present.
 */
export function maxSignalAtBlock(signalMap: SignalMap, x: number, y: number, z: number): number {
	const signals = signalMap.get(`${x},${y},${z}`);
	if (!signals) return 0;
	let max = 0;
	for (const s of signals.values()) {
		if (s > max) max = s;
	}
	return max;
}

/**
 * Evaluate a Naudiz rune block against the signal map.
 * Returns a SignalEmitter if the gate should output, or null if silent.
 * Naudiz emits Force-type signal since it's a logic gate, not a sensor/heater.
 */
export function evaluateNaudiz(
	x: number,
	y: number,
	z: number,
	face: FaceIndex,
	signalMap: SignalMap,
): SignalEmitter | null {
	const input = maxSignalAtBlock(signalMap, x, y, z);
	const output = computeNaudizOutput(input);
	if (output <= 0) return null;
	return { x, y, z, face, signalType: SignalType.Force as SignalTypeId, strength: output };
}
