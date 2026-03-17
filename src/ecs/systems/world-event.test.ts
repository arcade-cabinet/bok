import type { World } from "koota";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWorld, spawnCreature, spawnPlayer, spawnWorldTime } from "../../test-utils.ts";
import {
	AiType,
	AnimState,
	BehaviorState,
	CreatureAI,
	CreatureAnimation,
	NorrskenEvent,
	Species,
} from "../traits/index.ts";
import { EVENT_DURATION } from "./norrsken-event.ts";
import { getSurfacedResources, resetWorldEventState, worldEventSystem } from "./world-event.ts";

vi.mock("../../world/voxel-helpers.ts", () => ({
	getVoxelAt: (_x: number, y: number, _z: number) => {
		// Simulate solid ground at y <= 10
		if (y <= 10) return 1;
		return 0;
	},
	isBlockSolid: (blockId: number) => blockId > 0,
	setVoxelAt: vi.fn(),
}));

let world: World;

beforeEach(() => {
	world = createTestWorld();
	resetWorldEventState();
});

afterEach(() => {
	resetWorldEventState();
});

function spawnNorrsken(
	w: World,
	overrides?: Partial<{
		active: boolean;
		timer: number;
		dayTriggered: number;
		wasNight: boolean;
	}>,
) {
	return w.spawn(NorrskenEvent(overrides ?? {}));
}

// ─── Trigger Probability ───

describe("event triggering", () => {
	it("triggers on night entry when rng is below threshold", () => {
		spawnWorldTime(world, { timeOfDay: 0.6, dayCount: 1 });
		spawnPlayer(world);
		spawnNorrsken(world, { wasNight: false });

		worldEventSystem(world, 0.016, () => 0.01);

		world.query(NorrskenEvent).readEach(([ev]) => {
			expect(ev.active).toBe(true);
			expect(ev.timer).toBeCloseTo(EVENT_DURATION, 0);
			expect(ev.dayTriggered).toBe(1);
		});
	});

	it("does not trigger when rng is above threshold", () => {
		spawnWorldTime(world, { timeOfDay: 0.6, dayCount: 1 });
		spawnPlayer(world);
		spawnNorrsken(world, { wasNight: false });

		worldEventSystem(world, 0.016, () => 0.5);

		world.query(NorrskenEvent).readEach(([ev]) => {
			expect(ev.active).toBe(false);
		});
	});

	it("does not re-trigger same night (same dayCount)", () => {
		spawnWorldTime(world, { timeOfDay: 0.6, dayCount: 1 });
		spawnPlayer(world);
		spawnNorrsken(world, { wasNight: false, dayTriggered: 1 });

		worldEventSystem(world, 0.016, () => 0.01);

		world.query(NorrskenEvent).readEach(([ev]) => {
			expect(ev.active).toBe(false);
		});
	});

	it("does not trigger during day", () => {
		spawnWorldTime(world, { timeOfDay: 0.25, dayCount: 1 });
		spawnPlayer(world);
		spawnNorrsken(world, { wasNight: false });

		worldEventSystem(world, 0.016, () => 0.01);

		world.query(NorrskenEvent).readEach(([ev]) => {
			expect(ev.active).toBe(false);
		});
	});

	it("only triggers on night edge (wasNight transition)", () => {
		spawnWorldTime(world, { timeOfDay: 0.6, dayCount: 1 });
		spawnPlayer(world);
		spawnNorrsken(world, { wasNight: true });

		worldEventSystem(world, 0.016, () => 0.01);

		world.query(NorrskenEvent).readEach(([ev]) => {
			expect(ev.active).toBe(false);
		});
	});
});

// ─── Event Duration / Cleanup ───

describe("event duration and cleanup", () => {
	it("decrements timer each frame", () => {
		spawnWorldTime(world, { timeOfDay: 0.7, dayCount: 1 });
		spawnPlayer(world);
		spawnNorrsken(world, { active: true, timer: 30, wasNight: true });

		worldEventSystem(world, 1.0, () => 0.5);

		world.query(NorrskenEvent).readEach(([ev]) => {
			expect(ev.timer).toBeCloseTo(29);
		});
	});

	it("ends event when timer reaches 0", () => {
		spawnWorldTime(world, { timeOfDay: 0.7, dayCount: 1 });
		spawnPlayer(world);
		spawnNorrsken(world, { active: true, timer: 0.5, wasNight: true });

		worldEventSystem(world, 1.0, () => 0.5);

		world.query(NorrskenEvent).readEach(([ev]) => {
			expect(ev.active).toBe(false);
			expect(ev.timer).toBe(0);
		});
	});

	it("ends event when day arrives", () => {
		spawnWorldTime(world, { timeOfDay: 0.25, dayCount: 2 });
		spawnPlayer(world);
		spawnNorrsken(world, { active: true, timer: 30, wasNight: true });

		worldEventSystem(world, 0.016, () => 0.5);

		world.query(NorrskenEvent).readEach(([ev]) => {
			expect(ev.active).toBe(false);
		});
	});
});

// ─── Creature Pacification ───

describe("creature pacification", () => {
	it("forces all creatures to idle during active event", () => {
		spawnWorldTime(world, { timeOfDay: 0.7, dayCount: 1 });
		spawnPlayer(world);
		spawnNorrsken(world, { active: true, timer: 30, wasNight: true });

		const creature = spawnCreature(world, {
			species: Species.Morker,
			aiType: AiType.Hostile,
		});
		creature.set(CreatureAI, { behaviorState: BehaviorState.Chase });
		creature.set(CreatureAnimation, { animState: AnimState.Chase });

		worldEventSystem(world, 0.016, () => 0.5);

		expect(creature.get(CreatureAI).behaviorState).toBe(BehaviorState.Idle);
		expect(creature.get(CreatureAnimation).animState).toBe(AnimState.Idle);
	});

	it("pacifies all creature archetypes", () => {
		spawnWorldTime(world, { timeOfDay: 0.7, dayCount: 1 });
		spawnPlayer(world);
		spawnNorrsken(world, { active: true, timer: 30, wasNight: true });

		const hostile = spawnCreature(world, { species: Species.Morker, aiType: AiType.Hostile });
		const passive = spawnCreature(world, { species: Species.Lyktgubbe, aiType: AiType.Passive });
		const neutral = spawnCreature(world, { species: Species.Vittra, aiType: AiType.Neutral });

		hostile.set(CreatureAI, { behaviorState: BehaviorState.Attack });
		passive.set(CreatureAI, { behaviorState: BehaviorState.Flee });

		worldEventSystem(world, 0.016, () => 0.5);

		expect(hostile.get(CreatureAI).behaviorState).toBe(BehaviorState.Idle);
		expect(passive.get(CreatureAI).behaviorState).toBe(BehaviorState.Idle);
		expect(neutral.get(CreatureAI).behaviorState).toBe(BehaviorState.Idle);
	});

	it("does not pacify when event is inactive", () => {
		spawnWorldTime(world, { timeOfDay: 0.7, dayCount: 1 });
		spawnPlayer(world);
		spawnNorrsken(world, { active: false, wasNight: true });

		const creature = spawnCreature(world, { species: Species.Morker, aiType: AiType.Hostile });
		creature.set(CreatureAI, { behaviorState: BehaviorState.Chase });

		worldEventSystem(world, 0.016, () => 0.5);

		expect(creature.get(CreatureAI).behaviorState).toBe(BehaviorState.Chase);
	});
});

// ─── Resource Surfacing ───

describe("resource surfacing", () => {
	it("surfaces resources when event triggers", () => {
		spawnWorldTime(world, { timeOfDay: 0.6, dayCount: 1 });
		spawnPlayer(world, { position: { x: 50, y: 11, z: 50 } });
		spawnNorrsken(world, { wasNight: false });

		worldEventSystem(world, 0.016, () => 0.01);

		const resources = getSurfacedResources();
		expect(resources.length).toBeGreaterThan(0);
		expect(resources.length).toBeLessThanOrEqual(3);
	});

	it("cleans up resources when event ends by timer", () => {
		spawnWorldTime(world, { timeOfDay: 0.6, dayCount: 1 });
		spawnPlayer(world, { position: { x: 50, y: 11, z: 50 } });
		spawnNorrsken(world, { wasNight: false });

		// Trigger event
		worldEventSystem(world, 0.016, () => 0.01);
		expect(getSurfacedResources().length).toBeGreaterThan(0);

		// Fast-forward: set timer very low and tick
		world.query(NorrskenEvent).updateEach(([ev]) => {
			ev.timer = 0.01;
		});
		worldEventSystem(world, 0.1, () => 0.5);

		expect(getSurfacedResources()).toHaveLength(0);
	});

	it("places resources at surface + 1", () => {
		spawnWorldTime(world, { timeOfDay: 0.6, dayCount: 1 });
		spawnPlayer(world, { position: { x: 50, y: 11, z: 50 } });
		spawnNorrsken(world, { wasNight: false });

		worldEventSystem(world, 0.016, () => 0.01);

		const resources = getSurfacedResources();
		for (const r of resources) {
			// Mock ground is solid at y<=10, so surface=10, resource at y=11
			expect(r.y).toBe(11);
		}
	});
});

// ─── Visual Effects ───

describe("visual effects callbacks", () => {
	it("calls setAmbientTint during active event", () => {
		spawnWorldTime(world, { timeOfDay: 0.7, dayCount: 1 });
		spawnPlayer(world);
		spawnNorrsken(world, { active: true, timer: 30, wasNight: true });

		const tintCalls: Array<{ color: number; intensity: number }> = [];
		const effects = {
			spawnParticles: vi.fn(),
			setAmbientTint: (color: number, intensity: number) => {
				tintCalls.push({ color, intensity });
			},
		};

		worldEventSystem(world, 0.016, () => 0.5, effects);

		expect(tintCalls.length).toBeGreaterThan(0);
		expect(tintCalls[0].intensity).toBeGreaterThan(0);
	});

	it("resets tint when event ends", () => {
		spawnWorldTime(world, { timeOfDay: 0.7, dayCount: 1 });
		spawnPlayer(world);
		spawnNorrsken(world, { active: true, timer: 0.5, wasNight: true });

		const tintCalls: Array<{ color: number; intensity: number }> = [];
		const effects = {
			spawnParticles: vi.fn(),
			setAmbientTint: (color: number, intensity: number) => {
				tintCalls.push({ color, intensity });
			},
		};

		worldEventSystem(world, 1.0, () => 0.5, effects);

		const lastCall = tintCalls[tintCalls.length - 1];
		expect(lastCall.intensity).toBe(0);
	});
});
