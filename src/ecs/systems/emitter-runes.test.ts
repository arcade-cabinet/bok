import { describe, expect, it } from "vitest";
import {
	EMITTER_RUNE_IDS,
	EMITTER_STRENGTH,
	getEmitterConfig,
	hexToNumber,
	isEmitterRune,
	KENAZ_GLOW,
	SOWILO_GLOW,
} from "./emitter-runes.ts";
import { RuneId } from "./rune-data.ts";
import { SignalType } from "./signal-data.ts";

// ─── Emitter Config Lookups ───

describe("isEmitterRune", () => {
	it("Kenaz is an emitter", () => {
		expect(isEmitterRune(RuneId.Kenaz)).toBe(true);
	});

	it("Sowilo is an emitter", () => {
		expect(isEmitterRune(RuneId.Sowilo)).toBe(true);
	});

	it("non-emitter runes return false", () => {
		expect(isEmitterRune(RuneId.Fehu)).toBe(false);
		expect(isEmitterRune(RuneId.Uruz)).toBe(false);
		expect(isEmitterRune(RuneId.Thurisaz)).toBe(false);
		expect(isEmitterRune(RuneId.Ansuz)).toBe(false);
		expect(isEmitterRune(RuneId.Isa)).toBe(false);
		expect(isEmitterRune(RuneId.Berkanan)).toBe(false);
		expect(isEmitterRune(RuneId.Algiz)).toBe(false);
	});

	it("None returns false", () => {
		expect(isEmitterRune(RuneId.None)).toBe(false);
	});
});

describe("getEmitterConfig", () => {
	it("Kenaz emits Heat at strength 10", () => {
		const config = getEmitterConfig(RuneId.Kenaz);
		expect(config).toBeDefined();
		expect(config?.signalType).toBe(SignalType.Heat);
		expect(config?.strength).toBe(EMITTER_STRENGTH);
		expect(config?.continuous).toBe(true);
	});

	it("Sowilo emits Light at strength 10", () => {
		const config = getEmitterConfig(RuneId.Sowilo);
		expect(config).toBeDefined();
		expect(config?.signalType).toBe(SignalType.Light);
		expect(config?.strength).toBe(EMITTER_STRENGTH);
		expect(config?.continuous).toBe(true);
	});

	it("Kenaz glow color is ember (#a3452a)", () => {
		const config = getEmitterConfig(RuneId.Kenaz);
		expect(config?.glowColor).toBe(KENAZ_GLOW);
		expect(config?.glowColor).toBe("#a3452a");
	});

	it("Sowilo glow color is gold (#c9a84c)", () => {
		const config = getEmitterConfig(RuneId.Sowilo);
		expect(config?.glowColor).toBe(SOWILO_GLOW);
		expect(config?.glowColor).toBe("#c9a84c");
	});

	it("returns undefined for non-emitter runes", () => {
		expect(getEmitterConfig(RuneId.Fehu)).toBeUndefined();
		expect(getEmitterConfig(RuneId.None)).toBeUndefined();
	});
});

// ─── Emitter Rune IDs List ───

describe("EMITTER_RUNE_IDS", () => {
	it("contains exactly Kenaz and Sowilo", () => {
		expect(EMITTER_RUNE_IDS).toHaveLength(2);
		expect(EMITTER_RUNE_IDS).toContain(RuneId.Kenaz);
		expect(EMITTER_RUNE_IDS).toContain(RuneId.Sowilo);
	});
});

// ─── Constants ───

describe("emitter constants", () => {
	it("default emitter strength is 10", () => {
		expect(EMITTER_STRENGTH).toBe(10);
	});
});

// ─── hexToNumber ───

describe("hexToNumber", () => {
	it("converts Kenaz ember color", () => {
		expect(hexToNumber("#a3452a")).toBe(0xa3452a);
	});

	it("converts Sowilo gold color", () => {
		expect(hexToNumber("#c9a84c")).toBe(0xc9a84c);
	});

	it("converts white", () => {
		expect(hexToNumber("#ffffff")).toBe(0xffffff);
	});

	it("converts black", () => {
		expect(hexToNumber("#000000")).toBe(0);
	});
});
