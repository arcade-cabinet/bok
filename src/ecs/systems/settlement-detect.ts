// ─── Settlement Detection ───
// Pure math: recognizes settlements from colocated archetypes within a chunk.
// No ECS, no Three.js — just set operations and threshold checks.

import type { ArchetypeKey, DetectedArchetype } from "./archetype-data.ts";
import { groupByChunk } from "./archetype-detect.ts";
import {
	chunkNameSeed,
	computeSettlementLevel,
	generateSettlementName,
	SettlementLevel,
	type SettlementLevelId,
} from "./settlement-data.ts";

/** A recognized settlement in the world. */
export interface Settlement {
	/** Chunk coordinates. */
	cx: number;
	cz: number;
	/** Procedurally generated Swedish place name. */
	name: string;
	/** Current settlement level based on archetype count. */
	level: SettlementLevelId;
	/** Set of archetype types present in this settlement. */
	archetypes: ReadonlySet<ArchetypeKey>;
}

/**
 * Detect settlements from a list of detected archetypes.
 * Groups by chunk, checks founding requirement, generates names.
 */
export function detectSettlements(archetypes: ReadonlyArray<DetectedArchetype>): Settlement[] {
	const chunkGroups = groupByChunk(archetypes);
	const settlements: Settlement[] = [];

	for (const [ck, types] of chunkGroups) {
		const level = computeSettlementLevel(types);
		if (level === SettlementLevel.None) continue;

		const [cxStr, czStr] = ck.split(",");
		const cx = Number(cxStr);
		const cz = Number(czStr);
		const seed = chunkNameSeed(cx, cz);
		const name = generateSettlementName(seed);
		settlements.push({ cx, cz, name, level, archetypes: types });
	}

	return settlements;
}

/**
 * Compare old and new settlement lists to detect founding events and level changes.
 * Returns new settlements and settlements that grew to a higher level.
 */
export function diffSettlements(
	prev: ReadonlyArray<Settlement>,
	next: ReadonlyArray<Settlement>,
): { founded: Settlement[]; grew: Settlement[] } {
	const prevMap = new Map<string, Settlement>();
	for (const s of prev) prevMap.set(`${s.cx},${s.cz}`, s);

	const founded: Settlement[] = [];
	const grew: Settlement[] = [];

	for (const s of next) {
		const ck = `${s.cx},${s.cz}`;
		const old = prevMap.get(ck);
		if (!old) {
			founded.push(s);
		} else if (s.level > old.level) {
			grew.push(s);
		}
	}

	return { founded, grew };
}
