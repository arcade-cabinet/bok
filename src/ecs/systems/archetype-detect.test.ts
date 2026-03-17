import { describe, expect, it } from "vitest";
import { BlockId } from "../../world/blocks.ts";
import { computeWardRadius } from "./algiz-ward.ts";
import {
	ArchetypeId,
	BEACON_MIN_LIGHT_TOTAL,
	FARM_CROP_DISTANCE,
	HEARTH_MIN_HEAT,
	TRAP_LINK_DISTANCE,
	TRAP_MIN_SIGNAL,
	WARD_MIN_RADIUS,
	WORKSHOP_JERA_DISTANCE,
} from "./archetype-data.ts";
import {
	detectBeacon,
	detectFarm,
	detectGate,
	detectHearth,
	detectTrap,
	detectWard,
	detectWorkshop,
	groupByChunk,
	type RuneBlock,
} from "./archetype-detect.ts";
import { RuneId } from "./rune-data.ts";
import { SignalType } from "./signal-data.ts";

// ─── Helper: build a signal map from entries ───

function buildSignalMap(
	entries: Array<{ x: number; y: number; z: number; type: number; strength: number }>,
): Map<string, Map<number, number>> {
	const map = new Map<string, Map<number, number>>();
	for (const e of entries) {
		const pk = `${e.x},${e.y},${e.z}`;
		let types = map.get(pk);
		if (!types) {
			types = new Map();
			map.set(pk, types);
		}
		types.set(e.type, e.strength);
	}
	return map;
}

// ─── detectHearth ───

describe("detectHearth", () => {
	it("detects Kenaz with heat inside enclosure", () => {
		const runes: RuneBlock[] = [{ x: 5, y: 10, z: 5, runeId: RuneId.Kenaz }];
		const signalMap = buildSignalMap([{ x: 5, y: 10, z: 5, type: SignalType.Heat, strength: HEARTH_MIN_HEAT }]);
		const enclosed = new Set(["5,10,5"]);
		const result = detectHearth(runes, signalMap, enclosed);
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe(ArchetypeId.Hearth);
	});

	it("rejects Kenaz without enclosure", () => {
		const runes: RuneBlock[] = [{ x: 5, y: 10, z: 5, runeId: RuneId.Kenaz }];
		const signalMap = buildSignalMap([{ x: 5, y: 10, z: 5, type: SignalType.Heat, strength: HEARTH_MIN_HEAT }]);
		expect(detectHearth(runes, signalMap, new Set())).toHaveLength(0);
	});

	it("rejects Kenaz with insufficient heat", () => {
		const runes: RuneBlock[] = [{ x: 5, y: 10, z: 5, runeId: RuneId.Kenaz }];
		const signalMap = buildSignalMap([{ x: 5, y: 10, z: 5, type: SignalType.Heat, strength: HEARTH_MIN_HEAT - 1 }]);
		const enclosed = new Set(["5,10,5"]);
		expect(detectHearth(runes, signalMap, enclosed)).toHaveLength(0);
	});

	it("ignores non-Kenaz runes", () => {
		const runes: RuneBlock[] = [{ x: 5, y: 10, z: 5, runeId: RuneId.Sowilo }];
		const signalMap = buildSignalMap([{ x: 5, y: 10, z: 5, type: SignalType.Heat, strength: 10 }]);
		const enclosed = new Set(["5,10,5"]);
		expect(detectHearth(runes, signalMap, enclosed)).toHaveLength(0);
	});
});

// ─── detectWorkshop ───

describe("detectWorkshop", () => {
	it("detects Kenaz + Jera within range", () => {
		const runes: RuneBlock[] = [
			{ x: 10, y: 10, z: 10, runeId: RuneId.Kenaz },
			{ x: 10 + WORKSHOP_JERA_DISTANCE, y: 10, z: 10, runeId: RuneId.Jera },
		];
		const signalMap = buildSignalMap([{ x: 10, y: 10, z: 10, type: SignalType.Heat, strength: HEARTH_MIN_HEAT }]);
		const result = detectWorkshop(runes, signalMap);
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe(ArchetypeId.Workshop);
	});

	it("rejects Kenaz + Jera beyond range", () => {
		const runes: RuneBlock[] = [
			{ x: 10, y: 10, z: 10, runeId: RuneId.Kenaz },
			{ x: 10 + WORKSHOP_JERA_DISTANCE + 1, y: 10, z: 10, runeId: RuneId.Jera },
		];
		const signalMap = buildSignalMap([{ x: 10, y: 10, z: 10, type: SignalType.Heat, strength: HEARTH_MIN_HEAT }]);
		expect(detectWorkshop(runes, signalMap)).toHaveLength(0);
	});

	it("rejects Kenaz without heat signal", () => {
		const runes: RuneBlock[] = [
			{ x: 10, y: 10, z: 10, runeId: RuneId.Kenaz },
			{ x: 12, y: 10, z: 10, runeId: RuneId.Jera },
		];
		expect(detectWorkshop(runes, new Map())).toHaveLength(0);
	});
});

// ─── detectBeacon ───

describe("detectBeacon", () => {
	it("detects when total Sowilo light exceeds threshold", () => {
		const runes: RuneBlock[] = [
			{ x: 5, y: 10, z: 5, runeId: RuneId.Sowilo },
			{ x: 7, y: 10, z: 5, runeId: RuneId.Sowilo },
			{ x: 9, y: 10, z: 5, runeId: RuneId.Sowilo },
		];
		const strength = Math.ceil(BEACON_MIN_LIGHT_TOTAL / 3) + 1;
		const signalMap = buildSignalMap([
			{ x: 5, y: 10, z: 5, type: SignalType.Light, strength },
			{ x: 7, y: 10, z: 5, type: SignalType.Light, strength },
			{ x: 9, y: 10, z: 5, type: SignalType.Light, strength },
		]);
		const result = detectBeacon(runes, signalMap);
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe(ArchetypeId.Beacon);
	});

	it("rejects when total light is below threshold", () => {
		const runes: RuneBlock[] = [{ x: 5, y: 10, z: 5, runeId: RuneId.Sowilo }];
		const signalMap = buildSignalMap([
			{ x: 5, y: 10, z: 5, type: SignalType.Light, strength: BEACON_MIN_LIGHT_TOTAL - 1 },
		]);
		expect(detectBeacon(runes, signalMap)).toHaveLength(0);
	});

	it("sums across multiple Sowilo in same chunk", () => {
		const runes: RuneBlock[] = [
			{ x: 0, y: 10, z: 0, runeId: RuneId.Sowilo },
			{ x: 1, y: 10, z: 0, runeId: RuneId.Sowilo },
		];
		const signalMap = buildSignalMap([
			{ x: 0, y: 10, z: 0, type: SignalType.Light, strength: 10 },
			{ x: 1, y: 10, z: 0, type: SignalType.Light, strength: 10 },
		]);
		expect(detectBeacon(runes, signalMap)).toHaveLength(1);
	});
});

// ─── detectWard ───

describe("detectWard", () => {
	it("detects Algiz with radius > threshold", () => {
		// Find strength that gives radius > WARD_MIN_RADIUS
		let strength = 0;
		while (computeWardRadius(strength) <= WARD_MIN_RADIUS) strength++;
		const runes: RuneBlock[] = [{ x: 5, y: 10, z: 5, runeId: RuneId.Algiz }];
		const signalMap = buildSignalMap([{ x: 5, y: 10, z: 5, type: SignalType.Heat, strength }]);
		const result = detectWard(runes, signalMap);
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe(ArchetypeId.Ward);
	});

	it("rejects Algiz with insufficient signal", () => {
		const runes: RuneBlock[] = [{ x: 5, y: 10, z: 5, runeId: RuneId.Algiz }];
		// No signal → base radius 3 which is ≤ 5
		expect(detectWard(runes, new Map())).toHaveLength(0);
	});
});

// ─── detectTrap ───

describe("detectTrap", () => {
	it("detects Ansuz + Thurisaz within link distance", () => {
		const runes: RuneBlock[] = [
			{ x: 10, y: 10, z: 10, runeId: RuneId.Ansuz },
			{ x: 10 + TRAP_LINK_DISTANCE - 1, y: 10, z: 10, runeId: RuneId.Thurisaz },
		];
		const signalMap = buildSignalMap([
			{
				x: 10 + TRAP_LINK_DISTANCE - 1,
				y: 10,
				z: 10,
				type: SignalType.Detection,
				strength: TRAP_MIN_SIGNAL,
			},
		]);
		const result = detectTrap(runes, signalMap);
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe(ArchetypeId.Trap);
	});

	it("rejects when Thurisaz has no signal", () => {
		const runes: RuneBlock[] = [
			{ x: 10, y: 10, z: 10, runeId: RuneId.Ansuz },
			{ x: 12, y: 10, z: 10, runeId: RuneId.Thurisaz },
		];
		expect(detectTrap(runes, new Map())).toHaveLength(0);
	});

	it("rejects when beyond link distance", () => {
		const d = TRAP_LINK_DISTANCE + 1;
		const runes: RuneBlock[] = [
			{ x: 0, y: 10, z: 0, runeId: RuneId.Ansuz },
			{ x: d, y: 10, z: 0, runeId: RuneId.Thurisaz },
		];
		const signalMap = buildSignalMap([{ x: d, y: 10, z: 0, type: SignalType.Detection, strength: 10 }]);
		expect(detectTrap(runes, signalMap)).toHaveLength(0);
	});
});

// ─── detectFarm ───

describe("detectFarm", () => {
	it("detects Berkanan with nearby crops", () => {
		const runes: RuneBlock[] = [{ x: 10, y: 10, z: 10, runeId: RuneId.Berkanan }];
		const getVoxel = (x: number, _y: number, _z: number) => {
			if (x === 10 + FARM_CROP_DISTANCE) return BlockId.Mushroom;
			return 0;
		};
		const result = detectFarm(runes, getVoxel);
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe(ArchetypeId.Farm);
	});

	it("rejects Berkanan without crops nearby", () => {
		const runes: RuneBlock[] = [{ x: 10, y: 10, z: 10, runeId: RuneId.Berkanan }];
		const getVoxel = () => 0;
		expect(detectFarm(runes, getVoxel)).toHaveLength(0);
	});

	it("recognizes Cranberry as a crop", () => {
		const runes: RuneBlock[] = [{ x: 10, y: 10, z: 10, runeId: RuneId.Berkanan }];
		const getVoxel = (_x: number, _y: number, z: number) => {
			if (z === 11) return BlockId.Cranberry;
			return 0;
		};
		expect(detectFarm(runes, getVoxel)).toHaveLength(1);
	});
});

// ─── detectGate ───

describe("detectGate", () => {
	it("detects paired Isa runes within distance", () => {
		const runes: RuneBlock[] = [
			{ x: 0, y: 10, z: 0, runeId: RuneId.Isa },
			{ x: 20, y: 10, z: 0, runeId: RuneId.Isa },
		];
		const result = detectGate(runes);
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe(ArchetypeId.Gate);
	});

	it("rejects single Isa rune", () => {
		const runes: RuneBlock[] = [{ x: 0, y: 10, z: 0, runeId: RuneId.Isa }];
		expect(detectGate(runes)).toHaveLength(0);
	});

	it("rejects Isa runes beyond pair distance", () => {
		const runes: RuneBlock[] = [
			{ x: 0, y: 10, z: 0, runeId: RuneId.Isa },
			{ x: 100, y: 10, z: 0, runeId: RuneId.Isa },
		];
		expect(detectGate(runes)).toHaveLength(0);
	});
});

// ─── groupByChunk ───

describe("groupByChunk", () => {
	it("groups archetypes by chunk", () => {
		const archetypes = [
			{ type: ArchetypeId.Hearth as const, cx: 0, cz: 0, x: 5, y: 10, z: 5 },
			{ type: ArchetypeId.Ward as const, cx: 0, cz: 0, x: 7, y: 10, z: 5 },
			{ type: ArchetypeId.Workshop as const, cx: 1, cz: 0, x: 20, y: 10, z: 5 },
		];
		const groups = groupByChunk(archetypes);
		expect(groups.size).toBe(2);
		expect(groups.get("0,0")?.size).toBe(2);
		expect(groups.get("1,0")?.size).toBe(1);
	});

	it("deduplicates same archetype type in a chunk", () => {
		const archetypes = [
			{ type: ArchetypeId.Hearth as const, cx: 0, cz: 0, x: 5, y: 10, z: 5 },
			{ type: ArchetypeId.Hearth as const, cx: 0, cz: 0, x: 7, y: 10, z: 5 },
		];
		const groups = groupByChunk(archetypes);
		expect(groups.get("0,0")?.size).toBe(1);
	});
});
