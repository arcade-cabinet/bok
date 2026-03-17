// ─── Isa DELAY Gate ───
// Pure math with state: holds signal for N ticks before releasing.
// Default N=1 (250ms), crystal N=2 (500ms).
// No ECS, no Three.js.

import { ISA_CRYSTAL_DELAY, ISA_DEFAULT_DELAY } from "./computational-rune-data.ts";
import { maxSignalAtBlock } from "./naudiz-not.ts";
import type { FaceIndex } from "./rune-data.ts";
import type { SignalTypeId } from "./signal-data.ts";
import type { SignalEmitter, SignalMap } from "./signal-propagation.ts";

/** Stored signal snapshot for delay buffer. */
interface DelayedSignal {
	signalType: SignalTypeId;
	strength: number;
	/** Tick number when this signal was recorded. */
	tick: number;
}

/**
 * Delay buffer: maps position key → ring buffer of delayed signals.
 * Each entry stores the signal snapshot from a past tick.
 */
const delayBuffer = new Map<string, DelayedSignal[]>();

function posKey(x: number, y: number, z: number): string {
	return `${x},${y},${z}`;
}

/** Get the delay ticks for a block. Crystal blocks get ISA_CRYSTAL_DELAY. */
export function getIsaDelay(isCrystal: boolean): number {
	return isCrystal ? ISA_CRYSTAL_DELAY : ISA_DEFAULT_DELAY;
}

/**
 * Push a signal into the delay buffer for a given block position.
 * Call this once per propagation tick for each Isa rune block.
 */
export function pushIsaInput(
	x: number,
	y: number,
	z: number,
	signalType: SignalTypeId,
	strength: number,
	currentTick: number,
): void {
	const pk = posKey(x, y, z);
	let buffer = delayBuffer.get(pk);
	if (!buffer) {
		buffer = [];
		delayBuffer.set(pk, buffer);
	}
	buffer.push({ signalType, strength, tick: currentTick });
}

/**
 * Pop the delayed signal output for a given block position.
 * Returns the signal that was pushed `delayTicks` ago, or null if nothing ready.
 */
export function popIsaOutput(
	x: number,
	y: number,
	z: number,
	delayTicks: number,
	currentTick: number,
): { signalType: SignalTypeId; strength: number } | null {
	const pk = posKey(x, y, z);
	const buffer = delayBuffer.get(pk);
	if (!buffer || buffer.length === 0) return null;

	// Find the oldest entry that's ready (recorded at least delayTicks ago)
	const readyTick = currentTick - delayTicks;
	let readyIdx = -1;
	for (let i = 0; i < buffer.length; i++) {
		if (buffer[i].tick <= readyTick) {
			readyIdx = i;
			break; // oldest first
		}
	}

	if (readyIdx === -1) return null;

	const entry = buffer[readyIdx];
	// Remove this entry and any older ones (keep only newer entries)
	buffer.splice(0, readyIdx + 1);
	if (buffer.length === 0) delayBuffer.delete(pk);

	return { signalType: entry.signalType, strength: entry.strength };
}

/**
 * Evaluate an Isa rune block: record current input and emit delayed output.
 * Returns a SignalEmitter if a delayed signal is ready, or null otherwise.
 */
export function evaluateIsa(
	x: number,
	y: number,
	z: number,
	face: FaceIndex,
	signalMap: SignalMap,
	isCrystal: boolean,
	currentTick: number,
): SignalEmitter | null {
	const delay = getIsaDelay(isCrystal);

	// Record current input into delay buffer
	const signals = signalMap.get(`${x},${y},${z}`);
	if (signals) {
		// Store the strongest signal of any type
		let maxType: SignalTypeId = 0 as SignalTypeId;
		let maxStr = 0;
		for (const [sigType, str] of signals) {
			if (str > maxStr) {
				maxStr = str;
				maxType = sigType;
			}
		}
		if (maxStr > 0) {
			pushIsaInput(x, y, z, maxType, maxStr, currentTick);
		}
	}

	// Check for delayed output
	const output = popIsaOutput(x, y, z, delay, currentTick);
	if (!output || output.strength <= 0) return null;

	return { x, y, z, face, signalType: output.signalType, strength: output.strength };
}

/**
 * Get the max signal at a block (convenience re-export for system).
 */
export function getIsaInputStrength(signalMap: SignalMap, x: number, y: number, z: number): number {
	return maxSignalAtBlock(signalMap, x, y, z);
}

/** Reset module state (call on game destroy). */
export function resetIsaState(): void {
	delayBuffer.clear();
}
