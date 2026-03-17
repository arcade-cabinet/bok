/**
 * GOAP Goals for the dev autopilot.
 *
 * Uses Yuka's Goal/CompositeGoal system for structured AI behavior.
 * Each goal reads from ECS state (via AutopilotWorldState) and writes
 * to MoveInput/Rotation traits via callbacks.
 */

import { CompositeGoal, GameEntity, Goal } from "yuka";
import { cosmeticRng } from "../world/noise.ts";

// ─── Shared World State ───

/**
 * Autopilot world state — extends GameEntity as yuka's GOAP system requires.
 * Holds ECS-derived state and callbacks for the goal system to read/write.
 */
export class AutopilotWorldState extends GameEntity {
	px = 0;
	py = 0;
	pz = 0;
	yaw = 0;
	pitch = 0;
	hunger = 100;
	health = 100;
	stamina = 100;
	onGround = false;
	/** Set movement input for this frame. */
	setInput: (
		forward: boolean,
		backward: boolean,
		left: boolean,
		right: boolean,
		jump: boolean,
		sprint: boolean,
	) => void = () => {};
	/** Set target rotation. */
	setTargetRotation: (yaw: number, pitch: number) => void = () => {};
	/** Trigger eating action. */
	triggerEat: () => void = () => {};
	/** Trigger mining at current target. */
	triggerMine: () => void = () => {};
	/** Log a message. */
	log: (msg: string) => void = () => {};
}

// ─── Explore Goal ───

export class ExploreGoal extends CompositeGoal<AutopilotWorldState> {
	private _timer = 0;
	private _turnTimer = 0;
	private _targetYaw: number;
	private _ws: AutopilotWorldState;

	constructor(owner: AutopilotWorldState) {
		super(owner);
		this._ws = owner;
		this._targetYaw = owner.yaw;
	}

	activate(): void {
		this._ws.log("goal: explore");
		this._timer = 0;
		this._turnTimer = 0;
		this._targetYaw = this._ws.yaw + (cosmeticRng() - 0.5) * 2;
	}

	execute(): string {
		this._timer += 0.016;
		this._turnTimer += 0.016;

		this._ws.setInput(true, false, false, false, !this._ws.onGround || cosmeticRng() < 0.02, cosmeticRng() < 0.3);

		// Periodically change direction
		if (this._turnTimer > 2.5) {
			this._targetYaw += (cosmeticRng() - 0.5) * 1.5;
			this._turnTimer = 0;
		}
		this._ws.setTargetRotation(this._targetYaw, -0.15);

		if (this._timer > 8) return Goal.STATUS.COMPLETED;
		return Goal.STATUS.ACTIVE;
	}

	terminate(): void {
		this._ws.setInput(false, false, false, false, false, false);
	}
}

// ─── Mine Goal ───

export class MineGoal extends CompositeGoal<AutopilotWorldState> {
	private _timer = 0;
	private _phase: "approach" | "mine" = "approach";
	private _ws: AutopilotWorldState;

	constructor(owner: AutopilotWorldState) {
		super(owner);
		this._ws = owner;
	}

	activate(): void {
		this._ws.log("goal: mine");
		this._timer = 0;
		this._phase = "approach";
	}

	execute(): string {
		this._timer += 0.016;

		if (this._phase === "approach") {
			// Walk forward looking down
			this._ws.setInput(true, false, false, false, false, false);
			this._ws.setTargetRotation(this._ws.yaw, -0.8);
			if (this._timer > 1.5) {
				this._phase = "mine";
				this._timer = 0;
			}
		} else {
			// Stop and mine
			this._ws.setInput(false, false, false, false, false, false);
			this._ws.triggerMine();
			if (this._timer > 3.5) return Goal.STATUS.COMPLETED;
		}

		return Goal.STATUS.ACTIVE;
	}

	terminate(): void {
		this._ws.setInput(false, false, false, false, false, false);
	}
}

// ─── Build Goal ───

export class BuildGoal extends CompositeGoal<AutopilotWorldState> {
	private _timer = 0;
	private _ws: AutopilotWorldState;

	constructor(owner: AutopilotWorldState) {
		super(owner);
		this._ws = owner;
	}

	activate(): void {
		this._ws.log("goal: build");
		this._timer = 0;
	}

	execute(): string {
		this._timer += 0.016;
		// Walk forward, occasionally jump to place blocks at different heights
		this._ws.setInput(true, false, false, false, this._timer > 2 && cosmeticRng() < 0.1, false);
		this._ws.setTargetRotation(this._ws.yaw, -0.2);

		if (this._timer > 4) return Goal.STATUS.COMPLETED;
		return Goal.STATUS.ACTIVE;
	}

	terminate(): void {
		this._ws.setInput(false, false, false, false, false, false);
	}
}

// ─── Eat Goal ───

export class EatGoal extends Goal<AutopilotWorldState> {
	private _timer = 0;
	private _ws: AutopilotWorldState;

	constructor(owner: AutopilotWorldState) {
		super(owner);
		this._ws = owner;
	}

	activate(): void {
		this._ws.log("goal: eat");
		this._timer = 0;
	}

	execute(): string {
		this._timer += 0.016;
		this._ws.setInput(false, false, false, false, false, false);
		this._ws.triggerEat();

		if (this._timer > 2) return Goal.STATUS.COMPLETED;
		return Goal.STATUS.ACTIVE;
	}

	terminate(): void {}
}

// ─── Look Around Goal ───

export class LookAroundGoal extends Goal<AutopilotWorldState> {
	private _timer = 0;
	private _lookTimer = 0;
	private _targetYaw: number;
	private _targetPitch: number;
	private _ws: AutopilotWorldState;

	constructor(owner: AutopilotWorldState) {
		super(owner);
		this._ws = owner;
		this._targetYaw = owner.yaw;
		this._targetPitch = 0;
	}

	activate(): void {
		this._ws.log("goal: look_around");
		this._timer = 0;
		this._lookTimer = 0;
		this._targetYaw = this._ws.yaw;
		this._targetPitch = 0;
	}

	execute(): string {
		this._timer += 0.016;
		this._lookTimer += 0.016;

		this._ws.setInput(false, false, false, false, false, false);

		if (this._lookTimer > 1.5) {
			this._targetYaw += 0.8 + cosmeticRng() * 0.5;
			this._targetPitch = (cosmeticRng() - 0.5) * 0.6;
			this._lookTimer = 0;
		}
		this._ws.setTargetRotation(this._targetYaw, this._targetPitch);

		if (this._timer > 4) return Goal.STATUS.COMPLETED;
		return Goal.STATUS.ACTIVE;
	}

	terminate(): void {}
}
