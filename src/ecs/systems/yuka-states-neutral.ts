/**
 * Neutral creature Yuka AI states — Runvaktare, Draugar, Vittra, Nacken.
 *
 * Runvaktare: DormantState → ActiveState → ReturnState
 * Draugar: RiseState → PursuitState (freeze-when-observed)
 * Vittra/Nacken: OrbitState → DebuffState
 */

import { SeekBehavior, State, type StateMachine, Vector3 } from "yuka";
import { AnimState, BehaviorState } from "../traits/index.ts";
import type { CreatureFsmContext } from "./yuka-states-shared.ts";

// ─── Runvaktare Context ───

export interface RunvaktareFsmContext extends CreatureFsmContext {
	/** Anchor position (where the Runvaktare was placed/spawned). */
	anchorX: number;
	anchorZ: number;
	/** Max patrol radius from anchor. */
	patrolRadius: number;
	/** Whether the rune it guards is being interacted with. */
	runeDisturbed: boolean;
}

// ─── Runvaktare: Dormant State ───

export class DormantState extends State<RunvaktareFsmContext> {
	enter(ctx: RunvaktareFsmContext): void {
		ctx.vehicle.steering.clear();
		ctx.vehicle.maxSpeed = 0;
		ctx.animState = AnimState.Idle;
		ctx.behaviorState = BehaviorState.Idle;
	}

	execute(ctx: RunvaktareFsmContext): void {
		ctx.animState = AnimState.Idle;
		ctx.behaviorState = BehaviorState.Idle;

		// Activate when player approaches or disturbs rune
		if (ctx.runeDisturbed || ctx.distToPlayer < ctx.aggroRange * 0.5) {
			ctx.fsm.changeTo("active");
		}
	}

	exit(_ctx: RunvaktareFsmContext): void {}
}

// ─── Runvaktare: Active State ───

export class ActiveState extends State<RunvaktareFsmContext> {
	private _seek: SeekBehavior | null = null;

	enter(ctx: RunvaktareFsmContext): void {
		ctx.vehicle.steering.clear();
		const seek = new SeekBehavior(new Vector3(ctx.playerX, ctx.playerY, ctx.playerZ));
		seek.weight = 1.0;
		ctx.vehicle.steering.add(seek);
		ctx.vehicle.maxSpeed = ctx.moveSpeed;
		this._seek = seek;
		ctx.animState = AnimState.Chase;
		ctx.behaviorState = BehaviorState.Chase;
	}

	execute(ctx: RunvaktareFsmContext): void {
		ctx.animState = AnimState.Chase;
		ctx.behaviorState = BehaviorState.Chase;

		if (this._seek) {
			this._seek.target.set(ctx.playerX, ctx.playerY, ctx.playerZ);
		}

		if (ctx.distToPlayer <= ctx.attackRange && ctx.playerAlive) {
			ctx.fsm.changeTo("attack");
			return;
		}

		// Check if too far from anchor — return
		const dxAnchor = ctx.vehicle.position.x - ctx.anchorX;
		const dzAnchor = ctx.vehicle.position.z - ctx.anchorZ;
		const distToAnchor = Math.sqrt(dxAnchor * dxAnchor + dzAnchor * dzAnchor);
		if (distToAnchor > ctx.patrolRadius) {
			ctx.fsm.changeTo("returning");
		}
	}

	exit(ctx: RunvaktareFsmContext): void {
		if (this._seek) {
			ctx.vehicle.steering.remove(this._seek);
			this._seek = null;
		}
	}
}

// ─── Runvaktare: Returning State ───

export class ReturningState extends State<RunvaktareFsmContext> {
	private _seek: SeekBehavior | null = null;

	enter(ctx: RunvaktareFsmContext): void {
		ctx.vehicle.steering.clear();
		const seek = new SeekBehavior(new Vector3(ctx.anchorX, ctx.vehicle.position.y, ctx.anchorZ));
		seek.weight = 1.0;
		ctx.vehicle.steering.add(seek);
		ctx.vehicle.maxSpeed = ctx.moveSpeed * 0.6;
		this._seek = seek;
		ctx.animState = AnimState.Walk;
		ctx.behaviorState = BehaviorState.Idle;
	}

	execute(ctx: RunvaktareFsmContext): void {
		ctx.animState = AnimState.Walk;
		ctx.behaviorState = BehaviorState.Idle;

		const dxAnchor = ctx.vehicle.position.x - ctx.anchorX;
		const dzAnchor = ctx.vehicle.position.z - ctx.anchorZ;
		const distToAnchor = Math.sqrt(dxAnchor * dxAnchor + dzAnchor * dzAnchor);

		if (distToAnchor < 1.5) {
			ctx.fsm.changeTo("dormant");
		}
	}

	exit(ctx: RunvaktareFsmContext): void {
		if (this._seek) {
			ctx.vehicle.steering.remove(this._seek);
			this._seek = null;
		}
	}
}

// ─── Draugar Context ───

export interface DraugarFsmContext extends CreatureFsmContext {
	/** Whether the player is looking at (observing) this Draug. */
	isObserved: boolean;
}

// ─── Draugar: Freeze-When-Observed Chase ───

export class DraugarPursuitState extends State<DraugarFsmContext> {
	private _seek: SeekBehavior | null = null;

	enter(ctx: DraugarFsmContext): void {
		ctx.vehicle.steering.clear();
		const seek = new SeekBehavior(new Vector3(ctx.playerX, ctx.playerY, ctx.playerZ));
		seek.weight = 1.0;
		ctx.vehicle.steering.add(seek);
		ctx.vehicle.maxSpeed = ctx.moveSpeed;
		this._seek = seek;
		ctx.animState = AnimState.Chase;
		ctx.behaviorState = BehaviorState.Chase;
	}

	execute(ctx: DraugarFsmContext): void {
		// Freeze when observed (weeping angel mechanic)
		if (ctx.isObserved) {
			ctx.vehicle.maxSpeed = 0;
			ctx.animState = AnimState.Idle;
		} else {
			ctx.vehicle.maxSpeed = ctx.moveSpeed;
			ctx.animState = AnimState.Chase;
		}
		ctx.behaviorState = BehaviorState.Chase;

		if (this._seek) {
			this._seek.target.set(ctx.playerX, ctx.playerY, ctx.playerZ);
		}

		if (ctx.distToPlayer <= ctx.attackRange && ctx.playerAlive && !ctx.isObserved) {
			ctx.fsm.changeTo("attack");
			return;
		}

		if (!ctx.playerAlive || ctx.distToPlayer > ctx.aggroRange * 2) {
			ctx.fsm.changeTo("idle");
		}
	}

	exit(ctx: DraugarFsmContext): void {
		if (this._seek) {
			ctx.vehicle.steering.remove(this._seek);
			this._seek = null;
		}
	}
}

// ─── Vittra/Nacken: Orbit State ───

export interface OrbitFsmContext extends CreatureFsmContext {
	/** Orbit center (typically near player). */
	orbitCenterX: number;
	orbitCenterZ: number;
	/** Orbit angle (radians, updated each tick). */
	orbitAngle: number;
	/** Orbit radius. */
	orbitRadius: number;
}

export class OrbitState extends State<OrbitFsmContext> {
	private _seek: SeekBehavior | null = null;

	enter(ctx: OrbitFsmContext): void {
		ctx.vehicle.steering.clear();
		const seek = new SeekBehavior(new Vector3());
		seek.weight = 0.8;
		ctx.vehicle.steering.add(seek);
		ctx.vehicle.maxSpeed = ctx.moveSpeed * 0.5;
		this._seek = seek;
		ctx.animState = AnimState.Walk;
	}

	execute(ctx: OrbitFsmContext): void {
		ctx.animState = AnimState.Walk;
		ctx.behaviorState = BehaviorState.Idle;

		// Update orbit target
		ctx.orbitAngle += 0.016 * 0.5; // Slow orbit
		const tx = ctx.orbitCenterX + Math.cos(ctx.orbitAngle) * ctx.orbitRadius;
		const tz = ctx.orbitCenterZ + Math.sin(ctx.orbitAngle) * ctx.orbitRadius;
		if (this._seek) {
			this._seek.target.set(tx, ctx.vehicle.position.y, tz);
		}
	}

	exit(ctx: OrbitFsmContext): void {
		if (this._seek) {
			ctx.vehicle.steering.remove(this._seek);
			this._seek = null;
		}
	}
}

// ─── Factories ───

/** Register Runvaktare states. */
export function registerRunvaktareStates(fsm: StateMachine<RunvaktareFsmContext>): void {
	fsm.add("dormant", new DormantState());
	fsm.add("active", new ActiveState());
	fsm.add("returning", new ReturningState());
}

/** Register Draugar states. */
export function registerDraugarStates(fsm: StateMachine<DraugarFsmContext>): void {
	fsm.add("pursuit", new DraugarPursuitState());
}

/** Register orbit state for Vittra/Nacken. */
export function registerOrbitState(fsm: StateMachine<OrbitFsmContext>): void {
	fsm.add("orbit", new OrbitState());
}
