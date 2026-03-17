import { describe, expect, it } from "vitest";
import {
	ALGIZ_BASE_RADIUS,
	ALGIZ_MAX_RADIUS,
	ANSUZ_COOLDOWN,
	ANSUZ_DETECT_RADIUS,
	ANSUZ_EMIT_STRENGTH,
	BERKANAN_BASE_MULTIPLIER,
	BERKANAN_BASE_RADIUS,
	BERKANAN_MAX_MULTIPLIER,
	BERKANAN_MAX_RADIUS,
	FEHU_PULL_RADIUS,
	FEHU_PULL_SPEED,
	INTERACTION_RUNE_IDS,
	INTERACTION_TICK_INTERVAL,
	isInteractionRune,
	isProtectionRune,
	MANNAZ_BASE_RADIUS,
	MANNAZ_MAX_RADIUS,
	PROTECTION_RUNE_IDS,
	THURISAZ_DAMAGE_PER_STRENGTH,
	THURISAZ_DAMAGE_RADIUS,
	THURISAZ_MAX_DAMAGE,
	THURISAZ_MIN_SIGNAL,
} from "./interaction-rune-data.ts";
import { RuneId } from "./rune-data.ts";

// ─── isInteractionRune ───

describe("isInteractionRune", () => {
	it("recognizes Jera", () => {
		expect(isInteractionRune(RuneId.Jera)).toBe(true);
	});

	it("recognizes Fehu", () => {
		expect(isInteractionRune(RuneId.Fehu)).toBe(true);
	});

	it("recognizes Ansuz", () => {
		expect(isInteractionRune(RuneId.Ansuz)).toBe(true);
	});

	it("recognizes Thurisaz", () => {
		expect(isInteractionRune(RuneId.Thurisaz)).toBe(true);
	});

	it("rejects non-interaction runes", () => {
		expect(isInteractionRune(RuneId.Kenaz)).toBe(false);
		expect(isInteractionRune(RuneId.Sowilo)).toBe(false);
		expect(isInteractionRune(RuneId.Uruz)).toBe(false);
		expect(isInteractionRune(RuneId.Isa)).toBe(false);
		expect(isInteractionRune(RuneId.Berkanan)).toBe(false);
		expect(isInteractionRune(RuneId.Algiz)).toBe(false);
		expect(isInteractionRune(RuneId.Mannaz)).toBe(false);
	});

	it("rejects None", () => {
		expect(isInteractionRune(RuneId.None)).toBe(false);
	});
});

// ─── INTERACTION_RUNE_IDS ───

describe("INTERACTION_RUNE_IDS", () => {
	it("contains exactly 4 runes", () => {
		expect(INTERACTION_RUNE_IDS).toHaveLength(4);
	});

	it("contains Jera, Fehu, Ansuz, Thurisaz", () => {
		expect(INTERACTION_RUNE_IDS).toContain(RuneId.Jera);
		expect(INTERACTION_RUNE_IDS).toContain(RuneId.Fehu);
		expect(INTERACTION_RUNE_IDS).toContain(RuneId.Ansuz);
		expect(INTERACTION_RUNE_IDS).toContain(RuneId.Thurisaz);
	});
});

// ─── Constants ───

describe("interaction rune constants", () => {
	it("tick interval matches signal tick (0.25s)", () => {
		expect(INTERACTION_TICK_INTERVAL).toBe(0.25);
	});

	it("Fehu pull radius is positive", () => {
		expect(FEHU_PULL_RADIUS).toBeGreaterThan(0);
	});

	it("Fehu pull speed is positive", () => {
		expect(FEHU_PULL_SPEED).toBeGreaterThan(0);
	});

	it("Ansuz detection radius is positive", () => {
		expect(ANSUZ_DETECT_RADIUS).toBeGreaterThan(0);
	});

	it("Ansuz emit strength is within signal range", () => {
		expect(ANSUZ_EMIT_STRENGTH).toBeGreaterThan(0);
		expect(ANSUZ_EMIT_STRENGTH).toBeLessThanOrEqual(15);
	});

	it("Ansuz cooldown is positive", () => {
		expect(ANSUZ_COOLDOWN).toBeGreaterThan(0);
	});

	it("Thurisaz damage radius is positive", () => {
		expect(THURISAZ_DAMAGE_RADIUS).toBeGreaterThan(0);
	});

	it("Thurisaz min signal is positive", () => {
		expect(THURISAZ_MIN_SIGNAL).toBeGreaterThan(0);
	});

	it("Thurisaz damage per strength is positive", () => {
		expect(THURISAZ_DAMAGE_PER_STRENGTH).toBeGreaterThan(0);
	});

	it("Thurisaz max damage is positive", () => {
		expect(THURISAZ_MAX_DAMAGE).toBeGreaterThan(0);
	});
});

// ─── isProtectionRune ───

describe("isProtectionRune", () => {
	it("recognizes Algiz", () => {
		expect(isProtectionRune(RuneId.Algiz)).toBe(true);
	});

	it("recognizes Mannaz", () => {
		expect(isProtectionRune(RuneId.Mannaz)).toBe(true);
	});

	it("recognizes Berkanan", () => {
		expect(isProtectionRune(RuneId.Berkanan)).toBe(true);
	});

	it("rejects interaction runes", () => {
		expect(isProtectionRune(RuneId.Jera)).toBe(false);
		expect(isProtectionRune(RuneId.Fehu)).toBe(false);
		expect(isProtectionRune(RuneId.Ansuz)).toBe(false);
		expect(isProtectionRune(RuneId.Thurisaz)).toBe(false);
	});

	it("rejects emitter runes", () => {
		expect(isProtectionRune(RuneId.Kenaz)).toBe(false);
		expect(isProtectionRune(RuneId.Sowilo)).toBe(false);
	});

	it("rejects None", () => {
		expect(isProtectionRune(RuneId.None)).toBe(false);
	});
});

// ─── PROTECTION_RUNE_IDS ───

describe("PROTECTION_RUNE_IDS", () => {
	it("contains exactly 3 runes", () => {
		expect(PROTECTION_RUNE_IDS).toHaveLength(3);
	});

	it("contains Algiz, Mannaz, Berkanan", () => {
		expect(PROTECTION_RUNE_IDS).toContain(RuneId.Algiz);
		expect(PROTECTION_RUNE_IDS).toContain(RuneId.Mannaz);
		expect(PROTECTION_RUNE_IDS).toContain(RuneId.Berkanan);
	});
});

// ─── Protection rune constants ───

describe("protection rune constants", () => {
	it("Algiz base radius is positive", () => {
		expect(ALGIZ_BASE_RADIUS).toBeGreaterThan(0);
	});

	it("Algiz max radius is greater than base", () => {
		expect(ALGIZ_MAX_RADIUS).toBeGreaterThan(ALGIZ_BASE_RADIUS);
	});

	it("Mannaz base radius is positive", () => {
		expect(MANNAZ_BASE_RADIUS).toBeGreaterThan(0);
	});

	it("Mannaz max radius is greater than base", () => {
		expect(MANNAZ_MAX_RADIUS).toBeGreaterThan(MANNAZ_BASE_RADIUS);
	});

	it("Berkanan base radius is positive", () => {
		expect(BERKANAN_BASE_RADIUS).toBeGreaterThan(0);
	});

	it("Berkanan max radius is greater than base", () => {
		expect(BERKANAN_MAX_RADIUS).toBeGreaterThan(BERKANAN_BASE_RADIUS);
	});

	it("Berkanan base multiplier is >= 1", () => {
		expect(BERKANAN_BASE_MULTIPLIER).toBeGreaterThanOrEqual(1.0);
	});

	it("Berkanan max multiplier is greater than base", () => {
		expect(BERKANAN_MAX_MULTIPLIER).toBeGreaterThan(BERKANAN_BASE_MULTIPLIER);
	});
});
