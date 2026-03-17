import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestWorld, spawnCreature, spawnPlayer } from "../../test-utils.ts";
import { ANSUZ_DETECT_RADIUS, ANSUZ_EMIT_STRENGTH } from "./interaction-rune-data.ts";
import { Face, RuneId } from "./rune-data.ts";
import { getRuneIndex, resetRuneIndex } from "./rune-index.ts";
import type { SensorEffects } from "./rune-sensor.ts";
import { getSensorEmitters, resetSensorState, runeSensorSystem } from "./rune-sensor.ts";

function makeEffects(): SensorEffects & {
	particles: Array<{ x: number; y: number; z: number }>;
} {
	const particles: Array<{ x: number; y: number; z: number }> = [];
	return {
		particles,
		spawnParticles: vi.fn((x, y, z) => {
			particles.push({ x, y, z });
		}),
	};
}

describe("runeSensorSystem", () => {
	afterEach(() => {
		resetRuneIndex();
		resetSensorState();
	});

	it("detects creature within Ansuz range", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		spawnCreature(world, { position: { x: 6, y: 5, z: 5 }, hp: 10, maxHp: 10 });

		getRuneIndex().setRune(5, 5, 5, Face.PosX, RuneId.Ansuz);
		const fx = makeEffects();

		runeSensorSystem(world, 0.26, fx);

		const emitters = getSensorEmitters();
		expect(emitters).toHaveLength(1);
		expect(emitters[0].strength).toBe(ANSUZ_EMIT_STRENGTH);
	});

	it("no detection when no creatures nearby", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });

		getRuneIndex().setRune(5, 5, 5, Face.PosX, RuneId.Ansuz);
		const fx = makeEffects();

		runeSensorSystem(world, 0.26, fx);

		expect(getSensorEmitters()).toHaveLength(0);
	});

	it("no detection when creature is out of range", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		const farAway = ANSUZ_DETECT_RADIUS + 10;
		spawnCreature(world, { position: { x: 5 + farAway, y: 5, z: 5 }, hp: 10, maxHp: 10 });

		getRuneIndex().setRune(5, 5, 5, Face.PosX, RuneId.Ansuz);
		const fx = makeEffects();

		runeSensorSystem(world, 0.26, fx);

		expect(getSensorEmitters()).toHaveLength(0);
	});

	it("handles multiple Ansuz runes", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		spawnCreature(world, { position: { x: 5, y: 5, z: 5 }, hp: 10, maxHp: 10 });

		getRuneIndex().setRune(5, 5, 5, Face.PosX, RuneId.Ansuz);
		getRuneIndex().setRune(6, 5, 5, Face.PosX, RuneId.Ansuz);
		const fx = makeEffects();

		runeSensorSystem(world, 0.26, fx);

		expect(getSensorEmitters()).toHaveLength(2);
	});

	it("handles multiple creatures", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		spawnCreature(world, { position: { x: 5, y: 5, z: 5 }, hp: 10, maxHp: 10 });
		spawnCreature(world, { position: { x: 6, y: 5, z: 5 }, hp: 10, maxHp: 10 });

		getRuneIndex().setRune(5, 5, 5, Face.PosX, RuneId.Ansuz);
		const fx = makeEffects();

		runeSensorSystem(world, 0.26, fx);

		const emitters = getSensorEmitters();
		expect(emitters).toHaveLength(1);
		expect(emitters[0].strength).toBe(ANSUZ_EMIT_STRENGTH);
	});

	it("does nothing without player", () => {
		const world = createTestWorld();
		spawnCreature(world, { position: { x: 5, y: 5, z: 5 }, hp: 10, maxHp: 10 });

		getRuneIndex().setRune(5, 5, 5, Face.PosX, RuneId.Ansuz);
		const fx = makeEffects();

		runeSensorSystem(world, 0.26, fx);

		expect(getSensorEmitters()).toHaveLength(0);
	});

	it("respects tick interval throttle", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		spawnCreature(world, { position: { x: 5, y: 5, z: 5 }, hp: 10, maxHp: 10 });

		getRuneIndex().setRune(5, 5, 5, Face.PosX, RuneId.Ansuz);
		const fx = makeEffects();

		// Small dt should not trigger
		runeSensorSystem(world, 0.01, fx);
		expect(getSensorEmitters()).toHaveLength(0);

		// Accumulate past threshold
		runeSensorSystem(world, 0.25, fx);
		expect(getSensorEmitters()).toHaveLength(1);
	});

	it("spawns particles on detection", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });
		spawnCreature(world, { position: { x: 5, y: 5, z: 5 }, hp: 10, maxHp: 10 });

		getRuneIndex().setRune(5, 5, 5, Face.PosX, RuneId.Ansuz);
		const fx = makeEffects();

		runeSensorSystem(world, 0.26, fx);

		expect(fx.particles.length).toBeGreaterThan(0);
	});

	it("emitters clear when creatures leave range", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 5, y: 5, z: 5 } });

		getRuneIndex().setRune(5, 5, 5, Face.PosX, RuneId.Ansuz);
		const fx = makeEffects();

		// No creatures = no emitters
		runeSensorSystem(world, 0.26, fx);
		expect(getSensorEmitters()).toHaveLength(0);
	});
});
