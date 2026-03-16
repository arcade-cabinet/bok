import { describe, expect, it, vi } from "vitest";
import { AnimState, BehaviorState } from "../traits/index.ts";
import type { CreatureEffects } from "./creature-ai.ts";
import { updateMorkerAI } from "./creature-ai-hostile.ts";
import { _resetPackState, registerPack } from "./morker-pack.ts";

vi.mock("../../world/voxel-helpers.ts", () => ({
	getVoxelAt: () => 0,
	isBlockSolid: () => false,
}));

vi.mock("../../world/noise.ts", () => ({
	worldRng: () => 0.5,
	cosmeticRng: () => 0.5,
	initNoise: vi.fn(),
}));

function noopEffects(): CreatureEffects {
	return {
		spawnParticles: vi.fn(),
		onCreatureSpawned: vi.fn(),
		onCreatureDied: vi.fn(),
	};
}

function makePos(x = 0, y = 0, z = 0) {
	return { x, y, z };
}
function makeAi(overrides: Partial<ReturnType<typeof makeAi>> = {}) {
	return {
		aiType: "hostile",
		behaviorState: BehaviorState.Idle as number,
		aggroRange: 15,
		attackRange: 1.5,
		attackDamage: 15,
		attackCooldown: 0,
		moveSpeed: 2.5,
		...overrides,
	};
}
function makeHp(hp = 6) {
	return { hp, velY: 0 };
}
function makeAnim() {
	return { animState: AnimState.Idle as string };
}
function nightCtx(px = 0, py = 0, pz = 0) {
	return {
		playerX: px,
		playerY: py,
		playerZ: pz,
		playerAlive: true,
		isDaytime: false,
		timeOfDay: 0.75,
	};
}
const noGravity = () => {};
const noChase = () => {};

describe("updateMorkerAI — attack behavior", () => {
	it("attacks when within attack range", () => {
		_resetPackState();
		const pos = makePos(0, 0, 0);
		const ai = makeAi();
		const hp = makeHp();
		const anim = makeAnim();
		const dmg = vi.fn();

		updateMorkerAI(pos, ai, hp, anim, 1, 0.016, nightCtx(1, 0, 0), [], [], noGravity, noChase, dmg);

		expect(ai.behaviorState).toBe(BehaviorState.Attack);
		expect(anim.animState).toBe(AnimState.Attack);
		expect(dmg).toHaveBeenCalledWith(15);
	});

	it("respects attack cooldown", () => {
		_resetPackState();
		const ai = makeAi({ attackCooldown: 0.5 });
		const dmg = vi.fn();

		updateMorkerAI(makePos(), ai, makeHp(), makeAnim(), 1, 0.016, nightCtx(1, 0, 0), [], [], noGravity, noChase, dmg);

		expect(dmg).not.toHaveBeenCalled();
		expect(ai.attackCooldown).toBeLessThan(0.5);
	});

	it("does not attack dead player", () => {
		_resetPackState();
		const ai = makeAi();
		const dmg = vi.fn();
		const ctx = { ...nightCtx(1, 0, 0), playerAlive: false };

		updateMorkerAI(makePos(), ai, makeHp(), makeAnim(), 1, 0.016, ctx, [], [], noGravity, noChase, dmg);

		expect(ai.behaviorState).toBe(BehaviorState.Idle);
		expect(dmg).not.toHaveBeenCalled();
	});
});

describe("updateMorkerAI — chase behavior", () => {
	it("chases player within aggro range", () => {
		_resetPackState();
		const ai = makeAi({ aggroRange: 15 });
		const chase = vi.fn();

		updateMorkerAI(
			makePos(),
			ai,
			makeHp(),
			makeAnim(),
			1,
			0.016,
			nightCtx(10, 0, 0),
			[],
			[],
			noGravity,
			chase,
			vi.fn(),
		);

		expect(ai.behaviorState).toBe(BehaviorState.Chase);
		expect(chase).toHaveBeenCalled();
	});

	it("stays idle beyond aggro range", () => {
		_resetPackState();
		const ai = makeAi({ aggroRange: 15 });
		const chase = vi.fn();

		updateMorkerAI(
			makePos(),
			ai,
			makeHp(),
			makeAnim(),
			1,
			0.016,
			nightCtx(50, 0, 0),
			[],
			[],
			noGravity,
			chase,
			vi.fn(),
		);

		expect(ai.behaviorState).toBe(BehaviorState.Idle);
		expect(chase).not.toHaveBeenCalled();
	});
});

describe("updateMorkerAI — pack alpha/flanker", () => {
	it("alpha chases with speed multiplier", () => {
		_resetPackState();
		registerPack([1, 2, 3]);
		const chase = vi.fn();

		updateMorkerAI(
			makePos(),
			makeAi(),
			makeHp(),
			makeAnim(),
			1,
			0.016,
			nightCtx(10, 0, 0),
			[{ entityId: 1, x: 0, z: 0 }],
			[],
			noGravity,
			chase,
			vi.fn(),
		);

		expect(chase).toHaveBeenCalled();
		const speed = chase.mock.calls[0][5];
		expect(speed).toBeCloseTo(2.5 * 1.2, 1);
	});

	it("flanker moves toward flank position", () => {
		_resetPackState();
		registerPack([10, 20, 30]);
		const chase = vi.fn();

		updateMorkerAI(
			makePos(5, 0, 5),
			makeAi(),
			makeHp(),
			makeAnim(),
			20,
			0.016,
			nightCtx(10, 0, 0),
			[
				{ entityId: 10, x: 0, z: 0 },
				{ entityId: 20, x: 5, z: 5 },
			],
			[],
			noGravity,
			chase,
			vi.fn(),
		);

		expect(chase).toHaveBeenCalled();
	});
});

describe("updateMorkerAI — dawn dissolution", () => {
	it("takes extra damage during dawn", () => {
		_resetPackState();
		const hp = makeHp(20);

		updateMorkerAI(
			makePos(0, 0, 0),
			makeAi(),
			hp,
			makeAnim(),
			1,
			1.0,
			{ ...nightCtx(50, 0, 0), timeOfDay: 0.96 },
			[],
			[],
			noGravity,
			noChase,
			vi.fn(),
		);

		expect(hp.hp).toBeLessThan(20);
	});

	it("spawns particles on dawn damage", () => {
		_resetPackState();
		const effects = noopEffects();

		updateMorkerAI(
			makePos(),
			makeAi(),
			makeHp(20),
			makeAnim(),
			1,
			1.0,
			{ ...nightCtx(), timeOfDay: 0.96 },
			[],
			[],
			noGravity,
			noChase,
			vi.fn(),
			effects,
		);

		expect(effects.spawnParticles).toHaveBeenCalled();
	});
});
