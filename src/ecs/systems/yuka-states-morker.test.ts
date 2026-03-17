import { afterEach, describe, expect, test } from "vitest";
import { StateMachine, Vehicle } from "yuka";
import { AnimState, BehaviorState } from "../traits/index.ts";
import { resetVehiclePool } from "./yuka-bridge.ts";
import type { MorkerFsmContext } from "./yuka-states-morker.ts";
import { LightFleeState, registerMorkerStates } from "./yuka-states-morker.ts";
import { AttackState, IdleState } from "./yuka-states-shared.ts";

afterEach(() => {
	resetVehiclePool();
});

function makeMorkerCtx(overrides?: Partial<MorkerFsmContext>): MorkerFsmContext {
	const vehicle = new Vehicle();
	const ctx: MorkerFsmContext = {
		entityId: 1,
		vehicle,
		fsm: null as unknown as StateMachine<MorkerFsmContext>,
		distToPlayer: 20,
		playerX: 10,
		playerY: 0,
		playerZ: 10,
		playerAlive: true,
		aggroRange: 15,
		attackRange: 1.5,
		attackDamage: 15,
		moveSpeed: 2.5,
		attackCooldown: 0,
		behaviorState: BehaviorState.Idle,
		animState: AnimState.Idle,
		isAlpha: false,
		flankTargetX: 8,
		flankTargetZ: 12,
		inLight: false,
		lightX: 5,
		lightZ: 5,
		isDaytime: false,
		...overrides,
	};

	const fsm = new StateMachine(ctx);
	ctx.fsm = fsm;

	// Register both shared and morker states
	fsm.add("idle", new IdleState());
	fsm.add("attack", new AttackState());
	registerMorkerStates(fsm);

	return ctx;
}

describe("MorkerStates", () => {
	test("LightFleeState flees from light source", () => {
		const ctx = makeMorkerCtx({ inLight: true, lightX: 3, lightZ: 3 });
		ctx.fsm.changeTo("light_flee");

		ctx.fsm.update();
		expect(ctx.behaviorState).toBe(BehaviorState.Flee);
		expect(ctx.animState).toBe(AnimState.Flee);
		expect(ctx.vehicle.steering.behaviors.length).toBeGreaterThan(0);
	});

	test("LightFleeState transitions to idle when light clears", () => {
		const ctx = makeMorkerCtx({ inLight: true, distToPlayer: 30 });
		ctx.fsm.changeTo("light_flee");
		ctx.fsm.update();

		// Light clears
		ctx.inLight = false;
		ctx.fsm.update();
		expect(ctx.fsm.currentState).toBeInstanceOf(IdleState);
	});

	test("PackChaseState alpha seeks player directly", () => {
		const ctx = makeMorkerCtx({ isAlpha: true, distToPlayer: 10 });
		ctx.fsm.changeTo("pack_chase");
		ctx.fsm.update();
		expect(ctx.behaviorState).toBe(BehaviorState.Chase);
	});

	test("PackChaseState transitions to light_flee when in light", () => {
		const ctx = makeMorkerCtx({ distToPlayer: 10 });
		ctx.fsm.changeTo("pack_chase");
		ctx.fsm.update();

		ctx.inLight = true;
		ctx.fsm.update();
		expect(ctx.fsm.currentState).toBeInstanceOf(LightFleeState);
	});

	test("DawnBurnState activates in daytime", () => {
		const ctx = makeMorkerCtx({ isDaytime: true });
		ctx.fsm.changeTo("dawn_burn");
		ctx.fsm.update();
		expect(ctx.animState).toBe(AnimState.Burn);
	});

	test("DawnBurnState transitions to idle at night", () => {
		const ctx = makeMorkerCtx({ isDaytime: true });
		ctx.fsm.changeTo("dawn_burn");
		ctx.fsm.update();

		ctx.isDaytime = false;
		ctx.fsm.update();
		expect(ctx.fsm.currentState).toBeInstanceOf(IdleState);
	});
});
