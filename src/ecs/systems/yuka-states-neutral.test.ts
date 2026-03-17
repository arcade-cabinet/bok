import { afterEach, describe, expect, test } from "vitest";
import { StateMachine, Vehicle } from "yuka";
import { AnimState, BehaviorState } from "../traits/index.ts";
import { resetVehiclePool } from "./yuka-bridge.ts";
import type { DraugarFsmContext, RunvaktareFsmContext } from "./yuka-states-neutral.ts";
import {
	ActiveState,
	DormantState,
	ReturningState,
	registerDraugarStates,
	registerRunvaktareStates,
} from "./yuka-states-neutral.ts";
import { AttackState, IdleState } from "./yuka-states-shared.ts";

afterEach(() => {
	resetVehiclePool();
});

function makeRunvaktareCtx(overrides?: Partial<RunvaktareFsmContext>): RunvaktareFsmContext {
	const vehicle = new Vehicle();
	const ctx: RunvaktareFsmContext = {
		entityId: 1,
		vehicle,
		fsm: null as unknown as StateMachine<RunvaktareFsmContext>,
		distToPlayer: 20,
		playerX: 10,
		playerY: 0,
		playerZ: 10,
		playerAlive: true,
		aggroRange: 12,
		attackRange: 1.5,
		attackDamage: 20,
		moveSpeed: 2.0,
		attackCooldown: 0,
		behaviorState: BehaviorState.Idle,
		animState: AnimState.Idle,
		anchorX: 0,
		anchorZ: 0,
		patrolRadius: 10,
		runeDisturbed: false,
		...overrides,
	};
	const fsm = new StateMachine(ctx);
	ctx.fsm = fsm;
	fsm.add("idle", new IdleState());
	fsm.add("attack", new AttackState());
	registerRunvaktareStates(fsm);
	return ctx;
}

function makeDraugarCtx(overrides?: Partial<DraugarFsmContext>): DraugarFsmContext {
	const vehicle = new Vehicle();
	const ctx: DraugarFsmContext = {
		entityId: 2,
		vehicle,
		fsm: null as unknown as StateMachine<DraugarFsmContext>,
		distToPlayer: 10,
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
		isObserved: false,
		...overrides,
	};
	const fsm = new StateMachine(ctx);
	ctx.fsm = fsm;
	fsm.add("idle", new IdleState());
	fsm.add("attack", new AttackState());
	registerDraugarStates(fsm);
	return ctx;
}

describe("RunvaktareStates", () => {
	test("dormant until rune disturbed", () => {
		const ctx = makeRunvaktareCtx();
		ctx.fsm.changeTo("dormant");
		ctx.fsm.update();
		expect(ctx.vehicle.maxSpeed).toBe(0);
		expect(ctx.fsm.currentState).toBeInstanceOf(DormantState);
	});

	test("dormant → active on rune disturbance", () => {
		const ctx = makeRunvaktareCtx({ runeDisturbed: true });
		ctx.fsm.changeTo("dormant");
		ctx.fsm.update();
		expect(ctx.fsm.currentState).toBeInstanceOf(ActiveState);
	});

	test("dormant → active when player close", () => {
		const ctx = makeRunvaktareCtx({ distToPlayer: 4 });
		ctx.fsm.changeTo("dormant");
		ctx.fsm.update();
		expect(ctx.fsm.currentState).toBeInstanceOf(ActiveState);
	});

	test("active → returning when too far from anchor", () => {
		const ctx = makeRunvaktareCtx({ distToPlayer: 20, anchorX: 0, anchorZ: 0 });
		ctx.vehicle.position.set(15, 0, 15); // Far from anchor
		ctx.fsm.changeTo("active");
		ctx.fsm.update();
		expect(ctx.fsm.currentState).toBeInstanceOf(ReturningState);
	});

	test("returning → dormant when near anchor", () => {
		const ctx = makeRunvaktareCtx({ anchorX: 0, anchorZ: 0 });
		ctx.vehicle.position.set(0.5, 0, 0.5); // Near anchor
		ctx.fsm.changeTo("returning");
		ctx.fsm.update();
		expect(ctx.fsm.currentState).toBeInstanceOf(DormantState);
	});
});

describe("DraugarStates", () => {
	test("pursuit chases when not observed", () => {
		const ctx = makeDraugarCtx({ isObserved: false });
		ctx.fsm.changeTo("pursuit");
		ctx.fsm.update();
		expect(ctx.vehicle.maxSpeed).toBe(ctx.moveSpeed);
		expect(ctx.animState).toBe(AnimState.Chase);
	});

	test("pursuit freezes when observed", () => {
		const ctx = makeDraugarCtx({ isObserved: true });
		ctx.fsm.changeTo("pursuit");
		ctx.fsm.update();
		expect(ctx.vehicle.maxSpeed).toBe(0);
		expect(ctx.animState).toBe(AnimState.Idle);
	});

	test("pursuit → idle when player dead", () => {
		const ctx = makeDraugarCtx({ playerAlive: false });
		ctx.fsm.changeTo("pursuit");
		ctx.fsm.update();
		expect(ctx.fsm.currentState).toBeInstanceOf(IdleState);
	});
});
