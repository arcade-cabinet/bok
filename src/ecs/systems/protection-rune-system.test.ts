import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import { BlockId } from "../../world/blocks.ts";
import { emitterSystem, resetEmitterState } from "./emitter-system.ts";
import { INTERACTION_TICK_INTERVAL } from "./interaction-rune-data.ts";
import {
	getActiveCalmZones,
	getActiveGrowthZones,
	getActiveWards,
	type ProtectionRuneEffects,
	protectionRuneSystem,
	resetProtectionRuneState,
} from "./protection-rune-system.ts";
import { Face, RuneId } from "./rune-data.ts";
import { getRuneIndex, resetRuneIndex } from "./rune-index.ts";
import { SIGNAL_TICK_INTERVAL } from "./signal-data.ts";

function stoneWorld(): number {
	return BlockId.Stone;
}

function noopEffects(): ProtectionRuneEffects {
	return { spawnParticles: vi.fn() };
}

afterEach(() => {
	resetRuneIndex();
	resetEmitterState();
	resetProtectionRuneState();
});

describe("protectionRuneSystem", () => {
	it("does not run before tick interval elapses", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Algiz);

		protectionRuneSystem(world, INTERACTION_TICK_INTERVAL * 0.4, noopEffects());
		expect(getActiveWards()).toHaveLength(0);
	});

	it("returns early when no player exists", () => {
		const world = createTestWorld();
		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Algiz);

		protectionRuneSystem(world, INTERACTION_TICK_INTERVAL, noopEffects());
		expect(getActiveWards()).toHaveLength(0);
	});

	it("clears all zone caches when no runes nearby", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });

		protectionRuneSystem(world, INTERACTION_TICK_INTERVAL, noopEffects());
		expect(getActiveWards()).toHaveLength(0);
		expect(getActiveCalmZones()).toHaveLength(0);
		expect(getActiveGrowthZones()).toHaveLength(0);
	});

	it("Algiz creates ward zones with base radius", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Algiz);

		protectionRuneSystem(world, INTERACTION_TICK_INTERVAL, noopEffects());
		const wards = getActiveWards();
		expect(wards).toHaveLength(1);
		expect(wards[0].x).toBeCloseTo(5.5);
		expect(wards[0].y).toBeCloseTo(10.5);
		expect(wards[0].z).toBeCloseTo(5.5);
		// Base radius = 3 (ALGIZ_BASE_RADIUS) when no signal
		expect(wards[0].radius).toBe(3);
	});

	it("Algiz ward radius increases with signal strength", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const index = getRuneIndex();
		// Kenaz for signal, Algiz receives it
		index.setRune(4, 10, 5, Face.PosX, RuneId.Kenaz);
		index.setRune(5, 10, 5, Face.PosX, RuneId.Algiz);

		// Propagate signal through stone
		emitterSystem(world, SIGNAL_TICK_INTERVAL, stoneWorld, { spawnParticles: vi.fn() });

		protectionRuneSystem(world, INTERACTION_TICK_INTERVAL, noopEffects());
		const wards = getActiveWards();
		expect(wards).toHaveLength(1);
		expect(wards[0].radius).toBeGreaterThan(3);
	});

	it("Mannaz creates calm zones", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Mannaz);

		protectionRuneSystem(world, INTERACTION_TICK_INTERVAL, noopEffects());
		const calms = getActiveCalmZones();
		expect(calms).toHaveLength(1);
		expect(calms[0].x).toBeCloseTo(5.5);
		// Base radius = 4 (MANNAZ_BASE_RADIUS)
		expect(calms[0].radius).toBe(4);
	});

	it("Berkanan creates growth zones with multiplier", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Berkanan);

		protectionRuneSystem(world, INTERACTION_TICK_INTERVAL, noopEffects());
		const zones = getActiveGrowthZones();
		expect(zones).toHaveLength(1);
		expect(zones[0].x).toBeCloseTo(5.5);
		// Base radius = 3 (BERKANAN_BASE_RADIUS)
		expect(zones[0].radius).toBe(3);
		// Base multiplier = 1.5 (BERKANAN_BASE_MULTIPLIER)
		expect(zones[0].multiplier).toBe(1.5);
	});

	it("spawns ward boundary particles at reduced frequency", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Algiz);

		const fx = { spawnParticles: vi.fn() };

		// First tick at 0.25s — below 1.0s particle interval
		protectionRuneSystem(world, INTERACTION_TICK_INTERVAL, fx);
		expect(fx.spawnParticles).not.toHaveBeenCalled();

		// Tick 4 more times (0.25 * 4 = 1.0s total) to cross particle threshold
		for (let i = 0; i < 3; i++) {
			protectionRuneSystem(world, INTERACTION_TICK_INTERVAL, fx);
		}
		expect(fx.spawnParticles).toHaveBeenCalled();
	});

	it("resetProtectionRuneState clears all cached zones", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Algiz);
		index.setRune(6, 10, 5, Face.PosX, RuneId.Mannaz);
		index.setRune(7, 10, 5, Face.PosX, RuneId.Berkanan);

		protectionRuneSystem(world, INTERACTION_TICK_INTERVAL, noopEffects());
		expect(getActiveWards().length).toBeGreaterThan(0);

		resetProtectionRuneState();
		expect(getActiveWards()).toHaveLength(0);
		expect(getActiveCalmZones()).toHaveLength(0);
		expect(getActiveGrowthZones()).toHaveLength(0);
	});
});
