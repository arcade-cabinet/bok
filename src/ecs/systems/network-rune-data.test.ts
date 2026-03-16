import { describe, expect, it } from "vitest";
import { BlockId } from "../../world/blocks.ts";
import { ArchetypeId } from "./archetype-data.ts";
import { isNetworkRune, NETWORK_RUNE_IDS } from "./network-rune-data.ts";
import { RuneId } from "./rune-data.ts";
import { computeSettlementBonuses, SettlementLevel } from "./settlement-data.ts";
import { getBlockConductivity } from "./signal-data.ts";

describe("network-rune-data", () => {
	describe("isNetworkRune", () => {
		it("returns true for Uruz", () => {
			expect(isNetworkRune(RuneId.Uruz)).toBe(true);
		});

		it("returns true for Tiwaz", () => {
			expect(isNetworkRune(RuneId.Tiwaz)).toBe(true);
		});

		it("returns false for non-network runes", () => {
			expect(isNetworkRune(RuneId.Kenaz)).toBe(false);
			expect(isNetworkRune(RuneId.Algiz)).toBe(false);
			expect(isNetworkRune(RuneId.None)).toBe(false);
		});
	});

	it("NETWORK_RUNE_IDS contains exactly Uruz and Tiwaz", () => {
		expect(NETWORK_RUNE_IDS).toHaveLength(2);
		expect(NETWORK_RUNE_IDS).toContain(RuneId.Uruz);
		expect(NETWORK_RUNE_IDS).toContain(RuneId.Tiwaz);
	});
});

describe("crystal amplification", () => {
	it("Crystal blocks have conductivity 1.5 (amplifier)", () => {
		expect(getBlockConductivity(BlockId.Crystal)).toBe(1.5);
	});

	it("Stone blocks have conductivity 1.0 (conductor)", () => {
		expect(getBlockConductivity(BlockId.Stone)).toBe(1.0);
	});

	it("Wood blocks have conductivity 0 (insulator)", () => {
		expect(getBlockConductivity(BlockId.Wood)).toBe(0);
	});

	it("Air (0) has conductivity 0", () => {
		expect(getBlockConductivity(BlockId.Air)).toBe(0);
	});
});

describe("settlement bonuses", () => {
	it("returns no bonuses for SettlementLevel.None", () => {
		const bonuses = computeSettlementBonuses(SettlementLevel.None, new Set());
		expect(bonuses.wardMult).toBe(1.0);
		expect(bonuses.growthMult).toBe(1.0);
		expect(bonuses.combatMult).toBe(1.0);
		expect(bonuses.morkerSpawnMult).toBe(1.0);
		expect(bonuses.signalBonus).toBe(0);
	});

	it("Hamlet provides base bonuses at level 1", () => {
		const archetypes = new Set([ArchetypeId.Hearth, ArchetypeId.Workshop, ArchetypeId.Ward]);
		const bonuses = computeSettlementBonuses(SettlementLevel.Hamlet, archetypes);
		expect(bonuses.wardMult).toBeCloseTo(1.15);
		expect(bonuses.growthMult).toBeCloseTo(1.2);
		expect(bonuses.combatMult).toBeCloseTo(1.1);
		expect(bonuses.morkerSpawnMult).toBeCloseTo(0.8);
		expect(bonuses.signalBonus).toBe(1);
	});

	it("Village provides stronger bonuses at level 2", () => {
		const archetypes = new Set([ArchetypeId.Hearth, ArchetypeId.Workshop, ArchetypeId.Ward, ArchetypeId.Farm]);
		const bonuses = computeSettlementBonuses(SettlementLevel.Village, archetypes);
		expect(bonuses.wardMult).toBeCloseTo(1.3);
		expect(bonuses.growthMult).toBeCloseTo(1.9); // 1.4 base + 0.5 from Farm
		expect(bonuses.combatMult).toBeCloseTo(1.2);
		expect(bonuses.morkerSpawnMult).toBeCloseTo(0.6);
		expect(bonuses.signalBonus).toBe(2);
	});

	it("Town with all archetypes provides maximum bonuses", () => {
		const archetypes = new Set([
			ArchetypeId.Hearth,
			ArchetypeId.Workshop,
			ArchetypeId.Ward,
			ArchetypeId.Farm,
			ArchetypeId.Beacon,
			ArchetypeId.Trap,
		]);
		const bonuses = computeSettlementBonuses(SettlementLevel.Town, archetypes);
		expect(bonuses.wardMult).toBeCloseTo(1.45);
		expect(bonuses.growthMult).toBeCloseTo(2.1); // 1.6 base + 0.5 Farm
		expect(bonuses.combatMult).toBeCloseTo(1.5); // 1.3 base + 0.2 Trap
		expect(bonuses.morkerSpawnMult).toBeCloseTo(0.4);
		expect(bonuses.signalBonus).toBe(5); // 3 base + 2 Beacon
	});

	it("Beacon adds signal bonus", () => {
		const with_ = new Set([ArchetypeId.Hearth, ArchetypeId.Workshop, ArchetypeId.Ward, ArchetypeId.Beacon]);
		const without_ = new Set([ArchetypeId.Hearth, ArchetypeId.Workshop, ArchetypeId.Ward]);
		const bWith = computeSettlementBonuses(SettlementLevel.Village, with_);
		const bWithout = computeSettlementBonuses(SettlementLevel.Hamlet, without_);
		expect(bWith.signalBonus - bWithout.signalBonus).toBe(3); // +1 level + 2 beacon
	});

	it("Gate adds ward multiplier bonus", () => {
		const archetypes = new Set([ArchetypeId.Hearth, ArchetypeId.Workshop, ArchetypeId.Ward, ArchetypeId.Gate]);
		const bonuses = computeSettlementBonuses(SettlementLevel.Village, archetypes);
		expect(bonuses.wardMult).toBeCloseTo(1.5); // 1.3 base + 0.2 Gate
	});
});
