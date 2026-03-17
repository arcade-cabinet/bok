import { afterEach, describe, expect, it, vi } from "vitest";
import type { SignalField } from "../../engine/runes/wavefront.ts";
import { createTestWorld, spawnCreature, spawnPlayer } from "../../test-utils.ts";
import { THURISAZ_DAMAGE_PER_STRENGTH, THURISAZ_MIN_SIGNAL } from "./interaction-rune-data.ts";
import type { CombatRuneEffects } from "./rune-combat-effects.ts";
import { resetCombatEffectsState, runeCombatEffectsSystem } from "./rune-combat-effects.ts";
import { Face, RuneId } from "./rune-data.ts";
import { getRuneIndex, resetRuneIndex } from "./rune-index.ts";

/** Build a minimal SignalField with given entries. */
function buildField(entries: Array<{ x: number; y: number; z: number; strength: number }>): SignalField {
	const field: SignalField = new Map();
	for (const e of entries) {
		field.set(`${e.x},${e.y},${e.z}`, { strength: e.strength, depth: 0, sources: new Set([0]) });
	}
	return field;
}

function makeEffects(): CombatRuneEffects & {
	damages: Array<{ entityId: number; damage: number }>;
	particles: Array<{ x: number; y: number; z: number }>;
} {
	const damages: Array<{ entityId: number; damage: number }> = [];
	const particles: Array<{ x: number; y: number; z: number }> = [];
	return {
		damages,
		particles,
		spawnParticles: vi.fn((x, y, z) => {
			particles.push({ x, y, z });
		}),
		damageCreature: vi.fn((entityId, damage) => {
			damages.push({ entityId, damage });
		}),
	};
}

describe("runeCombatEffectsSystem", () => {
	afterEach(() => {
		resetRuneIndex();
		resetCombatEffectsState();
	});

	it("does nothing without player", () => {
		const world = createTestWorld();
		const fx = makeEffects();
		const field = buildField([{ x: 5, y: 5, z: 5, strength: 10 }]);
		runeCombatEffectsSystem(world, 0.26, field, fx);
		expect(fx.damages).toHaveLength(0);
	});

	it("Thurisaz damages creature in range when powered", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		spawnCreature(world, { position: { x: 5, y: 5, z: 5 }, hp: 10, maxHp: 10 });

		getRuneIndex().setRune(5, 5, 5, Face.PosX, RuneId.Thurisaz);
		const strength = THURISAZ_MIN_SIGNAL + 2;
		const field = buildField([{ x: 5, y: 5, z: 5, strength }]);
		const fx = makeEffects();

		runeCombatEffectsSystem(world, 0.26, field, fx);
		expect(fx.damages.length).toBeGreaterThan(0);
		expect(fx.damages[0].damage).toBe(strength * THURISAZ_DAMAGE_PER_STRENGTH);
	});

	it("Thurisaz does not damage when signal below threshold", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		spawnCreature(world, { position: { x: 5, y: 5, z: 5 }, hp: 10, maxHp: 10 });

		getRuneIndex().setRune(5, 5, 5, Face.PosX, RuneId.Thurisaz);
		const field = buildField([{ x: 5, y: 5, z: 5, strength: THURISAZ_MIN_SIGNAL - 1 }]);
		const fx = makeEffects();

		runeCombatEffectsSystem(world, 0.26, field, fx);
		expect(fx.damages).toHaveLength(0);
	});

	it("Thurisaz does not damage creature out of range", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		spawnCreature(world, { position: { x: 50, y: 50, z: 50 }, hp: 10, maxHp: 10 });

		getRuneIndex().setRune(5, 5, 5, Face.PosX, RuneId.Thurisaz);
		const field = buildField([{ x: 5, y: 5, z: 5, strength: 10 }]);
		const fx = makeEffects();

		runeCombatEffectsSystem(world, 0.26, field, fx);
		expect(fx.damages).toHaveLength(0);
	});

	it("no damage when signal field is empty", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		spawnCreature(world, { position: { x: 5, y: 5, z: 5 }, hp: 10, maxHp: 10 });

		getRuneIndex().setRune(5, 5, 5, Face.PosX, RuneId.Thurisaz);
		const field: SignalField = new Map();
		const fx = makeEffects();

		runeCombatEffectsSystem(world, 0.26, field, fx);
		expect(fx.damages).toHaveLength(0);
	});

	it("respects tick interval throttle", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		spawnCreature(world, { position: { x: 5, y: 5, z: 5 }, hp: 10, maxHp: 10 });

		getRuneIndex().setRune(5, 5, 5, Face.PosX, RuneId.Thurisaz);
		const field = buildField([{ x: 5, y: 5, z: 5, strength: 10 }]);
		const fx = makeEffects();

		// Small dt should not trigger
		runeCombatEffectsSystem(world, 0.01, field, fx);
		expect(fx.damages).toHaveLength(0);

		// Accumulate past threshold
		runeCombatEffectsSystem(world, 0.25, field, fx);
		expect(fx.damages.length).toBeGreaterThan(0);
	});

	it("spawns particles on Thurisaz hit", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		spawnCreature(world, { position: { x: 5, y: 5, z: 5 }, hp: 10, maxHp: 10 });

		getRuneIndex().setRune(5, 5, 5, Face.PosX, RuneId.Thurisaz);
		const field = buildField([{ x: 5, y: 5, z: 5, strength: 10 }]);
		const fx = makeEffects();

		runeCombatEffectsSystem(world, 0.26, field, fx);
		expect(fx.particles.length).toBeGreaterThan(0);
	});
});
