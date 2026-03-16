import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestWorld, spawnCreature, spawnPlayer } from "../../test-utils.ts";
import { BlockId } from "../../world/blocks.ts";
import { emitterSystem, resetEmitterState } from "./emitter-system.ts";
import { INTERACTION_TICK_INTERVAL } from "./interaction-rune-data.ts";
import {
	getAnsuzEmitters,
	type InteractionRuneEffects,
	interactionRuneSystem,
	resetInteractionRuneState,
} from "./interaction-rune-system.ts";
import { Face, RuneId } from "./rune-data.ts";
import { getRuneIndex, resetRuneIndex } from "./rune-index.ts";
import { SIGNAL_TICK_INTERVAL, SignalType } from "./signal-data.ts";

function stoneWorld(): number {
	return BlockId.Stone;
}

function makeEffects(): InteractionRuneEffects & {
	damages: Array<{ entityId: number; damage: number }>;
	particles: Array<{ x: number; y: number; z: number }>;
	moved: Array<{ index: number }>;
	collected: boolean[];
	spawned: Array<{ itemId: number; qty: number }>;
} {
	const damages: Array<{ entityId: number; damage: number }> = [];
	const particles: Array<{ x: number; y: number; z: number }> = [];
	const moved: Array<{ index: number }> = [];
	const collected: boolean[] = [];
	const spawned: Array<{ itemId: number; qty: number }> = [];
	return {
		damages,
		particles,
		moved,
		collected,
		spawned,
		spawnItemDrop: vi.fn((_x, _y, _z, itemId, qty) => {
			spawned.push({ itemId, qty });
		}),
		collectNearbyItem: vi.fn(() => {
			collected.push(true);
			return true;
		}),
		spawnParticles: vi.fn((x, y, z) => {
			particles.push({ x, y, z });
		}),
		damageCreature: vi.fn((entityId, damage) => {
			damages.push({ entityId, damage });
		}),
		getItemDropsNear: vi.fn(() => []),
		moveItemDrop: vi.fn((index) => {
			moved.push({ index });
		}),
	};
}

afterEach(() => {
	resetRuneIndex();
	resetEmitterState();
	resetInteractionRuneState();
});

describe("interactionRuneSystem", () => {
	it("does not run before tick interval elapses", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const fx = makeEffects();

		interactionRuneSystem(world, INTERACTION_TICK_INTERVAL * 0.4, fx);
		expect(fx.spawnParticles).not.toHaveBeenCalled();
	});

	it("returns early when no player exists", () => {
		const world = createTestWorld();
		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Fehu);
		const fx = makeEffects();

		interactionRuneSystem(world, INTERACTION_TICK_INTERVAL, fx);
		expect(fx.spawnParticles).not.toHaveBeenCalled();
	});

	it("clears ansuz emitters when no runes nearby", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const fx = makeEffects();

		interactionRuneSystem(world, INTERACTION_TICK_INTERVAL, fx);
		expect(getAnsuzEmitters()).toHaveLength(0);
	});

	it("Fehu pulls nearby items toward the rune", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Fehu);

		const fx = makeEffects();
		fx.getItemDropsNear = vi.fn(() => [{ x: 8, y: 10, z: 5, itemId: BlockId.IronOre, qty: 1, index: 0 }]);

		interactionRuneSystem(world, INTERACTION_TICK_INTERVAL, fx);
		expect(fx.moveItemDrop).toHaveBeenCalled();
	});

	it("Fehu spawns particles when item is at collect distance", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Fehu);

		const fx = makeEffects();
		// Item very close to rune center (5.5, 10.5, 5.5)
		fx.getItemDropsNear = vi.fn(() => [{ x: 5.5, y: 10.5, z: 5.5, itemId: BlockId.Sand, qty: 1, index: 0 }]);

		interactionRuneSystem(world, INTERACTION_TICK_INTERVAL, fx);
		expect(fx.spawnParticles).toHaveBeenCalled();
		expect(fx.moveItemDrop).not.toHaveBeenCalled();
	});

	it("Ansuz detects nearby creatures and creates emitters", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		spawnCreature(world, { position: { x: 8, y: 10, z: 5 } });

		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Ansuz);
		const fx = makeEffects();

		interactionRuneSystem(world, INTERACTION_TICK_INTERVAL, fx);
		const emitters = getAnsuzEmitters();
		expect(emitters.length).toBeGreaterThan(0);
		expect(emitters[0].signalType).toBe(SignalType.Detection);
	});

	it("Ansuz produces no emitters when no creatures nearby", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });

		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Ansuz);
		const fx = makeEffects();

		interactionRuneSystem(world, INTERACTION_TICK_INTERVAL, fx);
		expect(getAnsuzEmitters()).toHaveLength(0);
	});

	it("Thurisaz damages creatures within radius when signal present", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		spawnCreature(world, { position: { x: 6, y: 10, z: 5 } });

		const index = getRuneIndex();
		// Kenaz for signal, Thurisaz to receive it
		index.setRune(5, 10, 5, Face.PosX, RuneId.Kenaz);
		index.setRune(6, 10, 5, Face.PosX, RuneId.Thurisaz);

		// Propagate signal first
		emitterSystem(world, SIGNAL_TICK_INTERVAL, stoneWorld, { spawnParticles: vi.fn() });

		const fx = makeEffects();
		interactionRuneSystem(world, INTERACTION_TICK_INTERVAL, fx);
		expect(fx.damageCreature).toHaveBeenCalled();
		expect(fx.damages[0].damage).toBeGreaterThan(0);
	});

	it("Thurisaz does not damage when no signal present", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		spawnCreature(world, { position: { x: 6, y: 10, z: 5 } });

		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Thurisaz);

		const fx = makeEffects();
		interactionRuneSystem(world, INTERACTION_TICK_INTERVAL, fx);
		expect(fx.damageCreature).not.toHaveBeenCalled();
	});

	it("resetInteractionRuneState clears cached state", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 10, z: 5 } });
		spawnCreature(world, { position: { x: 8, y: 10, z: 5 } });

		const index = getRuneIndex();
		index.setRune(5, 10, 5, Face.PosX, RuneId.Ansuz);
		const fx = makeEffects();

		interactionRuneSystem(world, INTERACTION_TICK_INTERVAL, fx);
		expect(getAnsuzEmitters().length).toBeGreaterThan(0);

		resetInteractionRuneState();
		expect(getAnsuzEmitters()).toHaveLength(0);
	});
});
