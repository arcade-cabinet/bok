// ─── Settlement Archetype Detection ───
// Pure math: detects functional settlement patterns from rune circuits.
// Composes basic rune types + signal connectivity + nearby blocks into
// higher-level archetypes: Smedja, Kvarn, Vakttorn, Försvarsverk.
// No ECS, no Three.js — just distance checks and threshold comparisons.

import { BlockId } from "../../world/blocks.ts";
import { distSq, getMaxSignal, getSignalOfType, type RuneBlock, type SignalMap, toChunk } from "./archetype-helpers.ts";
import { RuneId } from "./rune-data.ts";
import {
	type DetectedSettlementArchetype,
	FORSVARSVERK_LINK_DISTANCE,
	FORSVARSVERK_MIN_SIGNAL,
	KVARN_LINK_DISTANCE,
	KVARN_MIN_SIGNAL,
	SettlementArchetypeId,
	type SettlementArchetypeKey,
	SMEDJA_FORGE_DISTANCE,
	SMEDJA_JERA_DISTANCE,
	SMEDJA_MIN_HEAT,
	VAKTTORN_LINK_DISTANCE,
	VAKTTORN_MIN_LIGHT,
	VAKTTORN_MIN_Y,
} from "./settlement-detector-data.ts";
import { SignalType } from "./signal-data.ts";

export type { DetectedSettlementArchetype, SettlementArchetypeKey };
export {
	FORSVARSVERK_LINK_DISTANCE,
	KVARN_LINK_DISTANCE,
	SettlementArchetypeId,
	SMEDJA_FORGE_DISTANCE,
	VAKTTORN_LINK_DISTANCE,
	VAKTTORN_MIN_Y,
};

// ─── Smedja (Smithy) ───

/** Smithy: Kenaz heat + Jera transform within range + Forge block nearby. */
export function detectSmedja(
	runes: ReadonlyArray<RuneBlock>,
	signalMap: SignalMap,
	getVoxel: (x: number, y: number, z: number) => number,
): DetectedSettlementArchetype[] {
	const kenazBlocks = runes.filter((r) => r.runeId === RuneId.Kenaz);
	const jeraBlocks = runes.filter((r) => r.runeId === RuneId.Jera);
	const results: DetectedSettlementArchetype[] = [];
	const maxDistSq = SMEDJA_JERA_DISTANCE ** 2;

	for (const k of kenazBlocks) {
		const heat = getSignalOfType(k.x, k.y, k.z, SignalType.Heat, signalMap);
		if (heat < SMEDJA_MIN_HEAT) continue;
		if (!hasBlockNearby(k.x, k.y, k.z, SMEDJA_FORGE_DISTANCE, getVoxel, BlockId.Forge)) continue;
		for (const j of jeraBlocks) {
			if (distSq(k.x, k.y, k.z, j.x, j.y, j.z) <= maxDistSq) {
				const { cx, cz } = toChunk(k.x, k.z);
				results.push({ type: SettlementArchetypeId.Smedja, cx, cz, x: k.x, y: k.y, z: k.z });
				break;
			}
		}
	}
	return results;
}

// ─── Kvarn (Mill) ───

/** Mill: Jera transform + Berkanan growth, both with active signal. */
export function detectKvarn(runes: ReadonlyArray<RuneBlock>, signalMap: SignalMap): DetectedSettlementArchetype[] {
	const jeraBlocks = runes.filter((r) => r.runeId === RuneId.Jera);
	const berkananBlocks = runes.filter((r) => r.runeId === RuneId.Berkanan);
	const results: DetectedSettlementArchetype[] = [];
	const maxDistSq = KVARN_LINK_DISTANCE ** 2;

	for (const j of jeraBlocks) {
		if (getMaxSignal(j.x, j.y, j.z, signalMap) < KVARN_MIN_SIGNAL) continue;
		for (const b of berkananBlocks) {
			if (distSq(j.x, j.y, j.z, b.x, b.y, b.z) > maxDistSq) continue;
			if (getMaxSignal(b.x, b.y, b.z, signalMap) < KVARN_MIN_SIGNAL) continue;
			const { cx, cz } = toChunk(j.x, j.z);
			results.push({ type: SettlementArchetypeId.Kvarn, cx, cz, x: j.x, y: j.y, z: j.z });
			break;
		}
	}
	return results;
}

// ─── Vakttorn (Watchtower) ───

/** Watchtower: Sowilo light + Ansuz sensor at elevated position. */
export function detectVakttorn(runes: ReadonlyArray<RuneBlock>, signalMap: SignalMap): DetectedSettlementArchetype[] {
	const sowiloBlocks = runes.filter((r) => r.runeId === RuneId.Sowilo);
	const ansuzBlocks = runes.filter((r) => r.runeId === RuneId.Ansuz);
	const results: DetectedSettlementArchetype[] = [];
	const maxDistSq = VAKTTORN_LINK_DISTANCE ** 2;

	for (const s of sowiloBlocks) {
		if (s.y < VAKTTORN_MIN_Y) continue;
		const light = getSignalOfType(s.x, s.y, s.z, SignalType.Light, signalMap);
		if (light < VAKTTORN_MIN_LIGHT) continue;
		for (const a of ansuzBlocks) {
			if (distSq(s.x, s.y, s.z, a.x, a.y, a.z) <= maxDistSq) {
				const { cx, cz } = toChunk(s.x, s.z);
				results.push({ type: SettlementArchetypeId.Vakttorn, cx, cz, x: s.x, y: s.y, z: s.z });
				break;
			}
		}
	}
	return results;
}

// ─── Försvarsverk (Fortification) ───

/** Fortification: Algiz ward + Thurisaz damage + Ansuz detection, all with signal. */
export function detectForsvarsverk(
	runes: ReadonlyArray<RuneBlock>,
	signalMap: SignalMap,
): DetectedSettlementArchetype[] {
	const algizBlocks = runes.filter((r) => r.runeId === RuneId.Algiz);
	const thurisazBlocks = runes.filter((r) => r.runeId === RuneId.Thurisaz);
	const ansuzBlocks = runes.filter((r) => r.runeId === RuneId.Ansuz);
	const results: DetectedSettlementArchetype[] = [];
	const maxDistSq = FORSVARSVERK_LINK_DISTANCE ** 2;

	for (const a of algizBlocks) {
		if (getMaxSignal(a.x, a.y, a.z, signalMap) < FORSVARSVERK_MIN_SIGNAL) continue;
		const hasThur = thurisazBlocks.some(
			(t) =>
				distSq(a.x, a.y, a.z, t.x, t.y, t.z) <= maxDistSq &&
				getMaxSignal(t.x, t.y, t.z, signalMap) >= FORSVARSVERK_MIN_SIGNAL,
		);
		if (!hasThur) continue;
		const hasAns = ansuzBlocks.some(
			(n) =>
				distSq(a.x, a.y, a.z, n.x, n.y, n.z) <= maxDistSq &&
				getMaxSignal(n.x, n.y, n.z, signalMap) >= FORSVARSVERK_MIN_SIGNAL,
		);
		if (!hasAns) continue;
		const { cx, cz } = toChunk(a.x, a.z);
		results.push({ type: SettlementArchetypeId.Forsvarsverk, cx, cz, x: a.x, y: a.y, z: a.z });
	}
	return results;
}

// ─── Combined Detection ───

/** Run all settlement archetype detectors and return merged results. */
export function detectAllSettlementArchetypes(
	runes: ReadonlyArray<RuneBlock>,
	signalMap: SignalMap,
	getVoxel: (x: number, y: number, z: number) => number,
): DetectedSettlementArchetype[] {
	return [
		...detectSmedja(runes, signalMap, getVoxel),
		...detectKvarn(runes, signalMap),
		...detectVakttorn(runes, signalMap),
		...detectForsvarsverk(runes, signalMap),
	];
}

// ─── Block Scan Helper ───

function hasBlockNearby(
	cx: number,
	cy: number,
	cz: number,
	radius: number,
	getVoxel: (x: number, y: number, z: number) => number,
	blockId: number,
): boolean {
	for (let dx = -radius; dx <= radius; dx++) {
		for (let dz = -radius; dz <= radius; dz++) {
			for (let dy = -radius; dy <= radius; dy++) {
				if (getVoxel(cx + dx, cy + dy, cz + dz) === blockId) return true;
			}
		}
	}
	return false;
}
