/**
 * Ecosystem interaction tests — creature-to-creature relationships.
 * Written FIRST (TDD) before implementation.
 */

import { describe, expect, it } from "vitest";
import {
	type CreatureInfo,
	computeEcosystemInteractions,
	type EcosystemResult,
	findGrazingSnails,
	findMorkerHuntTargets,
	findTranaFleeTargets,
	GRAZE_TRANSFORM_INTERVAL,
	HUNT_EXTINGUISH_RANGE,
	isNorrskenPacified,
	MORKER_FLEE_RANGE,
	NORRSKEN_PACIFY_DURATION,
	resetEcosystemState,
} from "./ecosystem.ts";

function mkCreature(id: number, species: string, x: number, z: number, y = 0): CreatureInfo {
	return { entityId: id, species, x, y, z, blockBelow: 0 };
}

describe("ecosystem", () => {
	// ─── Mörker hunt Lyktgubbar ───

	it("finds lyktgubbe targets within extinguish range of mörker", () => {
		const morker = [mkCreature(1, "morker", 0, 0)];
		const lyktgubbar = [mkCreature(2, "lyktgubbe", 3, 0)];
		const targets = findMorkerHuntTargets(morker, lyktgubbar);
		expect(targets).toHaveLength(1);
		expect(targets[0].morkerEntityId).toBe(1);
		expect(targets[0].lyktgubbeEntityId).toBe(2);
	});

	it("ignores lyktgubbar outside extinguish range", () => {
		const morker = [mkCreature(1, "morker", 0, 0)];
		const lyktgubbar = [mkCreature(2, "lyktgubbe", HUNT_EXTINGUISH_RANGE + 5, 0)];
		const targets = findMorkerHuntTargets(morker, lyktgubbar);
		expect(targets).toHaveLength(0);
	});

	it("each mörker targets the closest lyktgubbe", () => {
		const morker = [mkCreature(1, "morker", 0, 0)];
		const lyktgubbar = [mkCreature(2, "lyktgubbe", 5, 0), mkCreature(3, "lyktgubbe", 2, 0)];
		const targets = findMorkerHuntTargets(morker, lyktgubbar);
		expect(targets).toHaveLength(1);
		expect(targets[0].lyktgubbeEntityId).toBe(3); // closer
	});

	// ─── Skogssniglar grazing → mycel transformation ───

	it("finds snails grazing on grass blocks", () => {
		const snails = [{ ...mkCreature(1, "skogssnigle", 5, 5), blockBelow: 1 }]; // 1 = Grass
		const grazers = findGrazingSnails(snails, 1); // pass Grass blockId
		expect(grazers).toHaveLength(1);
		expect(grazers[0].entityId).toBe(1);
	});

	it("ignores snails not on grass", () => {
		const snails = [{ ...mkCreature(1, "skogssnigle", 5, 5), blockBelow: 3 }]; // 3 = Stone
		const grazers = findGrazingSnails(snails, 1);
		expect(grazers).toHaveLength(0);
	});

	// ─── Tranor flee Mörker ───

	it("trana flees nearby mörker", () => {
		const trana = [mkCreature(1, "trana", 10, 10)];
		const morker = [mkCreature(2, "morker", 12, 10)];
		const fleeing = findTranaFleeTargets(trana, morker);
		expect(fleeing).toHaveLength(1);
		expect(fleeing[0].tranaEntityId).toBe(1);
		expect(fleeing[0].threatX).toBe(12);
	});

	it("trana does not flee distant mörker", () => {
		const trana = [mkCreature(1, "trana", 10, 10)];
		const morker = [mkCreature(2, "morker", 10 + MORKER_FLEE_RANGE + 5, 10)];
		const fleeing = findTranaFleeTargets(trana, morker);
		expect(fleeing).toHaveLength(0);
	});

	it("trana flees nearest mörker of multiple", () => {
		const trana = [mkCreature(1, "trana", 0, 0)];
		const morker = [mkCreature(2, "morker", 10, 0), mkCreature(3, "morker", 5, 0)];
		const fleeing = findTranaFleeTargets(trana, morker);
		expect(fleeing).toHaveLength(1);
		expect(fleeing[0].nearestMorkerEntityId).toBe(3);
	});

	// ─── Norrsken pacification ───

	it("all creatures are pacified during norrsken", () => {
		expect(isNorrskenPacified(true, 0)).toBe(true);
	});

	it("creatures not pacified when norrsken has been off long enough", () => {
		expect(isNorrskenPacified(false, NORRSKEN_PACIFY_DURATION + 1)).toBe(false);
	});

	it("pacification lingers briefly after norrsken ends", () => {
		expect(isNorrskenPacified(false, NORRSKEN_PACIFY_DURATION - 0.1)).toBe(true);
	});

	it("pacification fully wears off after duration", () => {
		expect(isNorrskenPacified(false, NORRSKEN_PACIFY_DURATION + 0.1)).toBe(false);
	});

	// ─── Full ecosystem computation ───

	it("returns all interaction types in result", () => {
		resetEcosystemState();
		const creatures: CreatureInfo[] = [
			mkCreature(1, "morker", 0, 0),
			mkCreature(2, "lyktgubbe", 3, 0),
			mkCreature(3, "skogssnigle", 20, 20),
			mkCreature(4, "trana", 5, 0),
		];
		creatures[2].blockBelow = 1; // Grass

		const result = computeEcosystemInteractions(creatures, {
			norrskenActive: false,
			grassBlockId: 1,
			dt: 0.1,
		});

		expect(result.huntTargets).toHaveLength(1);
		expect(result.grazingSnails).toHaveLength(1);
		expect(result.fleeingTrana).toHaveLength(1);
		expect(result.allPacified).toBe(false);
	});

	it("pacification overrides all interactions during norrsken", () => {
		resetEcosystemState();
		const creatures: CreatureInfo[] = [
			mkCreature(1, "morker", 0, 0),
			mkCreature(2, "lyktgubbe", 3, 0),
			mkCreature(3, "trana", 5, 0),
		];

		const result = computeEcosystemInteractions(creatures, {
			norrskenActive: true,
			grassBlockId: 1,
			dt: 0.1,
		});

		expect(result.allPacified).toBe(true);
		expect(result.huntTargets).toHaveLength(0);
		expect(result.fleeingTrana).toHaveLength(0);
	});

	// ─── Graze transform timing ───

	it("graze transform respects interval", () => {
		resetEcosystemState();
		const creatures: CreatureInfo[] = [{ ...mkCreature(1, "skogssnigle", 5, 5), blockBelow: 1 }];

		// First call — timer starts, no transform yet
		const r1 = computeEcosystemInteractions(creatures, {
			norrskenActive: false,
			grassBlockId: 1,
			dt: 0.1,
		});
		expect(r1.grazeTransforms).toHaveLength(0);

		// Accumulate enough time
		const r2 = computeEcosystemInteractions(creatures, {
			norrskenActive: false,
			grassBlockId: 1,
			dt: GRAZE_TRANSFORM_INTERVAL + 0.1,
		});
		expect(r2.grazeTransforms).toHaveLength(1);
		expect(r2.grazeTransforms[0].entityId).toBe(1);
	});
});
