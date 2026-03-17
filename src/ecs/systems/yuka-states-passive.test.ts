import { afterEach, describe, expect, test } from "vitest";
import { StateMachine, Vehicle } from "yuka";
import { AnimState, BehaviorState } from "../traits/index.ts";
import { resetVehiclePool } from "./yuka-bridge.ts";
import type { SnailFsmContext, TranaFsmContext } from "./yuka-states-passive.ts";
import {
	registerSnailStates,
	registerTranaStates,
	SnailGrazeState,
	SnailRetractState,
	TranaFlockFleeState,
	TranaWadeState,
} from "./yuka-states-passive.ts";

afterEach(() => {
	resetVehiclePool();
});

function makeSnailCtx(overrides?: Partial<SnailFsmContext>): SnailFsmContext {
	const vehicle = new Vehicle();
	const ctx: SnailFsmContext = {
		entityId: 1,
		vehicle,
		fsm: null as unknown as StateMachine<SnailFsmContext>,
		distToPlayer: 20,
		playerX: 10,
		playerY: 0,
		playerZ: 10,
		playerAlive: true,
		aggroRange: 15,
		attackRange: 1.5,
		attackDamage: 0,
		moveSpeed: 0.5,
		attackCooldown: 0,
		behaviorState: BehaviorState.Idle,
		animState: AnimState.Idle,
		isOnGrass: false,
		retractTimer: 0,
		grazeTimer: 0,
		...overrides,
	};
	const fsm = new StateMachine(ctx);
	ctx.fsm = fsm;
	registerSnailStates(fsm);
	return ctx;
}

function makeTranaCtx(overrides?: Partial<TranaFsmContext>): TranaFsmContext {
	const vehicle = new Vehicle();
	const ctx: TranaFsmContext = {
		entityId: 2,
		vehicle,
		fsm: null as unknown as StateMachine<TranaFsmContext>,
		distToPlayer: 20,
		playerX: 10,
		playerY: 0,
		playerZ: 10,
		playerAlive: true,
		aggroRange: 15,
		attackRange: 1.5,
		attackDamage: 0,
		moveSpeed: 2.0,
		attackCooldown: 0,
		behaviorState: BehaviorState.Idle,
		animState: AnimState.Idle,
		fleeRange: 8,
		...overrides,
	};
	const fsm = new StateMachine(ctx);
	ctx.fsm = fsm;
	registerTranaStates(fsm);
	return ctx;
}

describe("SnailStates", () => {
	test("wander state moves slowly", () => {
		const ctx = makeSnailCtx();
		ctx.fsm.changeTo("wander");
		ctx.fsm.update();
		expect(ctx.animState).toBe(AnimState.Walk);
		expect(ctx.vehicle.maxSpeed).toBeLessThan(0.2);
	});

	test("wander → retract when player close", () => {
		const ctx = makeSnailCtx({ distToPlayer: 2 });
		ctx.fsm.changeTo("wander");
		ctx.fsm.update();
		expect(ctx.fsm.currentState).toBeInstanceOf(SnailRetractState);
	});

	test("wander → graze when on grass", () => {
		const ctx = makeSnailCtx({ isOnGrass: true });
		ctx.fsm.changeTo("wander");
		ctx.fsm.update();
		expect(ctx.fsm.currentState).toBeInstanceOf(SnailGrazeState);
	});

	test("graze → retract when player close", () => {
		const ctx = makeSnailCtx({ isOnGrass: true, distToPlayer: 2 });
		ctx.fsm.changeTo("graze");
		ctx.fsm.update();
		expect(ctx.fsm.currentState).toBeInstanceOf(SnailRetractState);
	});

	test("retract stays put until safe", () => {
		const ctx = makeSnailCtx({ distToPlayer: 2 });
		ctx.fsm.changeTo("retract");
		ctx.fsm.update();
		expect(ctx.vehicle.maxSpeed).toBe(0);
		expect(ctx.fsm.currentState).toBeInstanceOf(SnailRetractState);
	});
});

describe("TranaStates", () => {
	test("wade state wanders slowly", () => {
		const ctx = makeTranaCtx();
		ctx.fsm.changeTo("wade");
		ctx.fsm.update();
		expect(ctx.animState).toBe(AnimState.Walk);
	});

	test("wade → flock_flee when player approaches", () => {
		const ctx = makeTranaCtx({ distToPlayer: 5 });
		ctx.fsm.changeTo("wade");
		ctx.fsm.update();
		expect(ctx.fsm.currentState).toBeInstanceOf(TranaFlockFleeState);
	});

	test("flock_flee adds boid behaviors (separation, alignment, cohesion)", () => {
		const ctx = makeTranaCtx({ distToPlayer: 5 });
		ctx.fsm.changeTo("flock_flee");
		// Should have 4 behaviors: flee + separation + alignment + cohesion
		expect(ctx.vehicle.steering.behaviors.length).toBe(4);
		expect(ctx.behaviorState).toBe(BehaviorState.Flee);
	});

	test("flock_flee → wade when far enough", () => {
		const ctx = makeTranaCtx({ distToPlayer: 25, fleeRange: 8 });
		ctx.fsm.changeTo("flock_flee");
		ctx.fsm.update();
		expect(ctx.fsm.currentState).toBeInstanceOf(TranaWadeState);
	});
});
