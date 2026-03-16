import { describe, expect, it, vi } from "vitest";
import { AnimState, BehaviorState } from "../traits/index.ts";
import { cleanupPassiveState, getTranaState, updateSkogssniglarAI, updateTranaAI } from "./creature-ai-passive.ts";

vi.mock("../../world/voxel-helpers.ts", () => ({
	getVoxelAt: () => 0,
	isBlockSolid: () => false,
}));

vi.mock("../../world/noise.ts", () => ({
	worldRng: () => 0.5,
	cosmeticRng: () => 0.5,
	initNoise: vi.fn(),
}));

function makePos(x = 0, y = 10, z = 0) {
	return { x, y, z };
}
function makeAi(overrides: Partial<ReturnType<typeof makeAi>> = {}) {
	return {
		detectionRange: 4,
		moveSpeed: 0.4,
		behaviorState: BehaviorState.Idle as number,
		...overrides,
	};
}
function makeHp(hp = 8) {
	return { hp, velY: 0 };
}
function makeAnim() {
	return { animState: AnimState.Idle as string, animTimer: 0 };
}
function makeEntity(id: number) {
	return { id: () => id };
}
const noGravity = () => {};

describe("updateSkogssniglarAI — snail behavior", () => {
	it("starts wandering when far from player", () => {
		const pos = makePos();
		const ai = makeAi();
		const anim = makeAnim();

		updateSkogssniglarAI(
			pos,
			ai,
			makeHp(),
			anim,
			makeEntity(100),
			0.5,
			{ playerX: 50, playerY: 0, playerZ: 50 },
			noGravity,
		);

		expect(anim.animState).toBe(AnimState.Walk);
	});

	it("increments animation timer each update", () => {
		const anim = makeAnim();
		const dt = 0.25;

		updateSkogssniglarAI(
			makePos(),
			makeAi(),
			makeHp(),
			anim,
			makeEntity(101),
			dt,
			{ playerX: 50, playerY: 0, playerZ: 50 },
			noGravity,
		);

		expect(anim.animTimer).toBeCloseTo(dt);
	});

	it("applies gravity each frame", () => {
		const gravity = vi.fn();

		updateSkogssniglarAI(
			makePos(),
			makeAi(),
			makeHp(),
			makeAnim(),
			makeEntity(102),
			0.016,
			{ playerX: 50, playerY: 0, playerZ: 50 },
			gravity,
		);

		expect(gravity).toHaveBeenCalledOnce();
	});

	it("moves snail position during wander on first frame", () => {
		cleanupPassiveState(110);
		const pos = makePos(10, 10, 10);

		updateSkogssniglarAI(
			pos,
			makeAi(),
			makeHp(),
			makeAnim(),
			makeEntity(110),
			0.5,
			{ playerX: 100, playerY: 0, playerZ: 100 },
			noGravity,
		);

		// Snail default wanderDirX=1, so pos.x increases by wanderSpeed*dt
		expect(pos.x).toBeGreaterThan(10);
	});

	it("keeps behavior state as Idle (snails are always passive)", () => {
		const ai = makeAi();

		updateSkogssniglarAI(
			makePos(),
			ai,
			makeHp(),
			makeAnim(),
			makeEntity(104),
			0.5,
			{ playerX: 2, playerY: 0, playerZ: 0 },
			noGravity,
		);

		expect(ai.behaviorState).toBe(BehaviorState.Idle);
	});
});

describe("updateTranaAI — crane behavior", () => {
	it("flees when player is within flee range", () => {
		cleanupPassiveState(210);
		const pos = makePos(0, 10, 0);
		const ai = makeAi({ detectionRange: 10 });
		const anim = makeAnim();

		// Player 3 blocks away on XZ plane — well within FLEE_RANGE of 10
		updateTranaAI(
			pos,
			ai,
			makeHp(4),
			anim,
			makeEntity(210),
			0.5,
			{ playerX: 3, playerY: 10, playerZ: 0 },
			[],
			noGravity,
		);

		expect(ai.behaviorState).toBe(BehaviorState.Flee);
		expect(anim.animState).toBe(AnimState.Flee);
	});

	it("wades when player is far away", () => {
		const ai = makeAi({ detectionRange: 10, moveSpeed: 0.6 });
		const anim = makeAnim();

		updateTranaAI(
			makePos(),
			ai,
			makeHp(4),
			anim,
			makeEntity(201),
			0.5,
			{ playerX: 100, playerY: 0, playerZ: 100 },
			[],
			noGravity,
		);

		expect(ai.behaviorState).toBe(BehaviorState.Idle);
		expect(anim.animState).toBe(AnimState.Walk);
	});

	it("applies gravity during wade", () => {
		const gravity = vi.fn();

		updateTranaAI(
			makePos(),
			makeAi(),
			makeHp(4),
			makeAnim(),
			makeEntity(202),
			0.016,
			{ playerX: 100, playerY: 0, playerZ: 100 },
			[],
			gravity,
		);

		expect(gravity).toHaveBeenCalledOnce();
	});

	it("increments animation timer each frame", () => {
		const anim = makeAnim();
		updateTranaAI(
			makePos(),
			makeAi(),
			makeHp(4),
			anim,
			makeEntity(203),
			0.5,
			{ playerX: 100, playerY: 0, playerZ: 100 },
			[],
			noGravity,
		);
		expect(anim.animTimer).toBeCloseTo(0.5);
	});
});

describe("cleanupPassiveState", () => {
	it("removes per-entity state without error", () => {
		expect(() => cleanupPassiveState(999)).not.toThrow();
	});

	it("getTranaState returns undefined after cleanup", () => {
		const pos = makePos();
		updateTranaAI(
			pos,
			makeAi(),
			makeHp(4),
			makeAnim(),
			makeEntity(300),
			0.5,
			{ playerX: 100, playerY: 0, playerZ: 100 },
			[],
			noGravity,
		);
		expect(getTranaState(300)).toBeDefined();

		cleanupPassiveState(300);
		expect(getTranaState(300)).toBeUndefined();
	});
});
