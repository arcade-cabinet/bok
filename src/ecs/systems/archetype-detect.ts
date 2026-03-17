// ─── Archetype Detection ───
// Pure math: detects functional archetypes from rune/signal/structure state.
// No ECS, no Three.js — just distance checks and threshold comparisons.
// Farm/Gate detectors and shared helpers live in archetype-helpers.ts.

import { computeWardRadius } from "./algiz-ward.ts";
import {
	ArchetypeId,
	BEACON_MIN_LIGHT_TOTAL,
	type DetectedArchetype,
	HEARTH_MIN_HEAT,
	TRAP_LINK_DISTANCE,
	TRAP_MIN_SIGNAL,
	WARD_MIN_RADIUS,
	WORKSHOP_JERA_DISTANCE,
} from "./archetype-data.ts";
import {
	detectFarm,
	detectGate,
	distSq,
	getMaxSignal,
	getSignalOfType,
	posKey,
	type RuneBlock,
	type SignalMap,
	toChunk,
} from "./archetype-helpers.ts";
import { RuneId } from "./rune-data.ts";
import { SignalType } from "./signal-data.ts";

// Re-export for public API
export { detectFarm, detectGate, groupByChunk, type RuneBlock, type SignalMap } from "./archetype-helpers.ts";

// ─── Per-Archetype Detectors ───

/** Hearth: Kenaz with heat signal inside an enclosed space. */
export function detectHearth(
	runes: ReadonlyArray<RuneBlock>,
	signalMap: SignalMap,
	enclosedPositions: ReadonlySet<string>,
): DetectedArchetype[] {
	const results: DetectedArchetype[] = [];
	for (const r of runes) {
		if (r.runeId !== RuneId.Kenaz) continue;
		const heat = getSignalOfType(r.x, r.y, r.z, SignalType.Heat, signalMap);
		if (heat < HEARTH_MIN_HEAT) continue;
		if (!enclosedPositions.has(posKey(r.x, r.y, r.z))) continue;
		const { cx, cz } = toChunk(r.x, r.z);
		results.push({ type: ArchetypeId.Hearth, cx, cz, x: r.x, y: r.y, z: r.z });
	}
	return results;
}

/** Workshop: Kenaz heat + Jera transform within WORKSHOP_JERA_DISTANCE. */
export function detectWorkshop(runes: ReadonlyArray<RuneBlock>, signalMap: SignalMap): DetectedArchetype[] {
	const kenazBlocks = runes.filter((r) => r.runeId === RuneId.Kenaz);
	const jeraBlocks = runes.filter((r) => r.runeId === RuneId.Jera);
	const results: DetectedArchetype[] = [];
	const maxDistSq = WORKSHOP_JERA_DISTANCE ** 2;

	for (const k of kenazBlocks) {
		const heat = getSignalOfType(k.x, k.y, k.z, SignalType.Heat, signalMap);
		if (heat < HEARTH_MIN_HEAT) continue;
		for (const j of jeraBlocks) {
			if (distSq(k.x, k.y, k.z, j.x, j.y, j.z) <= maxDistSq) {
				const { cx, cz } = toChunk(k.x, k.z);
				results.push({ type: ArchetypeId.Workshop, cx, cz, x: k.x, y: k.y, z: k.z });
				break; // one workshop per Kenaz
			}
		}
	}
	return results;
}

/** Beacon: total Sowilo light output in a chunk exceeds threshold. */
export function detectBeacon(runes: ReadonlyArray<RuneBlock>, signalMap: SignalMap): DetectedArchetype[] {
	const chunkTotals = new Map<string, { total: number; x: number; y: number; z: number }>();

	for (const r of runes) {
		if (r.runeId !== RuneId.Sowilo) continue;
		const light = getSignalOfType(r.x, r.y, r.z, SignalType.Light, signalMap);
		const { cx, cz } = toChunk(r.x, r.z);
		const ck = `${cx},${cz}`;
		const entry = chunkTotals.get(ck);
		if (entry) {
			entry.total += light;
		} else {
			chunkTotals.set(ck, { total: light, x: r.x, y: r.y, z: r.z });
		}
	}

	const results: DetectedArchetype[] = [];
	for (const [ck, entry] of chunkTotals) {
		if (entry.total >= BEACON_MIN_LIGHT_TOTAL) {
			const [cxStr, czStr] = ck.split(",");
			results.push({
				type: ArchetypeId.Beacon,
				cx: Number(cxStr),
				cz: Number(czStr),
				x: entry.x,
				y: entry.y,
				z: entry.z,
			});
		}
	}
	return results;
}

/** Ward: Algiz with computed ward radius > WARD_MIN_RADIUS. */
export function detectWard(runes: ReadonlyArray<RuneBlock>, signalMap: SignalMap): DetectedArchetype[] {
	const results: DetectedArchetype[] = [];
	for (const r of runes) {
		if (r.runeId !== RuneId.Algiz) continue;
		const strength = getMaxSignal(r.x, r.y, r.z, signalMap);
		if (computeWardRadius(strength) <= WARD_MIN_RADIUS) continue;
		const { cx, cz } = toChunk(r.x, r.z);
		results.push({ type: ArchetypeId.Ward, cx, cz, x: r.x, y: r.y, z: r.z });
	}
	return results;
}

/** Trap: Ansuz sensor + Thurisaz damage within link distance, both with signal. */
export function detectTrap(runes: ReadonlyArray<RuneBlock>, signalMap: SignalMap): DetectedArchetype[] {
	const ansuzBlocks = runes.filter((r) => r.runeId === RuneId.Ansuz);
	const thurisazBlocks = runes.filter((r) => r.runeId === RuneId.Thurisaz);
	const results: DetectedArchetype[] = [];
	const maxDistSq = TRAP_LINK_DISTANCE ** 2;

	for (const a of ansuzBlocks) {
		for (const t of thurisazBlocks) {
			if (distSq(a.x, a.y, a.z, t.x, t.y, t.z) > maxDistSq) continue;
			const tSignal = getMaxSignal(t.x, t.y, t.z, signalMap);
			if (tSignal < TRAP_MIN_SIGNAL) continue;
			const { cx, cz } = toChunk(a.x, a.z);
			results.push({ type: ArchetypeId.Trap, cx, cz, x: a.x, y: a.y, z: a.z });
			break; // one trap per Ansuz
		}
	}
	return results;
}

// ─── Combined Detection ───

/** Run all archetype detectors and return merged results. */
export function detectAllArchetypes(
	runes: ReadonlyArray<RuneBlock>,
	signalMap: SignalMap,
	enclosedPositions: ReadonlySet<string>,
	getVoxel: (x: number, y: number, z: number) => number,
): DetectedArchetype[] {
	return [
		...detectHearth(runes, signalMap, enclosedPositions),
		...detectWorkshop(runes, signalMap),
		...detectBeacon(runes, signalMap),
		...detectWard(runes, signalMap),
		...detectTrap(runes, signalMap),
		...detectFarm(runes, getVoxel),
		...detectGate(runes),
	];
}
