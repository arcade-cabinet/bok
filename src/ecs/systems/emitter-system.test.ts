import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import { BlockId } from "../../world/blocks.ts";
import { hexToNumber, KENAZ_GLOW, SOWILO_GLOW } from "./emitter-runes.ts";
import {
	collectEmitters,
	emitterSystem,
	getActiveEmitters,
	getSignalMap,
	resetEmitterState,
} from "./emitter-system.ts";
import { Face, RuneId } from "./rune-data.ts";
import { getRuneIndex, resetRuneIndex } from "./rune-index.ts";
import { SIGNAL_TICK_INTERVAL, SignalType } from "./signal-data.ts";
import { getSignalStrength } from "./signal-propagation.ts";

// ─── Helpers ───

function stoneWorld(_x: number, _y: number, _z: number): number {
	return BlockId.Stone;
}

function airWorld(_x: number, _y: number, _z: number): number {
	return BlockId.Air;
}

const noopEffects = {
	spawnParticles: vi.fn(),
};

afterEach(() => {
	resetRuneIndex();
	resetEmitterState();
});

// ─── collectEmitters ───

describe("collectEmitters", () => {
	it("returns empty array when no emitter runes exist", () => {
		const result = collectEmitters(0, 0);
		expect(result).toHaveLength(0);
	});

	it("collects Kenaz rune as Heat emitter", () => {
		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Kenaz);

		const result = collectEmitters(0, 0);
		expect(result).toHaveLength(1);
		expect(result[0].emitter.signalType).toBe(SignalType.Heat);
		expect(result[0].emitter.strength).toBe(10);
		expect(result[0].emitter.face).toBe(Face.PosX);
		expect(result[0].emitter.x).toBe(5);
		expect(result[0].emitter.y).toBe(10);
		expect(result[0].emitter.z).toBe(5);
	});

	it("collects Sowilo rune as Light emitter", () => {
		const index = getRuneIndex();
		index.setRune(3, 8, 3, Face.NegZ, RuneId.Sowilo);

		const result = collectEmitters(0, 0);
		expect(result).toHaveLength(1);
		expect(result[0].emitter.signalType).toBe(SignalType.Light);
		expect(result[0].emitter.strength).toBe(10);
		expect(result[0].emitter.face).toBe(Face.NegZ);
	});

	it("includes glow color for particles", () => {
		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Kenaz);
		index.setRune(6, 10, 5, Face.PosX, RuneId.Sowilo);

		const result = collectEmitters(0, 0);
		expect(result).toHaveLength(2);

		const kenaz = result.find((r) => r.emitter.signalType === SignalType.Heat);
		const sowilo = result.find((r) => r.emitter.signalType === SignalType.Light);
		expect(kenaz?.glowColorNum).toBe(hexToNumber(KENAZ_GLOW));
		expect(sowilo?.glowColorNum).toBe(hexToNumber(SOWILO_GLOW));
	});

	it("ignores non-emitter runes", () => {
		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Fehu);
		index.setRune(6, 10, 5, Face.PosX, RuneId.Algiz);
		index.setRune(7, 10, 5, Face.PosX, RuneId.Isa);

		const result = collectEmitters(0, 0);
		expect(result).toHaveLength(0);
	});

	it("collects multiple emitters from different chunks", () => {
		const index = getRuneIndex();
		// Chunk (0,0)
		index.setRune(5, 10, 5, Face.PosX, RuneId.Kenaz);
		// Chunk (1,0) — block at x=20
		index.setRune(20, 10, 5, Face.NegX, RuneId.Sowilo);

		const result = collectEmitters(0, 0);
		expect(result).toHaveLength(2);
	});

	it("does not collect from chunks outside scan radius", () => {
		const index = getRuneIndex();
		// Chunk (10, 10) — well outside radius 3
		index.setRune(160, 10, 160, Face.PosX, RuneId.Kenaz);

		const result = collectEmitters(0, 0);
		expect(result).toHaveLength(0);
	});
});

// ─── emitterSystem ───

describe("emitterSystem", () => {
	it("does not run before tick interval elapses", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });

		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Kenaz);

		// Small dt — under tick interval
		emitterSystem(world, SIGNAL_TICK_INTERVAL * 0.5, stoneWorld, noopEffects);
		expect(getActiveEmitters()).toHaveLength(0);
	});

	it("runs propagation after tick interval", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });

		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Kenaz);

		emitterSystem(world, SIGNAL_TICK_INTERVAL, stoneWorld, noopEffects);
		expect(getActiveEmitters()).toHaveLength(1);
		expect(getSignalMap().size).toBeGreaterThan(0);
	});

	it("Kenaz emits Heat signal at strength 10", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });

		const index = getRuneIndex();
		// Kenaz at (5,10,5) facing PosX → signal enters (6,10,5)
		index.setRune(5, 10, 5, Face.PosX, RuneId.Kenaz);

		emitterSystem(world, SIGNAL_TICK_INTERVAL, stoneWorld, noopEffects);
		const map = getSignalMap();
		expect(getSignalStrength(map, 6, 10, 5, SignalType.Heat)).toBe(10);
	});

	it("Sowilo emits Light signal at strength 10", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });

		const index = getRuneIndex();
		// Sowilo at (5,10,5) facing PosZ → signal enters (5,10,6)
		index.setRune(5, 10, 5, Face.PosZ, RuneId.Sowilo);

		emitterSystem(world, SIGNAL_TICK_INTERVAL, stoneWorld, noopEffects);
		const map = getSignalMap();
		expect(getSignalStrength(map, 5, 10, 6, SignalType.Light)).toBe(10);
	});

	it("signal propagates through conductors and attenuates", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });

		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Kenaz);

		emitterSystem(world, SIGNAL_TICK_INTERVAL, stoneWorld, noopEffects);
		const map = getSignalMap();

		// Attenuates by 1 per block
		expect(getSignalStrength(map, 6, 10, 5, SignalType.Heat)).toBe(10);
		expect(getSignalStrength(map, 7, 10, 5, SignalType.Heat)).toBe(9);
		expect(getSignalStrength(map, 8, 10, 5, SignalType.Heat)).toBe(8);
	});

	it("signal does not propagate through air", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });

		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Kenaz);

		emitterSystem(world, SIGNAL_TICK_INTERVAL, airWorld, noopEffects);
		const map = getSignalMap();
		expect(getSignalStrength(map, 6, 10, 5, SignalType.Heat)).toBe(0);
	});

	it("spawns particles at emitter face on tick", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const effects = { spawnParticles: vi.fn() };

		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Kenaz);

		emitterSystem(world, SIGNAL_TICK_INTERVAL, stoneWorld, effects);

		expect(effects.spawnParticles).toHaveBeenCalledTimes(1);
		// Particle at face exit: (5+0.5+0.5, 10+0.5+0, 5+0.5+0) = (6, 10.5, 5.5)
		expect(effects.spawnParticles).toHaveBeenCalledWith(6, 10.5, 5.5, hexToNumber(KENAZ_GLOW), 2);
	});

	it("spawns particles for both Kenaz and Sowilo", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const effects = { spawnParticles: vi.fn() };

		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Kenaz);
		index.setRune(6, 10, 5, Face.NegX, RuneId.Sowilo);

		emitterSystem(world, SIGNAL_TICK_INTERVAL, stoneWorld, effects);
		expect(effects.spawnParticles).toHaveBeenCalledTimes(2);
	});

	it("clears signal map when no emitters present", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });

		emitterSystem(world, SIGNAL_TICK_INTERVAL, stoneWorld, noopEffects);
		expect(getSignalMap().size).toBe(0);
		expect(getActiveEmitters()).toHaveLength(0);
	});

	it("clears signal map when no player present", () => {
		const world = createTestWorld();
		// No player spawned

		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Kenaz);

		emitterSystem(world, SIGNAL_TICK_INTERVAL, stoneWorld, noopEffects);
		expect(getSignalMap().size).toBe(0);
		expect(getActiveEmitters()).toHaveLength(0);
	});

	it("resetEmitterState clears cached data", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });

		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Kenaz);

		emitterSystem(world, SIGNAL_TICK_INTERVAL, stoneWorld, noopEffects);
		expect(getActiveEmitters()).toHaveLength(1);

		resetEmitterState();
		expect(getActiveEmitters()).toHaveLength(0);
		expect(getSignalMap().size).toBe(0);
	});
});
