// ─── Wavefront Propagation Engine ───
// Flood-fill signal propagation through a material field.
// Tick-based, budget-limited, conductivity-attenuated.
// No ECS, no Three.js — pure simulation engine.

import type { MaterialIdValue } from "./material.ts";
import { getConductivity } from "./material.ts";

// ─── Constants ───

/** Maximum propagation depth from any emitter (steps). */
export const MAX_DEPTH = 16;

/** Maximum material samples per tick (mobile budget). */
export const MAX_SAMPLES_PER_TICK = 128;

/** Default emitter strength. */
export const DEFAULT_STRENGTH = 10;

/** Tick interval in ms. */
export const TICK_INTERVAL_MS = 250;

// ─── Types ───

/** Callback to sample the material at a grid position. */
export type GetMaterial = (x: number, y: number, z: number) => MaterialIdValue;

/** A point emitting signal into the material field. */
export interface WavefrontEmitter {
	x: number;
	y: number;
	z: number;
	strength: number;
}

/** Per-cell signal state after propagation. */
export interface CellSignal {
	/** Signal strength at this cell [0, max_strength]. */
	strength: number;
	/** Depth from nearest emitter (for visualization). */
	depth: number;
	/** Which emitter indices contributed to this cell. */
	sources: Set<number>;
}

/** Result of a single wavefront propagation tick. */
export type SignalField = Map<string, CellSignal>;

// ─── Helpers ───

function cellKey(x: number, y: number, z: number): string {
	return `${x},${y},${z}`;
}

/** 6-connected neighbor offsets. */
const NEIGHBORS: ReadonlyArray<readonly [number, number, number]> = [
	[1, 0, 0],
	[-1, 0, 0],
	[0, 1, 0],
	[0, -1, 0],
	[0, 0, 1],
	[0, 0, -1],
];

// ─── BFS Queue Entry ───

interface QueueEntry {
	x: number;
	y: number;
	z: number;
	strength: number;
	depth: number;
	sourceIdx: number;
}

// ─── Main Propagation ───

/**
 * Propagate wavefronts from emitters through a material field.
 * One tick of expansion: each emitter's signal floods through
 * connected conducting material, attenuated by conductivity.
 *
 * @param emitters - Points emitting signal.
 * @param getMaterial - Material sampler for the grid.
 * @param maxSamples - Budget cap (default MAX_SAMPLES_PER_TICK).
 * @returns Signal field mapping cell keys to signal state.
 */
export function propagateWavefront(
	emitters: ReadonlyArray<WavefrontEmitter>,
	getMaterial: GetMaterial,
	maxSamples = MAX_SAMPLES_PER_TICK,
): SignalField {
	const field: SignalField = new Map();
	const visited = new Set<string>();
	const queue: QueueEntry[] = [];
	let samples = 0;

	// Seed queue from each emitter
	for (let i = 0; i < emitters.length; i++) {
		const em = emitters[i];
		const key = cellKey(em.x, em.y, em.z);
		// Record emitter cell itself
		field.set(key, {
			strength: em.strength,
			depth: 0,
			sources: new Set([i]),
		});
		visited.add(key);

		// Enqueue neighbors
		for (const [dx, dy, dz] of NEIGHBORS) {
			queue.push({
				x: em.x + dx,
				y: em.y + dy,
				z: em.z + dz,
				strength: em.strength,
				depth: 1,
				sourceIdx: i,
			});
		}
	}

	// BFS with budget
	while (queue.length > 0 && samples < maxSamples) {
		const cur = queue.shift();
		if (!cur) break;

		if (cur.depth > MAX_DEPTH) continue;

		const key = cellKey(cur.x, cur.y, cur.z);

		// Sample material
		const mat = getMaterial(cur.x, cur.y, cur.z);
		const cond = getConductivity(mat);
		samples++;

		// Insulator: signal stops
		if (cond === 0) continue;

		// Attenuate: strength loses 1 per step, modified by conductivity
		const attenuated = cur.strength - 1 / cond;
		if (attenuated <= 0) continue;

		// Update or merge cell signal
		const existing = field.get(key);
		if (existing) {
			// Take the stronger signal, merge sources
			if (attenuated > existing.strength) {
				existing.strength = attenuated;
				existing.depth = cur.depth;
			}
			existing.sources.add(cur.sourceIdx);
			// Don't re-expand if already visited with stronger signal
			if (visited.has(key)) continue;
		} else {
			field.set(key, {
				strength: attenuated,
				depth: cur.depth,
				sources: new Set([cur.sourceIdx]),
			});
		}

		visited.add(key);

		// Stop expanding if too weak for next step
		if (attenuated <= 1) continue;

		// Enqueue neighbors
		for (const [dx, dy, dz] of NEIGHBORS) {
			const nk = cellKey(cur.x + dx, cur.y + dy, cur.z + dz);
			if (!visited.has(nk)) {
				queue.push({
					x: cur.x + dx,
					y: cur.y + dy,
					z: cur.z + dz,
					strength: attenuated,
					depth: cur.depth + 1,
					sourceIdx: cur.sourceIdx,
				});
			}
		}
	}

	return field;
}

/** Get signal strength at a cell, or 0 if no signal. */
export function getSignalAt(field: SignalField, x: number, y: number, z: number): number {
	return field.get(cellKey(x, y, z))?.strength ?? 0;
}

/** Count distinct source emitters at a cell. */
export function getSourceCount(field: SignalField, x: number, y: number, z: number): number {
	return field.get(cellKey(x, y, z))?.sources.size ?? 0;
}
