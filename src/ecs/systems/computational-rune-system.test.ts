import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import { BlockId } from "../../world/blocks.ts";
import {
	type ComputationalRuneEffects,
	computationalRuneSystem,
	getComputationalEmitters,
	resetComputationalRuneState,
} from "./computational-rune-system.ts";
import { emitterSystem, resetEmitterState } from "./emitter-system.ts";
import { INTERACTION_TICK_INTERVAL } from "./interaction-rune-data.ts";
import { Face, RuneId } from "./rune-data.ts";
import { getRuneIndex, resetRuneIndex } from "./rune-index.ts";
import { SIGNAL_TICK_INTERVAL, SignalType } from "./signal-data.ts";

function stoneWorld(): number {
	return BlockId.Stone;
}

function airWorld(): number {
	return BlockId.Air;
}

const _noopEffects: ComputationalRuneEffects = {
	spawnParticles: vi.fn(),
};

function makeEffects(): ComputationalRuneEffects {
	return { spawnParticles: vi.fn() };
}

afterEach(() => {
	resetRuneIndex();
	resetEmitterState();
	resetComputationalRuneState();
});

describe("computationalRuneSystem", () => {
	it("does not run before tick interval elapses", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Naudiz);

		computationalRuneSystem(world, INTERACTION_TICK_INTERVAL * 0.4, airWorld, makeEffects());
		expect(getComputationalEmitters()).toHaveLength(0);
	});

	it("clears emitters when no player exists", () => {
		const world = createTestWorld();
		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Naudiz);

		computationalRuneSystem(world, INTERACTION_TICK_INTERVAL, airWorld, makeEffects());
		expect(getComputationalEmitters()).toHaveLength(0);
	});

	it("clears emitters when no computational runes nearby", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });

		computationalRuneSystem(world, INTERACTION_TICK_INTERVAL, airWorld, makeEffects());
		expect(getComputationalEmitters()).toHaveLength(0);
	});

	it("Naudiz emits when no signal is present (NOT gate)", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Naudiz);

		const fx = makeEffects();
		computationalRuneSystem(world, INTERACTION_TICK_INTERVAL, airWorld, fx);

		const emitters = getComputationalEmitters();
		expect(emitters).toHaveLength(1);
		expect(emitters[0].signalType).toBe(SignalType.Force);
		expect(emitters[0].strength).toBe(5); // NAUDIZ_OUTPUT_STRENGTH
		expect(fx.spawnParticles).toHaveBeenCalled();
	});

	it("Naudiz is silent when signal is present (NOT gate inverts)", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const index = getRuneIndex();
		// Kenaz emits signal into block at (6,10,5); Naudiz at (6,10,5) receives it
		index.setRune(5, 10, 5, Face.PosX, RuneId.Kenaz);
		index.setRune(6, 10, 5, Face.PosX, RuneId.Naudiz);

		// Propagate signal through stone
		emitterSystem(world, SIGNAL_TICK_INTERVAL, stoneWorld, { spawnParticles: vi.fn() });

		const fx = makeEffects();
		computationalRuneSystem(world, INTERACTION_TICK_INTERVAL, stoneWorld, fx);

		const emitters = getComputationalEmitters();
		// Naudiz should be silent because it has signal input
		expect(emitters).toHaveLength(0);
	});

	it("Hagalaz AND gate opens with signals on 2 axes", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const index = getRuneIndex();
		// Two Kenaz emitters on different axes both sending signal to (6,10,6)
		index.setRune(5, 10, 6, Face.PosX, RuneId.Kenaz); // X axis signal
		index.setRune(6, 10, 5, Face.PosZ, RuneId.Kenaz); // Z axis signal
		// Hagalaz at (6,10,6) — adjacent to both signal sources
		index.setRune(6, 10, 6, Face.PosX, RuneId.Hagalaz);

		emitterSystem(world, SIGNAL_TICK_INTERVAL, stoneWorld, { spawnParticles: vi.fn() });

		const fx = makeEffects();
		computationalRuneSystem(world, INTERACTION_TICK_INTERVAL, stoneWorld, fx);

		const emitters = getComputationalEmitters();
		expect(emitters.length).toBeGreaterThan(0);
		expect(fx.spawnParticles).toHaveBeenCalled();
	});

	it("Isa delays signal by one tick", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const index = getRuneIndex();
		// Kenaz emits signal, Isa at (6,10,5) delays it
		index.setRune(5, 10, 5, Face.PosX, RuneId.Kenaz);
		index.setRune(6, 10, 5, Face.PosX, RuneId.Isa);

		emitterSystem(world, SIGNAL_TICK_INTERVAL, stoneWorld, { spawnParticles: vi.fn() });

		// Tick 1: Isa records input but no output yet (delay = 1 tick)
		const fx1 = makeEffects();
		computationalRuneSystem(world, INTERACTION_TICK_INTERVAL, stoneWorld, fx1);
		const emitters1 = getComputationalEmitters();
		expect(emitters1).toHaveLength(0);

		// Tick 2: Isa releases the delayed signal
		emitterSystem(world, SIGNAL_TICK_INTERVAL, stoneWorld, { spawnParticles: vi.fn() });
		const fx2 = makeEffects();
		computationalRuneSystem(world, INTERACTION_TICK_INTERVAL, stoneWorld, fx2);
		const emitters2 = getComputationalEmitters();
		expect(emitters2.length).toBeGreaterThan(0);
	});

	it("Isa on Crystal block delays by 2 ticks", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Kenaz);
		index.setRune(6, 10, 5, Face.PosX, RuneId.Isa);

		const crystalWorld = (x: number) => (x === 6 ? BlockId.Crystal : BlockId.Stone);
		emitterSystem(world, SIGNAL_TICK_INTERVAL, stoneWorld, { spawnParticles: vi.fn() });

		// Tick 1: records input
		computationalRuneSystem(world, INTERACTION_TICK_INTERVAL, crystalWorld, makeEffects());
		expect(getComputationalEmitters()).toHaveLength(0);

		// Tick 2: still delayed (crystal = 2 ticks)
		emitterSystem(world, SIGNAL_TICK_INTERVAL, stoneWorld, { spawnParticles: vi.fn() });
		computationalRuneSystem(world, INTERACTION_TICK_INTERVAL, crystalWorld, makeEffects());
		expect(getComputationalEmitters()).toHaveLength(0);

		// Tick 3: releases
		emitterSystem(world, SIGNAL_TICK_INTERVAL, stoneWorld, { spawnParticles: vi.fn() });
		computationalRuneSystem(world, INTERACTION_TICK_INTERVAL, crystalWorld, makeEffects());
		expect(getComputationalEmitters().length).toBeGreaterThan(0);
	});

	it("resetComputationalRuneState clears all state", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Naudiz);

		computationalRuneSystem(world, INTERACTION_TICK_INTERVAL, airWorld, makeEffects());
		expect(getComputationalEmitters().length).toBeGreaterThan(0);

		resetComputationalRuneState();
		expect(getComputationalEmitters()).toHaveLength(0);
	});
});
