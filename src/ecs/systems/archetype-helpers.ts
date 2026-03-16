// ─── Archetype Detection Helpers ───
// Pure math: shared utilities for archetype detection and secondary detectors
// (Farm, Gate). No ECS, no Three.js.

import { BlockId } from "../../world/blocks.ts";
import {
	ArchetypeId,
	type ArchetypeKey,
	CHUNK_SIZE,
	type DetectedArchetype,
	FARM_CROP_DISTANCE,
	GATE_MIN_ISA_COUNT,
	GATE_PAIR_DISTANCE,
} from "./archetype-data.ts";
import { RuneId } from "./rune-data.ts";
import type { SignalTypeId } from "./signal-data.ts";

/** Input rune entry for archetype detection. */
export interface RuneBlock {
	x: number;
	y: number;
	z: number;
	runeId: number;
}

/** Signal map type alias (position key → signal type → strength). */
export type SignalMap = ReadonlyMap<string, ReadonlyMap<SignalTypeId, number>>;

export function posKey(x: number, y: number, z: number): string {
	return `${x},${y},${z}`;
}

export function distSq(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
	return (ax - bx) ** 2 + (ay - by) ** 2 + (az - bz) ** 2;
}

export function toChunk(x: number, z: number): { cx: number; cz: number } {
	return { cx: Math.floor(x / CHUNK_SIZE), cz: Math.floor(z / CHUNK_SIZE) };
}

export function getMaxSignal(x: number, y: number, z: number, signalMap: SignalMap): number {
	const signals = signalMap.get(posKey(x, y, z));
	if (!signals) return 0;
	let max = 0;
	for (const s of signals.values()) if (s > max) max = s;
	return max;
}

export function getSignalOfType(x: number, y: number, z: number, type: SignalTypeId, signalMap: SignalMap): number {
	return signalMap.get(posKey(x, y, z))?.get(type) ?? 0;
}

// ─── Farm Detector ───

/** Farm: Berkanan growth rune with crop/sapling blocks nearby. */
export function detectFarm(
	runes: ReadonlyArray<RuneBlock>,
	getVoxel: (x: number, y: number, z: number) => number,
): DetectedArchetype[] {
	const cropBlocks = new Set([BlockId.Mushroom, BlockId.Cranberry, BlockId.Wildflower]);
	const results: DetectedArchetype[] = [];

	for (const r of runes) {
		if (r.runeId !== RuneId.Berkanan) continue;
		if (hasCropNearby(r.x, r.y, r.z, FARM_CROP_DISTANCE, getVoxel, cropBlocks)) {
			const { cx, cz } = toChunk(r.x, r.z);
			results.push({ type: ArchetypeId.Farm, cx, cz, x: r.x, y: r.y, z: r.z });
		}
	}
	return results;
}

function hasCropNearby(
	cx: number,
	cy: number,
	cz: number,
	radius: number,
	getVoxel: (x: number, y: number, z: number) => number,
	cropBlocks: ReadonlySet<number>,
): boolean {
	for (let dx = -radius; dx <= radius; dx++) {
		for (let dz = -radius; dz <= radius; dz++) {
			for (let dy = -radius; dy <= radius; dy++) {
				if (cropBlocks.has(getVoxel(cx + dx, cy + dy, cz + dz))) return true;
			}
		}
	}
	return false;
}

// ─── Gate Detector ───

/** Gate: two or more Isa runes within pairing distance. */
export function detectGate(runes: ReadonlyArray<RuneBlock>): DetectedArchetype[] {
	const isaBlocks = runes.filter((r) => r.runeId === RuneId.Isa);
	if (isaBlocks.length < GATE_MIN_ISA_COUNT) return [];

	const maxDistSq = GATE_PAIR_DISTANCE ** 2;
	const results: DetectedArchetype[] = [];

	for (let i = 0; i < isaBlocks.length; i++) {
		for (let j = i + 1; j < isaBlocks.length; j++) {
			const a = isaBlocks[i];
			const b = isaBlocks[j];
			if (distSq(a.x, a.y, a.z, b.x, b.y, b.z) <= maxDistSq) {
				const { cx, cz } = toChunk(a.x, a.z);
				results.push({ type: ArchetypeId.Gate, cx, cz, x: a.x, y: a.y, z: a.z });
				return results; // one gate per scan
			}
		}
	}
	return results;
}

// ─── Group By Chunk ───

/** Group archetypes by chunk and return sets per chunk key. */
export function groupByChunk(archetypes: ReadonlyArray<DetectedArchetype>): Map<string, Set<ArchetypeKey>> {
	const groups = new Map<string, Set<ArchetypeKey>>();
	for (const a of archetypes) {
		const ck = `${a.cx},${a.cz}`;
		let set = groups.get(ck);
		if (!set) {
			set = new Set();
			groups.set(ck, set);
		}
		set.add(a.type);
	}
	return groups;
}
