// ─── Hagalaz AND Gate ───
// Pure math: passes signal only when inputs exist on two perpendicular axes.
// Checks adjacent blocks in the signal map for multi-axis signal presence.
// No ECS, no Three.js.

import { HAGALAZ_MIN_GATE_SIGNAL } from "./computational-rune-data.ts";
import { maxSignalAtBlock } from "./naudiz-not.ts";
import type { FaceIndex } from "./rune-data.ts";
import { FACE_OFFSETS, type SignalTypeId } from "./signal-data.ts";
import type { SignalEmitter, SignalMap } from "./signal-propagation.ts";

/**
 * Get the axis index for a face (0=X, 1=Y, 2=Z).
 * Faces 0,1 = X axis; 2,3 = Y axis; 4,5 = Z axis.
 */
export function faceAxis(face: FaceIndex): number {
	return Math.floor(face / 2);
}

/**
 * Get the perpendicular face indices for a given face.
 * Returns the 4 faces not on the same axis.
 */
export function perpendicularFaces(face: FaceIndex): FaceIndex[] {
	const axis = faceAxis(face);
	const result: FaceIndex[] = [];
	for (let f = 0; f < 6; f++) {
		if (Math.floor(f / 2) !== axis) result.push(f as FaceIndex);
	}
	return result;
}

/** Info about signal sources on adjacent blocks grouped by axis. */
export interface AxisSignalInfo {
	/** Number of distinct axes (0-3) that have signal on adjacent blocks. */
	axisCount: number;
	/** Strongest signal found across all adjacent blocks. */
	maxStrength: number;
	/** Signal type with the strongest presence. */
	strongestType: SignalTypeId;
}

/**
 * Analyze adjacent blocks for signal presence grouped by axis.
 * Returns how many distinct axes have signal and the max strength found.
 */
export function analyzeAdjacentSignals(x: number, y: number, z: number, signalMap: SignalMap): AxisSignalInfo {
	const axesWithSignal = new Set<number>();
	let maxStrength = 0;
	let strongestType: SignalTypeId = 0 as SignalTypeId;

	for (let face = 0; face < 6; face++) {
		const [dx, dy, dz] = FACE_OFFSETS[face];
		const nx = x + dx;
		const ny = y + dy;
		const nz = z + dz;
		const signals = signalMap.get(`${nx},${ny},${nz}`);
		if (!signals) continue;

		for (const [sigType, str] of signals) {
			if (str >= HAGALAZ_MIN_GATE_SIGNAL) {
				axesWithSignal.add(Math.floor(face / 2));
				if (str > maxStrength) {
					maxStrength = str;
					strongestType = sigType;
				}
			}
		}
	}

	return { axisCount: axesWithSignal.size, maxStrength, strongestType };
}

/**
 * Evaluate a Hagalaz rune block against the signal map.
 * Returns a SignalEmitter if the AND gate opens (signal on 2+ perpendicular axes),
 * or null if the gate is closed.
 *
 * The output strength is the effective signal at the block itself (not neighbors).
 * The output type is the strongest type found at adjacent blocks.
 */
export function evaluateHagalaz(
	x: number,
	y: number,
	z: number,
	face: FaceIndex,
	signalMap: SignalMap,
): SignalEmitter | null {
	const adj = analyzeAdjacentSignals(x, y, z, signalMap);
	if (adj.axisCount < 2) return null;

	// Gate opens — output the signal present at this block
	const selfStrength = maxSignalAtBlock(signalMap, x, y, z);
	const outputStrength = selfStrength > 0 ? selfStrength : adj.maxStrength;
	if (outputStrength <= 0) return null;

	return {
		x,
		y,
		z,
		face,
		signalType: adj.strongestType,
		strength: outputStrength,
	};
}
