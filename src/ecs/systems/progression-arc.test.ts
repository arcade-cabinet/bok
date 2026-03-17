import { describe, expect, it } from "vitest";
import {
	Act,
	type ActId,
	computeCurrentAct,
	getActMilestoneId,
	getActObjective,
	getActProse,
	INSCRIPTION_ACT_THRESHOLDS,
} from "./progression-arc.ts";

describe("computeCurrentAct", () => {
	it("starts at Act I by default", () => {
		const act = computeCurrentAct({
			dayCount: 1,
			inscriptionLevel: 0,
			hasShelter: false,
			hasWorkstation: false,
			biomesDiscovered: 1,
			hasDefeatedRunvaktare: false,
			settlementLevel: 0,
			bossDefeated: false,
		});
		expect(act).toBe(Act.I);
	});

	it("remains Act I without shelter even on day 2", () => {
		const act = computeCurrentAct({
			dayCount: 2,
			inscriptionLevel: 10,
			hasShelter: false,
			hasWorkstation: false,
			biomesDiscovered: 1,
			hasDefeatedRunvaktare: false,
			settlementLevel: 0,
			bossDefeated: false,
		});
		expect(act).toBe(Act.I);
	});

	it("advances to Act II when shelter built and inscription >= threshold", () => {
		const act = computeCurrentAct({
			dayCount: 2,
			inscriptionLevel: INSCRIPTION_ACT_THRESHOLDS[Act.II],
			hasShelter: true,
			hasWorkstation: false,
			biomesDiscovered: 1,
			hasDefeatedRunvaktare: false,
			settlementLevel: 0,
			bossDefeated: false,
		});
		expect(act).toBe(Act.II);
	});

	it("remains Act II without workstation even at high inscription", () => {
		const act = computeCurrentAct({
			dayCount: 4,
			inscriptionLevel: 100,
			hasShelter: true,
			hasWorkstation: false,
			biomesDiscovered: 1,
			hasDefeatedRunvaktare: false,
			settlementLevel: 0,
			bossDefeated: false,
		});
		expect(act).toBe(Act.II);
	});

	it("advances to Act III with workstation, 2 biomes, and inscription >= threshold", () => {
		const act = computeCurrentAct({
			dayCount: 5,
			inscriptionLevel: INSCRIPTION_ACT_THRESHOLDS[Act.III],
			hasShelter: true,
			hasWorkstation: true,
			biomesDiscovered: 2,
			hasDefeatedRunvaktare: false,
			settlementLevel: 0,
			bossDefeated: false,
		});
		expect(act).toBe(Act.III);
	});

	it("remains Act III without defeating Runväktare", () => {
		const act = computeCurrentAct({
			dayCount: 15,
			inscriptionLevel: 500,
			hasShelter: true,
			hasWorkstation: true,
			biomesDiscovered: 3,
			hasDefeatedRunvaktare: false,
			settlementLevel: 1,
			bossDefeated: false,
		});
		expect(act).toBe(Act.III);
	});

	it("advances to Act IV with Runväktare defeated and hamlet settlement", () => {
		const act = computeCurrentAct({
			dayCount: 16,
			inscriptionLevel: INSCRIPTION_ACT_THRESHOLDS[Act.IV],
			hasShelter: true,
			hasWorkstation: true,
			biomesDiscovered: 2,
			hasDefeatedRunvaktare: true,
			settlementLevel: 1,
			bossDefeated: false,
		});
		expect(act).toBe(Act.IV);
	});

	it("advances to Act V with boss defeated", () => {
		const act = computeCurrentAct({
			dayCount: 31,
			inscriptionLevel: INSCRIPTION_ACT_THRESHOLDS[Act.V],
			hasShelter: true,
			hasWorkstation: true,
			biomesDiscovered: 3,
			hasDefeatedRunvaktare: true,
			settlementLevel: 2,
			bossDefeated: true,
		});
		expect(act).toBe(Act.V);
	});

	it("inscription level alone cannot advance past milestone requirements", () => {
		const act = computeCurrentAct({
			dayCount: 30,
			inscriptionLevel: 2000,
			hasShelter: true,
			hasWorkstation: true,
			biomesDiscovered: 1,
			hasDefeatedRunvaktare: false,
			settlementLevel: 0,
			bossDefeated: false,
		});
		// Can't reach Act III without 2 biomes, can't reach Act IV without Runväktare
		expect(act).toBe(Act.II);
	});
});

describe("getActObjective", () => {
	it("returns survive-first-night for Act I", () => {
		const obj = getActObjective(Act.I);
		expect(obj).toContain("night");
	});

	it("returns base/workstation objective for Act II", () => {
		const obj = getActObjective(Act.II);
		expect(obj).toContain("workstation");
	});

	it("returns Fornlämning objective for Act III", () => {
		const obj = getActObjective(Act.III);
		expect(obj).toContain("Fornlämning");
	});

	it("returns settlement objective for Act IV", () => {
		const obj = getActObjective(Act.IV);
		expect(obj).toContain("settlement");
	});

	it("returns Jätten objective for Act V", () => {
		const obj = getActObjective(Act.V);
		expect(obj).toContain("Runsten Seal");
	});
});

describe("getActProse", () => {
	it("returns prose for every act", () => {
		for (const act of Object.values(Act)) {
			if (typeof act === "number") {
				const prose = getActProse(act as ActId);
				expect(prose.length).toBeGreaterThan(20);
			}
		}
	});
});

describe("getActMilestoneId", () => {
	it("returns unique milestone ID per act", () => {
		const ids = new Set<string>();
		for (const act of Object.values(Act)) {
			if (typeof act === "number") {
				ids.add(getActMilestoneId(act as ActId));
			}
		}
		expect(ids.size).toBe(5);
	});

	it("milestone IDs follow naming convention", () => {
		expect(getActMilestoneId(Act.I)).toBe("act_1_awakening");
		expect(getActMilestoneId(Act.V)).toBe("act_5_jatten");
	});
});
