import { describe, expect, it } from "vitest";
import { BlockId } from "../../world/blocks.ts";
import type { RuneBlock } from "./archetype-helpers.ts";
import { RuneId } from "./rune-data.ts";
import {
	detectAllSettlementArchetypes,
	detectForsvarsverk,
	detectKvarn,
	detectSmedja,
	detectVakttorn,
	FORSVARSVERK_LINK_DISTANCE,
	KVARN_LINK_DISTANCE,
	SettlementArchetypeId,
	SMEDJA_FORGE_DISTANCE,
	VAKTTORN_LINK_DISTANCE,
	VAKTTORN_MIN_Y,
} from "./settlement-detector.ts";
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

// ─── detectSmedja (smithy) ───

describe("detectSmedja", () => {
	it("detects Kenaz + Jera with nearby Forge block", () => {
		const runes: RuneBlock[] = [
			{ x: 10, y: 10, z: 10, runeId: RuneId.Kenaz },
			{ x: 12, y: 10, z: 10, runeId: RuneId.Jera },
		];
		const signalMap = buildSignalMap([{ x: 10, y: 10, z: 10, type: SignalType.Heat, strength: 3 }]);
		const getVoxel = (x: number, _y: number, _z: number) => {
			if (x === 11) return BlockId.Forge;
			return 0;
		};
		const result = detectSmedja(runes, signalMap, getVoxel);
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe(SettlementArchetypeId.Smedja);
	});

	it("rejects without Forge block nearby", () => {
		const runes: RuneBlock[] = [
			{ x: 10, y: 10, z: 10, runeId: RuneId.Kenaz },
			{ x: 12, y: 10, z: 10, runeId: RuneId.Jera },
		];
		const signalMap = buildSignalMap([{ x: 10, y: 10, z: 10, type: SignalType.Heat, strength: 3 }]);
		const getVoxel = () => 0;
		expect(detectSmedja(runes, signalMap, getVoxel)).toHaveLength(0);
	});

	it("rejects Kenaz without heat signal", () => {
		const runes: RuneBlock[] = [
			{ x: 10, y: 10, z: 10, runeId: RuneId.Kenaz },
			{ x: 12, y: 10, z: 10, runeId: RuneId.Jera },
		];
		const getVoxel = (_x: number, _y: number, z: number) => {
			if (z === 11) return BlockId.Forge;
			return 0;
		};
		expect(detectSmedja(runes, new Map(), getVoxel)).toHaveLength(0);
	});

	it("rejects when Jera is beyond link distance", () => {
		const runes: RuneBlock[] = [
			{ x: 10, y: 10, z: 10, runeId: RuneId.Kenaz },
			{ x: 10 + SMEDJA_FORGE_DISTANCE + 10, y: 10, z: 10, runeId: RuneId.Jera },
		];
		const signalMap = buildSignalMap([{ x: 10, y: 10, z: 10, type: SignalType.Heat, strength: 3 }]);
		const getVoxel = (x: number) => (x === 11 ? BlockId.Forge : 0);
		expect(detectSmedja(runes, signalMap, getVoxel)).toHaveLength(0);
	});
});

// ─── detectKvarn (mill) ───

describe("detectKvarn", () => {
	it("detects Jera + Berkanan with active signals", () => {
		const runes: RuneBlock[] = [
			{ x: 10, y: 10, z: 10, runeId: RuneId.Jera },
			{ x: 13, y: 10, z: 10, runeId: RuneId.Berkanan },
		];
		const signalMap = buildSignalMap([
			{ x: 10, y: 10, z: 10, type: SignalType.Heat, strength: 2 },
			{ x: 13, y: 10, z: 10, type: SignalType.Heat, strength: 2 },
		]);
		const result = detectKvarn(runes, signalMap);
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe(SettlementArchetypeId.Kvarn);
	});

	it("rejects when Berkanan has no signal", () => {
		const runes: RuneBlock[] = [
			{ x: 10, y: 10, z: 10, runeId: RuneId.Jera },
			{ x: 13, y: 10, z: 10, runeId: RuneId.Berkanan },
		];
		const signalMap = buildSignalMap([{ x: 10, y: 10, z: 10, type: SignalType.Heat, strength: 2 }]);
		expect(detectKvarn(runes, signalMap)).toHaveLength(0);
	});

	it("rejects when beyond link distance", () => {
		const d = KVARN_LINK_DISTANCE + 1;
		const runes: RuneBlock[] = [
			{ x: 0, y: 10, z: 0, runeId: RuneId.Jera },
			{ x: d, y: 10, z: 0, runeId: RuneId.Berkanan },
		];
		const signalMap = buildSignalMap([
			{ x: 0, y: 10, z: 0, type: SignalType.Heat, strength: 2 },
			{ x: d, y: 10, z: 0, type: SignalType.Heat, strength: 2 },
		]);
		expect(detectKvarn(runes, signalMap)).toHaveLength(0);
	});

	it("rejects single Jera without Berkanan", () => {
		const runes: RuneBlock[] = [{ x: 10, y: 10, z: 10, runeId: RuneId.Jera }];
		const signalMap = buildSignalMap([{ x: 10, y: 10, z: 10, type: SignalType.Heat, strength: 5 }]);
		expect(detectKvarn(runes, signalMap)).toHaveLength(0);
	});
});

// ─── detectVakttorn (watchtower) ───

describe("detectVakttorn", () => {
	it("detects Sowilo + Ansuz at elevated position", () => {
		const runes: RuneBlock[] = [
			{ x: 10, y: VAKTTORN_MIN_Y, z: 10, runeId: RuneId.Sowilo },
			{ x: 12, y: VAKTTORN_MIN_Y, z: 10, runeId: RuneId.Ansuz },
		];
		const signalMap = buildSignalMap([{ x: 10, y: VAKTTORN_MIN_Y, z: 10, type: SignalType.Light, strength: 5 }]);
		const result = detectVakttorn(runes, signalMap);
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe(SettlementArchetypeId.Vakttorn);
	});

	it("rejects Sowilo below minimum height", () => {
		const runes: RuneBlock[] = [
			{ x: 10, y: VAKTTORN_MIN_Y - 1, z: 10, runeId: RuneId.Sowilo },
			{ x: 12, y: VAKTTORN_MIN_Y - 1, z: 10, runeId: RuneId.Ansuz },
		];
		const signalMap = buildSignalMap([{ x: 10, y: VAKTTORN_MIN_Y - 1, z: 10, type: SignalType.Light, strength: 5 }]);
		expect(detectVakttorn(runes, signalMap)).toHaveLength(0);
	});

	it("rejects without Ansuz nearby", () => {
		const runes: RuneBlock[] = [{ x: 10, y: VAKTTORN_MIN_Y, z: 10, runeId: RuneId.Sowilo }];
		const signalMap = buildSignalMap([{ x: 10, y: VAKTTORN_MIN_Y, z: 10, type: SignalType.Light, strength: 5 }]);
		expect(detectVakttorn(runes, signalMap)).toHaveLength(0);
	});

	it("rejects without light signal", () => {
		const runes: RuneBlock[] = [
			{ x: 10, y: VAKTTORN_MIN_Y, z: 10, runeId: RuneId.Sowilo },
			{ x: 12, y: VAKTTORN_MIN_Y, z: 10, runeId: RuneId.Ansuz },
		];
		expect(detectVakttorn(runes, new Map())).toHaveLength(0);
	});

	it("rejects when Ansuz beyond link distance", () => {
		const d = VAKTTORN_LINK_DISTANCE + 1;
		const runes: RuneBlock[] = [
			{ x: 0, y: VAKTTORN_MIN_Y, z: 0, runeId: RuneId.Sowilo },
			{ x: d, y: VAKTTORN_MIN_Y, z: 0, runeId: RuneId.Ansuz },
		];
		const signalMap = buildSignalMap([{ x: 0, y: VAKTTORN_MIN_Y, z: 0, type: SignalType.Light, strength: 5 }]);
		expect(detectVakttorn(runes, signalMap)).toHaveLength(0);
	});
});

// ─── detectForsvarsverk (fortification) ───

describe("detectForsvarsverk", () => {
	it("detects Algiz + Thurisaz + Ansuz co-located with signals", () => {
		const runes: RuneBlock[] = [
			{ x: 10, y: 10, z: 10, runeId: RuneId.Algiz },
			{ x: 12, y: 10, z: 10, runeId: RuneId.Thurisaz },
			{ x: 14, y: 10, z: 10, runeId: RuneId.Ansuz },
		];
		const signalMap = buildSignalMap([
			{ x: 10, y: 10, z: 10, type: SignalType.Force, strength: 3 },
			{ x: 12, y: 10, z: 10, type: SignalType.Heat, strength: 3 },
			{ x: 14, y: 10, z: 10, type: SignalType.Detection, strength: 3 },
		]);
		const result = detectForsvarsverk(runes, signalMap);
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe(SettlementArchetypeId.Forsvarsverk);
	});

	it("rejects without Ansuz", () => {
		const runes: RuneBlock[] = [
			{ x: 10, y: 10, z: 10, runeId: RuneId.Algiz },
			{ x: 12, y: 10, z: 10, runeId: RuneId.Thurisaz },
		];
		const signalMap = buildSignalMap([
			{ x: 10, y: 10, z: 10, type: SignalType.Force, strength: 3 },
			{ x: 12, y: 10, z: 10, type: SignalType.Heat, strength: 3 },
		]);
		expect(detectForsvarsverk(runes, signalMap)).toHaveLength(0);
	});

	it("rejects when runes lack signal", () => {
		const runes: RuneBlock[] = [
			{ x: 10, y: 10, z: 10, runeId: RuneId.Algiz },
			{ x: 12, y: 10, z: 10, runeId: RuneId.Thurisaz },
			{ x: 14, y: 10, z: 10, runeId: RuneId.Ansuz },
		];
		expect(detectForsvarsverk(runes, new Map())).toHaveLength(0);
	});

	it("rejects when Thurisaz beyond link distance", () => {
		const d = FORSVARSVERK_LINK_DISTANCE + 1;
		const runes: RuneBlock[] = [
			{ x: 0, y: 10, z: 0, runeId: RuneId.Algiz },
			{ x: d, y: 10, z: 0, runeId: RuneId.Thurisaz },
			{ x: 1, y: 10, z: 0, runeId: RuneId.Ansuz },
		];
		const signalMap = buildSignalMap([
			{ x: 0, y: 10, z: 0, type: SignalType.Force, strength: 3 },
			{ x: d, y: 10, z: 0, type: SignalType.Heat, strength: 3 },
			{ x: 1, y: 10, z: 0, type: SignalType.Detection, strength: 3 },
		]);
		expect(detectForsvarsverk(runes, signalMap)).toHaveLength(0);
	});
});

// ─── detectAllSettlementArchetypes ───

describe("detectAllSettlementArchetypes", () => {
	it("returns empty for no runes", () => {
		expect(detectAllSettlementArchetypes([], new Map(), () => 0)).toHaveLength(0);
	});

	it("detects multiple archetype types in one scan", () => {
		const runes: RuneBlock[] = [
			// Smedja
			{ x: 10, y: 10, z: 10, runeId: RuneId.Kenaz },
			{ x: 12, y: 10, z: 10, runeId: RuneId.Jera },
			// Vakttorn
			{ x: 50, y: VAKTTORN_MIN_Y, z: 50, runeId: RuneId.Sowilo },
			{ x: 52, y: VAKTTORN_MIN_Y, z: 50, runeId: RuneId.Ansuz },
		];
		const signalMap = buildSignalMap([
			{ x: 10, y: 10, z: 10, type: SignalType.Heat, strength: 3 },
			{ x: 50, y: VAKTTORN_MIN_Y, z: 50, type: SignalType.Light, strength: 5 },
		]);
		const getVoxel = (x: number) => (x === 11 ? BlockId.Forge : 0);
		const result = detectAllSettlementArchetypes(runes, signalMap, getVoxel);
		expect(result.length).toBeGreaterThanOrEqual(2);
		const types = new Set(result.map((r) => r.type));
		expect(types.has(SettlementArchetypeId.Smedja)).toBe(true);
		expect(types.has(SettlementArchetypeId.Vakttorn)).toBe(true);
	});
});
