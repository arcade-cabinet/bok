/**
 * Mörker-specific Yuka AI states.
 *
 * Extends shared FSM with:
 * - LightFleeState: flee from torch/light sources using FleeBehavior
 * - PackChaseState: flanking positions via SeekBehavior to offset targets
 * - DawnBurnState: burn in daylight (cosmetic, damage handled by ECS)
 *
 * Pack coordination: alpha chases directly, flankers seek offset positions
 * around the player. The flank index and target are computed externally
 * and fed into the context each frame.
 */

import { FleeBehavior, SeekBehavior, State, type StateMachine, Vector3 } from "yuka";
import { AnimState, BehaviorState } from "../traits/index.ts";
import type { CreatureFsmContext } from "./yuka-states-shared.ts";

// ─── Extended Context ───

export interface MorkerFsmContext extends CreatureFsmContext {
	/** Whether this Mörker is the pack alpha. */
	isAlpha: boolean;
	/** Flank target position (computed externally from morker-pack.ts). */
	flankTargetX: number;
	flankTargetZ: number;
	/** Whether creature is in light (should flee). */
	inLight: boolean;
	/** Light source position to flee from. */
	lightX: number;
	lightZ: number;
	/** Whether it's daytime (burn). */
	isDaytime: boolean;
}

// ─── Light Flee State ───

export class LightFleeState extends State<MorkerFsmContext> {
	private _flee: FleeBehavior | null = null;

	enter(ctx: MorkerFsmContext): void {
		ctx.vehicle.steering.clear();
		const flee = new FleeBehavior(new Vector3(ctx.lightX, ctx.vehicle.position.y, ctx.lightZ));
		flee.weight = 2.0;
		ctx.vehicle.steering.add(flee);
		ctx.vehicle.maxSpeed = ctx.moveSpeed * 1.3;
		this._flee = flee;

		ctx.behaviorState = BehaviorState.Flee;
		ctx.animState = AnimState.Flee;
	}

	execute(ctx: MorkerFsmContext): void {
		ctx.behaviorState = BehaviorState.Flee;
		ctx.animState = AnimState.Flee;

		if (this._flee) {
			this._flee.target.set(ctx.lightX, ctx.vehicle.position.y, ctx.lightZ);
		}

		// No longer in light — return to chase or idle
		if (!ctx.inLight) {
			if (ctx.distToPlayer <= ctx.aggroRange && ctx.playerAlive) {
				ctx.fsm.changeTo("pack_chase");
			} else {
				ctx.fsm.changeTo("idle");
			}
		}
	}

	exit(ctx: MorkerFsmContext): void {
		if (this._flee) {
			ctx.vehicle.steering.remove(this._flee);
			this._flee = null;
		}
	}
}

// ─── Pack Chase State ───

export class PackChaseState extends State<MorkerFsmContext> {
	private _seek: SeekBehavior | null = null;

	enter(ctx: MorkerFsmContext): void {
		ctx.vehicle.steering.clear();
		const target = ctx.isAlpha
			? new Vector3(ctx.playerX, ctx.playerY, ctx.playerZ)
			: new Vector3(ctx.flankTargetX, ctx.playerY, ctx.flankTargetZ);
		const seek = new SeekBehavior(target);
		seek.weight = 1.0;
		ctx.vehicle.steering.add(seek);
		ctx.vehicle.maxSpeed = ctx.isAlpha ? ctx.moveSpeed * 1.15 : ctx.moveSpeed;
		this._seek = seek;

		ctx.behaviorState = BehaviorState.Chase;
		ctx.animState = AnimState.Chase;
	}

	execute(ctx: MorkerFsmContext): void {
		ctx.behaviorState = BehaviorState.Chase;
		ctx.animState = AnimState.Chase;

		// Update target each frame
		if (this._seek) {
			if (ctx.isAlpha) {
				this._seek.target.set(ctx.playerX, ctx.playerY, ctx.playerZ);
			} else {
				this._seek.target.set(ctx.flankTargetX, ctx.playerY, ctx.flankTargetZ);
			}
		}

		// Priority: flee from light
		if (ctx.inLight && !ctx.isDaytime) {
			ctx.fsm.changeTo("light_flee");
			return;
		}

		// Attack range
		if (ctx.distToPlayer <= ctx.attackRange && ctx.playerAlive) {
			ctx.fsm.changeTo("attack");
			return;
		}

		// Lost target
		if (ctx.distToPlayer > ctx.aggroRange * 1.5 || !ctx.playerAlive) {
			ctx.fsm.changeTo("idle");
		}
	}

	exit(ctx: MorkerFsmContext): void {
		if (this._seek) {
			ctx.vehicle.steering.remove(this._seek);
			this._seek = null;
		}
	}
}

// ─── Dawn Burn State ───

export class DawnBurnState extends State<MorkerFsmContext> {
	enter(ctx: MorkerFsmContext): void {
		ctx.vehicle.steering.clear();
		ctx.vehicle.maxSpeed = 0;
		ctx.animState = AnimState.Burn;
	}

	execute(ctx: MorkerFsmContext): void {
		ctx.animState = AnimState.Burn;
		// Damage is handled by ECS (the existing daytime DPS logic)
		// Transition: night falls again
		if (!ctx.isDaytime) {
			ctx.fsm.changeTo("idle");
		}
	}

	exit(_ctx: MorkerFsmContext): void {}
}

// ─── Factory ───

/** Register Mörker-specific states on a StateMachine. */
export function registerMorkerStates(fsm: StateMachine<MorkerFsmContext>): void {
	fsm.add("light_flee", new LightFleeState());
	fsm.add("pack_chase", new PackChaseState());
	fsm.add("dawn_burn", new DawnBurnState());
}
