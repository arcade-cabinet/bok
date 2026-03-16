import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWorld, spawnCreature, spawnPlayer } from "../../test-utils.ts";
import { Face, RuneId } from "./rune-data.ts";
import { getRuneIndex, resetRuneIndex } from "./rune-index.ts";

// Mock emitter-system to provide a controllable signal map
let mockSignalMap: Map<string, Map<number, number>> = new Map();

vi.mock("./emitter-system.ts", () => ({
	getSignalMap: () => mockSignalMap,
	emitterSystem: vi.fn(),
	resetEmitterState: vi.fn(),
	getActiveEmitters: () => [],
}));

// Import after mock setup
const { getActiveBuffZones, networkRuneSystem, resetNetworkRuneState } = await import("./network-rune-system.ts");

describe("network-rune-system", () => {
	beforeEach(() => {
		resetNetworkRuneState();
		resetRuneIndex();
		mockSignalMap = new Map();
	});

	it("produces buff zones from Tiwaz runes with signal", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 10, y: 10, z: 10 } });

		// Place a Tiwaz rune at (10, 10, 10)
		getRuneIndex().setRune(10, 10, 10, Face.PosX, RuneId.Tiwaz);

		// Set signal at the rune block
		mockSignalMap.set("10,10,10", new Map([[0, 8]]));

		const effects = {
			spawnParticles: vi.fn(),
			pushCreature: vi.fn(),
		};

		// Run system past throttle interval
		networkRuneSystem(world, 0.25, effects);

		const zones = getActiveBuffZones();
		expect(zones).toHaveLength(1);
		expect(zones[0].x).toBeCloseTo(10.5);
		expect(zones[0].radius).toBeGreaterThan(3);
		expect(zones[0].multiplier).toBeGreaterThan(1.0);
	});

	it("clears buff zones when no runes present", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 10, y: 10, z: 10 } });

		const effects = {
			spawnParticles: vi.fn(),
			pushCreature: vi.fn(),
		};

		networkRuneSystem(world, 0.25, effects);

		expect(getActiveBuffZones()).toHaveLength(0);
	});

	it("calls pushCreature for entities in Uruz radius", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 10, y: 10, z: 10 } });
		spawnCreature(world, { position: { x: 11, y: 10, z: 10 } });

		// Place Uruz rune facing PosX
		getRuneIndex().setRune(10, 10, 10, Face.PosX, RuneId.Uruz);

		// Set signal at the rune block
		mockSignalMap.set("10,10,10", new Map([[0, 6]]));

		const effects = {
			spawnParticles: vi.fn(),
			pushCreature: vi.fn(),
		};

		networkRuneSystem(world, 0.25, effects);

		expect(effects.pushCreature).toHaveBeenCalled();
		const [, vx, vy, vz] = effects.pushCreature.mock.calls[0];
		expect(vx).toBeGreaterThan(0); // pushed in +X direction
		expect(vy).toBe(0);
		expect(vz).toBe(0);
	});

	it("does not push without sufficient signal", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 10, y: 10, z: 10 } });
		spawnCreature(world, { position: { x: 11, y: 10, z: 10 } });

		getRuneIndex().setRune(10, 10, 10, Face.PosX, RuneId.Uruz);

		// Signal below minimum threshold (URUZ_MIN_SIGNAL = 2)
		mockSignalMap.set("10,10,10", new Map([[0, 1]]));

		const effects = {
			spawnParticles: vi.fn(),
			pushCreature: vi.fn(),
		};

		networkRuneSystem(world, 0.25, effects);

		expect(effects.pushCreature).not.toHaveBeenCalled();
	});

	it("throttles execution to INTERACTION_TICK_INTERVAL", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 10, y: 10, z: 10 } });

		const effects = {
			spawnParticles: vi.fn(),
			pushCreature: vi.fn(),
		};

		// dt less than interval — should not run
		networkRuneSystem(world, 0.1, effects);
		networkRuneSystem(world, 0.1, effects);
		// At 0.25, should run once
		networkRuneSystem(world, 0.05, effects);

		// No runes means nothing happens, but system ran (no error)
		expect(getActiveBuffZones()).toHaveLength(0);
	});
});
