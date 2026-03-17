/**
 * Shared Yuka State definitions for creature AI FSMs.
 *
 * Each state configures the Vehicle's SteeringManager on enter(),
 * checks transitions on execute(), and cleans up on exit().
 *
 * The "owner" passed to each state is a CreatureFsmContext —
 * a bridge object holding the entity ID, Vehicle ref, StateMachine ref,
 * AI config, and live ECS position/distance data updated each frame.
 */

import {
	FleeBehavior,
	GameEntity,
	SeekBehavior,
	State,
	StateMachine,
	Vector3,
	type Vehicle,
	WanderBehavior,
} from "yuka";
import type { AnimStateId, BehaviorStateId } from "../traits/index.ts";
import { AnimState, BehaviorState } from "../traits/index.ts";

// ─── Context (owner of the FSM) ───

/**
 * Creature FSM context — extends GameEntity as yuka requires.
 * Position is synced from the Vehicle each frame.
 */
export class CreatureFsmContext extends GameEntity {
	entityId: number;
	vehicle: Vehicle;
	/** The StateMachine instance for this creature. */
	fsm: StateMachine<CreatureFsmContext> = null as unknown as StateMachine<CreatureFsmContext>;
	/** Current distance to player. Updated each frame before execute(). */
	distToPlayer = Infinity;
	/** Player world position. Updated each frame. */
	playerX = 0;
	playerY = 0;
	playerZ = 0;
	/** Whether the player is alive. */
	playerAlive = true;
	/** AI config from CreatureAI trait. */
	aggroRange: number;
	attackRange: number;
	attackDamage: number;
	moveSpeed: number;
	/** Attack cooldown remaining (seconds). Decremented externally. */
	attackCooldown = 0;
	/** Output: ECS BehaviorState to write back. */
	behaviorState: BehaviorStateId = BehaviorState.Idle;
	/** Output: ECS AnimState to write back. */
	animState: AnimStateId = AnimState.Idle;
	/** Callback to deal damage to player. */
	applyDamageToPlayer?: (damage: number) => void;

	constructor(
		entityId: number,
		vehicle: Vehicle,
		config: { aggroRange: number; attackRange: number; attackDamage: number; moveSpeed: number },
	) {
		super();
		this.entityId = entityId;
		this.vehicle = vehicle;
		this.aggroRange = config.aggroRange;
		this.attackRange = config.attackRange;
		this.attackDamage = config.attackDamage;
		this.moveSpeed = config.moveSpeed;
	}
}

/** FSM context pool, keyed by entity ID. */
const fsmContexts = new Map<number, CreatureFsmContext>();

/** Get FSM context for an entity. */
export function getFsmContext(entityId: number): CreatureFsmContext | undefined {
	return fsmContexts.get(entityId);
}

/** Store FSM context for an entity. */
export function setFsmContext(entityId: number, ctx: CreatureFsmContext): void {
	fsmContexts.set(entityId, ctx);
}

/** Remove FSM context when creature is destroyed. */
export function removeFsmContext(entityId: number): void {
	fsmContexts.delete(entityId);
}

/** Clear all FSM contexts (world reset). */
export function resetFsmContexts(): void {
	fsmContexts.clear();
}

// ─── Idle State ───

export class IdleState extends State<CreatureFsmContext> {
	private _wander: WanderBehavior | null = null;

	enter(ctx: CreatureFsmContext): void {
		ctx.vehicle.steering.clear();
		const wander = new WanderBehavior();
		wander.weight = 0.5;
		wander.jitter = 10;
		wander.radius = 2;
		wander.distance = 4;
		ctx.vehicle.steering.add(wander);
		ctx.vehicle.maxSpeed = ctx.moveSpeed * 0.3;
		this._wander = wander;

		ctx.behaviorState = BehaviorState.Idle;
		ctx.animState = AnimState.Idle;
	}

	execute(ctx: CreatureFsmContext): void {
		ctx.behaviorState = BehaviorState.Idle;
		ctx.animState = AnimState.Walk;

		// Transition: if player is within aggro range, chase
		if (ctx.distToPlayer <= ctx.aggroRange && ctx.playerAlive) {
			ctx.fsm.changeTo("chase");
		}
	}

	exit(ctx: CreatureFsmContext): void {
		if (this._wander) {
			ctx.vehicle.steering.remove(this._wander);
			this._wander = null;
		}
	}
}

// ─── Chase State ───

export class ChaseState extends State<CreatureFsmContext> {
	private _seek: SeekBehavior | null = null;

	enter(ctx: CreatureFsmContext): void {
		ctx.vehicle.steering.clear();
		const seek = new SeekBehavior(new Vector3(ctx.playerX, ctx.playerY, ctx.playerZ));
		seek.weight = 1.0;
		ctx.vehicle.steering.add(seek);
		ctx.vehicle.maxSpeed = ctx.moveSpeed;
		this._seek = seek;

		ctx.behaviorState = BehaviorState.Chase;
		ctx.animState = AnimState.Chase;
	}

	execute(ctx: CreatureFsmContext): void {
		ctx.behaviorState = BehaviorState.Chase;
		ctx.animState = AnimState.Chase;

		// Update seek target to player position
		if (this._seek) {
			this._seek.target.set(ctx.playerX, ctx.playerY, ctx.playerZ);
		}

		// Transition: close enough to attack
		if (ctx.distToPlayer <= ctx.attackRange && ctx.playerAlive) {
			ctx.fsm.changeTo("attack");
			return;
		}

		// Transition: player out of range or dead
		if (ctx.distToPlayer > ctx.aggroRange * 1.5 || !ctx.playerAlive) {
			ctx.fsm.changeTo("idle");
		}
	}

	exit(ctx: CreatureFsmContext): void {
		if (this._seek) {
			ctx.vehicle.steering.remove(this._seek);
			this._seek = null;
		}
	}
}

// ─── Attack State ───

export class AttackState extends State<CreatureFsmContext> {
	enter(ctx: CreatureFsmContext): void {
		ctx.vehicle.steering.clear();
		ctx.vehicle.maxSpeed = 0;
		ctx.behaviorState = BehaviorState.Attack;
		ctx.animState = AnimState.Attack;
	}

	execute(ctx: CreatureFsmContext): void {
		ctx.behaviorState = BehaviorState.Attack;
		ctx.animState = AnimState.Attack;

		if (ctx.attackCooldown <= 0 && ctx.playerAlive) {
			ctx.applyDamageToPlayer?.(ctx.attackDamage);
			ctx.attackCooldown = 1.0;
		}

		if (ctx.distToPlayer > ctx.attackRange * 1.2) {
			ctx.fsm.changeTo("chase");
			return;
		}

		if (!ctx.playerAlive) {
			ctx.fsm.changeTo("idle");
		}
	}

	exit(ctx: CreatureFsmContext): void {
		ctx.vehicle.maxSpeed = ctx.moveSpeed;
	}
}

// ─── Flee State ───

export class FleeState extends State<CreatureFsmContext> {
	private _flee: FleeBehavior | null = null;

	enter(ctx: CreatureFsmContext): void {
		ctx.vehicle.steering.clear();
		const flee = new FleeBehavior(new Vector3(ctx.playerX, ctx.playerY, ctx.playerZ));
		flee.weight = 1.0;
		ctx.vehicle.steering.add(flee);
		ctx.vehicle.maxSpeed = ctx.moveSpeed * 1.2;
		this._flee = flee;

		ctx.behaviorState = BehaviorState.Flee;
		ctx.animState = AnimState.Flee;
	}

	execute(ctx: CreatureFsmContext): void {
		ctx.behaviorState = BehaviorState.Flee;
		ctx.animState = AnimState.Flee;

		if (this._flee) {
			this._flee.target.set(ctx.playerX, ctx.playerY, ctx.playerZ);
		}

		if (ctx.distToPlayer > ctx.aggroRange * 2) {
			ctx.fsm.changeTo("idle");
		}
	}

	exit(ctx: CreatureFsmContext): void {
		if (this._flee) {
			ctx.vehicle.steering.remove(this._flee);
			this._flee = null;
		}
	}
}

// ─── Factory ───

/**
 * Create a StateMachine with shared states for a creature.
 * Returns the SM and context — caller stores context via setFsmContext().
 */
export function createCreatureFsm(
	entityId: number,
	vehicle: Vehicle,
	config: {
		aggroRange: number;
		attackRange: number;
		attackDamage: number;
		moveSpeed: number;
	},
): { fsm: StateMachine<CreatureFsmContext>; context: CreatureFsmContext } {
	const ctx = new CreatureFsmContext(entityId, vehicle, config);
	const fsm = new StateMachine(ctx);
	ctx.fsm = fsm;

	fsm.add("idle", new IdleState());
	fsm.add("chase", new ChaseState());
	fsm.add("attack", new AttackState());
	fsm.add("flee", new FleeState());

	fsm.changeTo("idle");

	setFsmContext(entityId, ctx);
	return { fsm, context: ctx };
}
