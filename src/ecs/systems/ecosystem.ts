/**
 * Ecosystem interactions — creature-to-creature relationships.
 * Pure math module — no Three.js, no ECS imports. Consumed by creature.ts.
 *
 * Mörker hunt Lyktgubbar (darkness extinguishes ambient light).
 * Skogssniglar graze on grass → mycel transformation.
 * Tranor flee Mörker (early warning system for player).
 * Norrsken pacifies all creatures temporarily.
 */

import {
	type CreatureInfo,
	type EcosystemContext,
	type EcosystemResult,
	GRAZE_TRANSFORM_INTERVAL,
	type GrazeTransform,
	HUNT_EXTINGUISH_RANGE,
	type HuntTarget,
	MORKER_FLEE_RANGE,
	NORRSKEN_PACIFY_DURATION,
	type TranaFlee,
} from "./ecosystem-data.ts";

export type { CreatureInfo, EcosystemContext, EcosystemResult, GrazeTransform, HuntTarget, TranaFlee };
export { GRAZE_TRANSFORM_INTERVAL, HUNT_EXTINGUISH_RANGE, MORKER_FLEE_RANGE, NORRSKEN_PACIFY_DURATION };

// ─── Per-entity grazing timers ───

const grazeTimers = new Map<number, number>();

export function resetEcosystemState(): void {
	grazeTimers.clear();
	pacifyTimer = NORRSKEN_PACIFY_DURATION + 1;
}

// ─── Pacification state ───

/** Time since norrsken ended. Starts past threshold (no initial pacification). */
let pacifyTimer = NORRSKEN_PACIFY_DURATION + 1;

// ─── Pure Interaction Functions ───

/** Find Lyktgubbar within extinguish range of any Mörker. */
export function findMorkerHuntTargets(morker: CreatureInfo[], lyktgubbar: CreatureInfo[]): HuntTarget[] {
	const targets: HuntTarget[] = [];
	for (const m of morker) {
		let best: HuntTarget | null = null;
		for (const lg of lyktgubbar) {
			const dx = lg.x - m.x;
			const dz = lg.z - m.z;
			const dist = Math.sqrt(dx * dx + dz * dz);
			if (dist <= HUNT_EXTINGUISH_RANGE) {
				if (!best || dist < best.distance) {
					best = {
						morkerEntityId: m.entityId,
						lyktgubbeEntityId: lg.entityId,
						distance: dist,
					};
				}
			}
		}
		if (best) targets.push(best);
	}
	return targets;
}

/** Find snails whose blockBelow matches the grass block ID. */
export function findGrazingSnails(snails: CreatureInfo[], grassBlockId: number): CreatureInfo[] {
	return snails.filter((s) => s.blockBelow === grassBlockId);
}

/** Find Tranor that should flee from nearby Mörker. */
export function findTranaFleeTargets(trana: CreatureInfo[], morker: CreatureInfo[]): TranaFlee[] {
	const results: TranaFlee[] = [];
	for (const t of trana) {
		let nearest: TranaFlee | null = null;
		for (const m of morker) {
			const dx = m.x - t.x;
			const dz = m.z - t.z;
			const dist = Math.sqrt(dx * dx + dz * dz);
			if (dist <= MORKER_FLEE_RANGE) {
				if (!nearest || dist < nearest.distance) {
					nearest = {
						tranaEntityId: t.entityId,
						nearestMorkerEntityId: m.entityId,
						threatX: m.x,
						threatZ: m.z,
						distance: dist,
					};
				}
			}
		}
		if (nearest) results.push(nearest);
	}
	return results;
}

/** Check if Norrsken pacification is active (includes linger). */
export function isNorrskenPacified(norrskenActive: boolean, timeSinceEnd: number): boolean {
	if (norrskenActive) return true;
	return timeSinceEnd < NORRSKEN_PACIFY_DURATION;
}

// ─── Main Computation ───

/** Compute all ecosystem interactions for this frame. */
export function computeEcosystemInteractions(creatures: CreatureInfo[], ctx: EcosystemContext): EcosystemResult {
	// Update pacification timer
	if (ctx.norrskenActive) {
		pacifyTimer = 0;
	} else {
		pacifyTimer += ctx.dt;
	}

	const allPacified = isNorrskenPacified(ctx.norrskenActive, pacifyTimer);

	// During pacification, no predator-prey interactions
	if (allPacified) {
		return {
			huntTargets: [],
			grazingSnails: [],
			grazeTransforms: [],
			fleeingTrana: [],
			allPacified: true,
		};
	}

	// Partition creatures by species
	const morker: CreatureInfo[] = [];
	const lyktgubbar: CreatureInfo[] = [];
	const snails: CreatureInfo[] = [];
	const trana: CreatureInfo[] = [];

	for (const c of creatures) {
		switch (c.species) {
			case "morker":
				morker.push(c);
				break;
			case "lyktgubbe":
				lyktgubbar.push(c);
				break;
			case "skogssnigle":
				snails.push(c);
				break;
			case "trana":
				trana.push(c);
				break;
		}
	}

	const huntTargets = findMorkerHuntTargets(morker, lyktgubbar);
	const grazingSnails = findGrazingSnails(snails, ctx.grassBlockId);
	const fleeingTrana = findTranaFleeTargets(trana, morker);

	// Track grazing timers for mycel transformation
	const grazeTransforms: GrazeTransform[] = [];
	const activeGrazers = new Set<number>();
	for (const s of grazingSnails) {
		activeGrazers.add(s.entityId);
		const timer = (grazeTimers.get(s.entityId) ?? 0) + ctx.dt;
		if (timer >= GRAZE_TRANSFORM_INTERVAL) {
			grazeTransforms.push({
				entityId: s.entityId,
				x: Math.floor(s.x),
				y: Math.floor(s.y - 1),
				z: Math.floor(s.z),
			});
			grazeTimers.set(s.entityId, 0);
		} else {
			grazeTimers.set(s.entityId, timer);
		}
	}

	// Clean up timers for snails no longer grazing
	for (const [id] of grazeTimers) {
		if (!activeGrazers.has(id)) grazeTimers.delete(id);
	}

	return {
		huntTargets,
		grazingSnails,
		grazeTransforms,
		fleeingTrana,
		allPacified: false,
	};
}
