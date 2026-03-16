// ─── Signal Propagation Engine ───
// BFS-based signal propagation through conducting blocks.
// Face-direction aware with signal combining and budget limits.
// No ECS, no Three.js — pure math engine.

import type { FaceIndex } from "./rune-data.ts";
import {
	AXIS_PAIRS,
	FACE_OFFSETS,
	getBlockConductivity,
	MAX_BLOCKS_PER_TICK,
	MAX_EMITTERS,
	MAX_PROPAGATION_DEPTH,
	MAX_SIGNAL_STRENGTH,
	oppositeFace,
	type SignalTypeId,
} from "./signal-data.ts";

// ─── Types ───

/** A block face that emits a signal into the world. */
export interface SignalEmitter {
	x: number;
	y: number;
	z: number;
	/** Which face of the emitter block the signal exits through. */
	face: FaceIndex;
	signalType: SignalTypeId;
	/** Initial signal strength (1–15). */
	strength: number;
}

/**
 * Optional rune transform callback. Called when signal enters a block face
 * that has a rune inscribed. Return modified signal, or null to block it.
 */
export type RuneTransform = (
	x: number,
	y: number,
	z: number,
	face: FaceIndex,
	signal: { type: SignalTypeId; strength: number },
) => { type: SignalTypeId; strength: number } | null;

/** Per-block accumulated signal data (internal). */
interface BlockAccum {
	/** signalType → entryFace → accumulated strength */
	incoming: Map<SignalTypeId, Map<FaceIndex, number>>;
}

/** Public output: per-block per-type effective signal strength. */
export type SignalMap = Map<string, Map<SignalTypeId, number>>;

// ─── BFS Queue Entry ───

interface QueueEntry {
	x: number;
	y: number;
	z: number;
	entryFace: FaceIndex;
	signalType: SignalTypeId;
	strength: number;
	depth: number;
}

// ─── Helpers ───

function posKey(x: number, y: number, z: number): string {
	return `${x},${y},${z}`;
}

function visitKey(x: number, y: number, z: number, type: SignalTypeId, face: FaceIndex): string {
	return `${x},${y},${z},${type},${face}`;
}

/** Accumulate incoming signal strength at a block face. Same-face ADD, capped at 15. */
function recordIncoming(
	accum: Map<string, BlockAccum>,
	x: number,
	y: number,
	z: number,
	signalType: SignalTypeId,
	entryFace: FaceIndex,
	strength: number,
): void {
	const pk = posKey(x, y, z);
	let block = accum.get(pk);
	if (!block) {
		block = { incoming: new Map() };
		accum.set(pk, block);
	}
	let faceMap = block.incoming.get(signalType);
	if (!faceMap) {
		faceMap = new Map();
		block.incoming.set(signalType, faceMap);
	}
	const current = faceMap.get(entryFace) ?? 0;
	faceMap.set(entryFace, Math.min(current + strength, MAX_SIGNAL_STRENGTH));
}

/**
 * Compute effective strength for a signal type from per-face incoming data.
 * Same-direction (same face) strengths are already ADDed during accumulation.
 * Opposing-direction (opposite faces on same axis) SUBTRACT.
 * Result is the max net strength across all axes.
 */
export function computeEffectiveStrength(faceMap: ReadonlyMap<FaceIndex, number>): number {
	let maxNet = 0;
	for (const [faceA, faceB] of AXIS_PAIRS) {
		const sa = faceMap.get(faceA) ?? 0;
		const sb = faceMap.get(faceB) ?? 0;
		const net = Math.abs(sa - sb);
		if (net > maxNet) maxNet = net;
	}
	return Math.min(maxNet, MAX_SIGNAL_STRENGTH);
}

// ─── Main Propagation ───

/**
 * Propagate signals from emitters through conducting blocks via BFS.
 *
 * @param emitters - Blocks with rune-inscribed faces that emit signals.
 * @param getBlock - Returns block ID at a world position.
 * @param runeTransform - Optional callback for rune-on-face signal transforms.
 * @returns Signal map: position key → signal type → effective strength.
 */
export function propagateSignals(
	emitters: ReadonlyArray<SignalEmitter>,
	getBlock: (x: number, y: number, z: number) => number,
	runeTransform?: RuneTransform,
): SignalMap {
	const accum = new Map<string, BlockAccum>();
	const queue: QueueEntry[] = [];
	const visited = new Set<string>();
	let blocksEvaluated = 0;

	// Seed BFS from each emitter (capped at MAX_EMITTERS)
	const cappedEmitters = emitters.length > MAX_EMITTERS ? emitters.slice(0, MAX_EMITTERS) : emitters;

	for (const em of cappedEmitters) {
		const [dx, dy, dz] = FACE_OFFSETS[em.face];
		const nx = em.x + dx;
		const ny = em.y + dy;
		const nz = em.z + dz;
		const entry = oppositeFace(em.face);

		queue.push({
			x: nx,
			y: ny,
			z: nz,
			entryFace: entry,
			signalType: em.signalType,
			strength: em.strength,
			depth: 1,
		});
	}

	// BFS with budget
	while (queue.length > 0 && blocksEvaluated < MAX_BLOCKS_PER_TICK) {
		const cur = queue.shift();
		if (!cur) break;

		// Check material conductivity (skip non-conductors entirely)
		const blockId = getBlock(cur.x, cur.y, cur.z);
		const conductivity = getBlockConductivity(blockId);
		if (conductivity === 0) continue;

		// Apply conductivity (crystal amplifies)
		let strength = Math.min(Math.round(cur.strength * conductivity), MAX_SIGNAL_STRENGTH);
		let signalType = cur.signalType;

		// Apply rune transform if callback provided
		if (runeTransform) {
			const result = runeTransform(cur.x, cur.y, cur.z, cur.entryFace, {
				type: signalType,
				strength,
			});
			if (result === null) continue; // rune blocks the signal
			signalType = result.type;
			strength = result.strength;
		}

		// Always record incoming signal (supports same-direction ADD)
		recordIncoming(accum, cur.x, cur.y, cur.z, signalType, cur.entryFace, strength);

		// Check visited for expansion — skip re-expansion but signal is already recorded
		const vk = visitKey(cur.x, cur.y, cur.z, signalType, cur.entryFace);
		if (visited.has(vk)) continue;
		visited.add(vk);
		blocksEvaluated++;

		// Stop expanding if at depth limit or signal too weak to propagate
		if (cur.depth >= MAX_PROPAGATION_DEPTH) continue;
		if (strength <= 1) continue; // after -1 attenuation, nothing left

		// Propagate to neighbors, skipping entry face (prevents echo)
		const exitStrength = strength - 1;
		for (let face = 0; face < 6; face++) {
			if (face === cur.entryFace) continue; // don't send signal back where it came from
			const [dx, dy, dz] = FACE_OFFSETS[face];
			queue.push({
				x: cur.x + dx,
				y: cur.y + dy,
				z: cur.z + dz,
				entryFace: oppositeFace(face as FaceIndex),
				signalType,
				strength: exitStrength,
				depth: cur.depth + 1,
			});
		}
	}

	// Phase 2: Compute effective strengths from per-face accumulation
	const result: SignalMap = new Map();
	for (const [pk, block] of accum) {
		const typeMap = new Map<SignalTypeId, number>();
		for (const [signalType, faceMap] of block.incoming) {
			const effective = computeEffectiveStrength(faceMap);
			if (effective > 0) {
				typeMap.set(signalType, effective);
			}
		}
		if (typeMap.size > 0) {
			result.set(pk, typeMap);
		}
	}

	return result;
}

/** Get signal strength at a block for a given type. Returns 0 if no signal. */
export function getSignalStrength(map: SignalMap, x: number, y: number, z: number, signalType: SignalTypeId): number {
	return map.get(posKey(x, y, z))?.get(signalType) ?? 0;
}
