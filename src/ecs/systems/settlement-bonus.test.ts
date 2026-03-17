import { beforeEach, describe, expect, it } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import { PlayerTag, Position, SettlementBonusState } from "../traits/index.ts";
import { ArchetypeId } from "./archetype-data.ts";
import {
	applySettlementBonuses,
	DEFENSE_PER_LEVEL,
	DETECTION_PER_LEVEL,
	FOOD_BONUS,
	resetSettlementBonusState,
	SMEDJA_BONUS,
	VAKTTORN_BONUS,
	WARD_BONUS,
} from "./settlement-bonus.ts";
import { SettlementLevel, type SettlementLevelId } from "./settlement-data.ts";
import type { Settlement } from "./settlement-detect.ts";

/** Create a settlement in chunk (0,0) with given level and archetypes. */
function makeSettlement(level: SettlementLevelId, archetypes: string[], cx = 0, cz = 0): Settlement {
	return {
		cx,
		cz,
		name: "Testby",
		level,
		archetypes: new Set(archetypes),
	};
}

beforeEach(() => {
	resetSettlementBonusState();
});

describe("settlementBonusSystem", () => {
	it("applies no bonuses when no settlements exist", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 8, y: 10, z: 8 } });

		applySettlementBonuses(world, []);

		world.query(PlayerTag, SettlementBonusState).readEach(([bonus]) => {
			expect(bonus.combatMult).toBe(1);
			expect(bonus.foodMult).toBe(1);
			expect(bonus.detectionBonus).toBe(0);
			expect(bonus.defenseMult).toBe(1);
		});
	});

	it("applies no bonuses when player is outside settlement chunk", () => {
		const world = createTestWorld();
		// Player at chunk (3, 3), settlement at chunk (0, 0)
		spawnPlayer(world, { position: { x: 50, y: 10, z: 50 } });
		const settlements = [
			makeSettlement(SettlementLevel.Hamlet, [ArchetypeId.Hearth, ArchetypeId.Workshop, ArchetypeId.Ward]),
		];

		applySettlementBonuses(world, settlements);

		world.query(PlayerTag, SettlementBonusState).readEach(([bonus]) => {
			expect(bonus.combatMult).toBe(1);
			expect(bonus.foodMult).toBe(1);
			expect(bonus.detectionBonus).toBe(0);
			expect(bonus.defenseMult).toBe(1);
		});
	});

	it("Smedja (Workshop) grants combat bonus", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 8, y: 10, z: 8 } });
		const settlements = [
			makeSettlement(SettlementLevel.Hamlet, [ArchetypeId.Hearth, ArchetypeId.Workshop, ArchetypeId.Ward]),
		];

		applySettlementBonuses(world, settlements);

		world.query(PlayerTag, SettlementBonusState).readEach(([bonus]) => {
			expect(bonus.combatMult).toBeCloseTo(1 + SMEDJA_BONUS);
		});
	});

	it("Kvarn (Farm) grants food bonus — reduced hunger decay", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 8, y: 10, z: 8 } });
		const settlements = [
			makeSettlement(SettlementLevel.Village, [
				ArchetypeId.Hearth,
				ArchetypeId.Workshop,
				ArchetypeId.Ward,
				ArchetypeId.Farm,
			]),
		];

		applySettlementBonuses(world, settlements);

		world.query(PlayerTag, SettlementBonusState).readEach(([bonus]) => {
			expect(bonus.foodMult).toBeCloseTo(FOOD_BONUS);
		});
	});

	it("Vakttorn (Beacon) grants detection radius bonus", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 8, y: 10, z: 8 } });
		const settlements = [
			makeSettlement(SettlementLevel.Village, [
				ArchetypeId.Hearth,
				ArchetypeId.Workshop,
				ArchetypeId.Ward,
				ArchetypeId.Beacon,
			]),
		];

		applySettlementBonuses(world, settlements);

		world.query(PlayerTag, SettlementBonusState).readEach(([bonus]) => {
			// Village is level 2: level scaling + Vakttorn bonus
			expect(bonus.detectionBonus).toBeCloseTo(DETECTION_PER_LEVEL * 2 + VAKTTORN_BONUS);
		});
	});

	it("Försvarsverk (Ward) grants defense — damage reduction", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 8, y: 10, z: 8 } });
		const settlements = [
			makeSettlement(SettlementLevel.Hamlet, [ArchetypeId.Hearth, ArchetypeId.Workshop, ArchetypeId.Ward]),
		];

		applySettlementBonuses(world, settlements);

		world.query(PlayerTag, SettlementBonusState).readEach(([bonus]) => {
			// Hamlet (level 1) with Ward archetype: level + ward bonus
			expect(bonus.defenseMult).toBeCloseTo(1 - DEFENSE_PER_LEVEL - WARD_BONUS);
		});
	});

	it("bonuses scale with settlement level", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 8, y: 10, z: 8 } });
		const town = makeSettlement(SettlementLevel.Town, [
			ArchetypeId.Hearth,
			ArchetypeId.Workshop,
			ArchetypeId.Ward,
			ArchetypeId.Farm,
			ArchetypeId.Beacon,
			ArchetypeId.Trap,
		]);

		applySettlementBonuses(world, [town]);

		world.query(PlayerTag, SettlementBonusState).readEach(([bonus]) => {
			// Town (level 3) with Ward: level scaling + ward bonus
			expect(bonus.defenseMult).toBeCloseTo(1 - DEFENSE_PER_LEVEL * 3 - WARD_BONUS);
			// Detection scales with level + Beacon bonus
			expect(bonus.detectionBonus).toBeCloseTo(DETECTION_PER_LEVEL * 3 + VAKTTORN_BONUS);
		});
	});

	it("stacks multiple archetype bonuses in one settlement", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 8, y: 10, z: 8 } });
		const rich = makeSettlement(SettlementLevel.Town, [
			ArchetypeId.Hearth,
			ArchetypeId.Workshop,
			ArchetypeId.Ward,
			ArchetypeId.Farm,
			ArchetypeId.Beacon,
			ArchetypeId.Trap,
		]);

		applySettlementBonuses(world, [rich]);

		world.query(PlayerTag, SettlementBonusState).readEach(([bonus]) => {
			expect(bonus.combatMult).toBeGreaterThan(1);
			expect(bonus.foodMult).toBeLessThan(1);
			expect(bonus.detectionBonus).toBeGreaterThan(0);
			expect(bonus.defenseMult).toBeLessThan(1);
		});
	});

	it("resets bonuses when player leaves the settlement", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 8, y: 10, z: 8 } });
		const settlements = [
			makeSettlement(SettlementLevel.Hamlet, [ArchetypeId.Hearth, ArchetypeId.Workshop, ArchetypeId.Ward]),
		];

		// Apply bonuses
		applySettlementBonuses(world, settlements);

		// Move player out and apply with empty list
		world.query(PlayerTag, Position).updateEach(([pos]) => {
			pos.x = 200;
			pos.z = 200;
		});
		applySettlementBonuses(world, settlements);

		world.query(PlayerTag, SettlementBonusState).readEach(([bonus]) => {
			expect(bonus.combatMult).toBe(1);
			expect(bonus.foodMult).toBe(1);
			expect(bonus.detectionBonus).toBe(0);
			expect(bonus.defenseMult).toBe(1);
		});
	});

	it("picks best settlement when player is near boundary", () => {
		const world = createTestWorld();
		// Player in chunk (0, 0)
		spawnPlayer(world, { position: { x: 8, y: 10, z: 8 } });
		const hamlet = makeSettlement(
			SettlementLevel.Hamlet,
			[ArchetypeId.Hearth, ArchetypeId.Workshop, ArchetypeId.Ward],
			0,
			0,
		);
		const village = makeSettlement(
			SettlementLevel.Village,
			[ArchetypeId.Hearth, ArchetypeId.Workshop, ArchetypeId.Ward, ArchetypeId.Farm],
			1,
			0,
		);

		// Player is in chunk (0,0) where hamlet is — should get hamlet bonuses
		applySettlementBonuses(world, [hamlet, village]);

		world.query(PlayerTag, SettlementBonusState).readEach(([bonus]) => {
			// Should NOT have food bonus (no Farm in the hamlet)
			expect(bonus.foodMult).toBe(1);
		});
	});

	it("Försvarsverk (Ward) + level combine for defense", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 8, y: 10, z: 8 } });
		const settlements = [
			makeSettlement(SettlementLevel.Village, [
				ArchetypeId.Hearth,
				ArchetypeId.Workshop,
				ArchetypeId.Ward,
				ArchetypeId.Gate,
			]),
		];

		applySettlementBonuses(world, settlements);

		world.query(PlayerTag, SettlementBonusState).readEach(([bonus]) => {
			// Level 2 defense + Ward bonus
			expect(bonus.defenseMult).toBeCloseTo(1 - DEFENSE_PER_LEVEL * 2 - WARD_BONUS);
		});
	});
});
