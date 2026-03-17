/**
 * Passive creature Yuka AI states — Skogssnigel, Trana, Lyktgubbe.
 *
 * Skogssnigel: WanderState → GrazeState → RetractState
 * Trana: WadeState → FlockFleeState (using Yuka's native boid behaviors)
 * Lyktgubbe: DriftState → ScatterState
 */

import {
	AlignmentBehavior,
	CohesionBehavior,
	FleeBehavior,
	SeparationBehavior,
	State,
	type StateMachine,
	Vector3,
	WanderBehavior,
} from "yuka";
import { AnimState, BehaviorState } from "../traits/index.ts";
import type { CreatureFsmContext } from "./yuka-states-shared.ts";

// ─── Skogssnigel Context ───

export interface SnailFsmContext extends CreatureFsmContext {
	/** Whether the snail is on a grass/moss block. */
	isOnGrass: boolean;
	/** Retract timer — snail hides when threatened. */
	retractTimer: number;
	/** Graze timer — how long the snail has been eating. */
	grazeTimer: number;
}

// ─── Snail: Wander State ───

export class SnailWanderState extends State<SnailFsmContext> {
	private _wander: WanderBehavior | null = null;

	enter(ctx: SnailFsmContext): void {
		ctx.vehicle.steering.clear();
		const wander = new WanderBehavior();
		wander.weight = 0.3;
		wander.jitter = 5;
		wander.radius = 1;
		wander.distance = 2;
		ctx.vehicle.steering.add(wander);
		ctx.vehicle.maxSpeed = ctx.moveSpeed * 0.15; // Snails are slow
		this._wander = wander;
		ctx.animState = AnimState.Walk;
	}

	execute(ctx: SnailFsmContext): void {
		ctx.animState = AnimState.Walk;
		ctx.behaviorState = BehaviorState.Idle;

		// Threat: player too close → retract
		if (ctx.distToPlayer < 3) {
			ctx.fsm.changeTo("retract");
			return;
		}
		// Found grass → graze
		if (ctx.isOnGrass) {
			ctx.fsm.changeTo("graze");
		}
	}

	exit(ctx: SnailFsmContext): void {
		if (this._wander) {
			ctx.vehicle.steering.remove(this._wander);
			this._wander = null;
		}
	}
}

// ─── Snail: Graze State ───

export class SnailGrazeState extends State<SnailFsmContext> {
	enter(ctx: SnailFsmContext): void {
		ctx.vehicle.steering.clear();
		ctx.vehicle.maxSpeed = 0;
		ctx.grazeTimer = 0;
		ctx.animState = AnimState.Idle;
	}

	execute(ctx: SnailFsmContext): void {
		ctx.animState = AnimState.Idle;
		ctx.behaviorState = BehaviorState.Idle;
		ctx.grazeTimer += 0.016; // Approximation — dt not passed to State.execute

		if (ctx.distToPlayer < 3) {
			ctx.fsm.changeTo("retract");
			return;
		}
		if (ctx.grazeTimer > 3 || !ctx.isOnGrass) {
			ctx.fsm.changeTo("wander");
		}
	}

	exit(_ctx: SnailFsmContext): void {}
}

// ─── Snail: Retract State ───

export class SnailRetractState extends State<SnailFsmContext> {
	enter(ctx: SnailFsmContext): void {
		ctx.vehicle.steering.clear();
		ctx.vehicle.maxSpeed = 0;
		ctx.retractTimer = 0;
		ctx.animState = AnimState.Idle;
	}

	execute(ctx: SnailFsmContext): void {
		ctx.animState = AnimState.Idle;
		ctx.behaviorState = BehaviorState.Idle;
		ctx.retractTimer += 0.016;

		// Stay retracted for 2 seconds then resume
		if (ctx.retractTimer > 2 && ctx.distToPlayer > 5) {
			ctx.fsm.changeTo("wander");
		}
	}

	exit(_ctx: SnailFsmContext): void {}
}

// ─── Trana Context ───

export interface TranaFsmContext extends CreatureFsmContext {
	/** Flee threshold distance. */
	fleeRange: number;
}

// ─── Trana: Wade State ───

export class TranaWadeState extends State<TranaFsmContext> {
	private _wander: WanderBehavior | null = null;

	enter(ctx: TranaFsmContext): void {
		ctx.vehicle.steering.clear();
		const wander = new WanderBehavior();
		wander.weight = 0.4;
		wander.jitter = 8;
		wander.radius = 3;
		wander.distance = 5;
		ctx.vehicle.steering.add(wander);
		ctx.vehicle.maxSpeed = ctx.moveSpeed * 0.4;
		this._wander = wander;
		ctx.animState = AnimState.Walk;
	}

	execute(ctx: TranaFsmContext): void {
		ctx.animState = AnimState.Walk;
		ctx.behaviorState = BehaviorState.Idle;

		if (ctx.distToPlayer < ctx.fleeRange && ctx.playerAlive) {
			ctx.fsm.changeTo("flock_flee");
		}
	}

	exit(ctx: TranaFsmContext): void {
		if (this._wander) {
			ctx.vehicle.steering.remove(this._wander);
			this._wander = null;
		}
	}
}

// ─── Trana: Flock Flee State (Yuka native boids) ───

export class TranaFlockFleeState extends State<TranaFsmContext> {
	private _flee: FleeBehavior | null = null;
	private _sep: SeparationBehavior | null = null;
	private _ali: AlignmentBehavior | null = null;
	private _coh: CohesionBehavior | null = null;

	enter(ctx: TranaFsmContext): void {
		ctx.vehicle.steering.clear();

		const flee = new FleeBehavior(new Vector3(ctx.playerX, ctx.playerY, ctx.playerZ));
		flee.weight = 1.0;
		ctx.vehicle.steering.add(flee);

		// Yuka's native boid behaviors — replaces hand-rolled boids.ts
		const sep = new SeparationBehavior();
		sep.weight = 1.5;
		ctx.vehicle.steering.add(sep);

		const ali = new AlignmentBehavior();
		ali.weight = 1.0;
		ctx.vehicle.steering.add(ali);

		const coh = new CohesionBehavior();
		coh.weight = 1.0;
		ctx.vehicle.steering.add(coh);

		ctx.vehicle.maxSpeed = ctx.moveSpeed * 1.5;

		this._flee = flee;
		this._sep = sep;
		this._ali = ali;
		this._coh = coh;

		ctx.behaviorState = BehaviorState.Flee;
		ctx.animState = AnimState.Flee;
	}

	execute(ctx: TranaFsmContext): void {
		ctx.behaviorState = BehaviorState.Flee;
		ctx.animState = AnimState.Flee;

		if (this._flee) {
			this._flee.target.set(ctx.playerX, ctx.playerY, ctx.playerZ);
		}

		// Far enough — stop fleeing
		if (ctx.distToPlayer > ctx.fleeRange * 2.5) {
			ctx.fsm.changeTo("wade");
		}
	}

	exit(ctx: TranaFsmContext): void {
		const behaviors = [this._flee, this._sep, this._ali, this._coh];
		for (const b of behaviors) {
			if (b) ctx.vehicle.steering.remove(b);
		}
		this._flee = null;
		this._sep = null;
		this._ali = null;
		this._coh = null;
	}
}

// ─── Factories ───

/** Register Skogssnigel states. */
export function registerSnailStates(fsm: StateMachine<SnailFsmContext>): void {
	fsm.add("wander", new SnailWanderState());
	fsm.add("graze", new SnailGrazeState());
	fsm.add("retract", new SnailRetractState());
}

/** Register Trana states. */
export function registerTranaStates(fsm: StateMachine<TranaFsmContext>): void {
	fsm.add("wade", new TranaWadeState());
	fsm.add("flock_flee", new TranaFlockFleeState());
}
