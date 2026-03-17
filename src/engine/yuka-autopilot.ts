/**
 * Yuka GOAP Autopilot — automated playtesting with proper goal-oriented AI.
 *
 * Replaces the hand-rolled state machine in dev-autopilot.ts with
 * Yuka's Think + GoalEvaluator + CompositeGoal system.
 *
 * Each frame: read ECS state → update evaluator scores → think.execute()
 * → write MoveInput/Rotation back to ECS.
 */

import type { World } from "koota";
import { Think } from "yuka";
import {
	Health,
	Hunger,
	MiningState,
	MoveInput,
	PhysicsBody,
	PlayerState,
	PlayerTag,
	Position,
	Rotation,
	Stamina,
} from "../ecs/traits/index.ts";
import { registerAllEvaluators } from "./autopilot-evaluators.ts";
import { AutopilotWorldState } from "./autopilot-goals.ts";

// ─── State ───

let brain: Think<AutopilotWorldState> | null = null;
let worldState: AutopilotWorldState | null = null;

// Pending input to apply
let pendingInput = { forward: false, backward: false, left: false, right: false, jump: false, sprint: false };
let pendingYaw = 0;
let pendingPitch = 0;
let pendingEat = false;
let pendingMine = false;

const actionLog: string[] = [];

function log(msg: string): void {
	const ts = new Date().toLocaleTimeString("en-US", {
		hour12: false,
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
	actionLog.push(`[${ts}] ${msg}`);
	if (actionLog.length > 50) actionLog.shift();
	if (import.meta.env.DEV) console.log(`[yuka-autopilot] ${msg}`);
}

// ─── Stuck Detection ───

let lastX = 0;
let lastZ = 0;
let stuckTimer = 0;

// ─── Public API ───

/** Initialize the GOAP brain. Call once at startup. */
export function initYukaAutopilot(): void {
	worldState = new AutopilotWorldState();
	worldState.setInput = (fwd, back, left, right, jump, sprint) => {
		pendingInput = { forward: fwd, backward: back, left, right, jump, sprint };
	};
	worldState.setTargetRotation = (yaw, pitch) => {
		pendingYaw = yaw;
		pendingPitch = pitch;
	};
	worldState.triggerEat = () => {
		pendingEat = true;
	};
	worldState.triggerMine = () => {
		pendingMine = true;
	};
	worldState.log = log;

	brain = new Think(worldState);
	registerAllEvaluators(brain);

	log("GOAP brain initialized");
}

/** Get the current autopilot status for dev tools. */
export function getYukaAutopilotStatus(): {
	goalName: string;
	subgoalCount: number;
	log: string[];
} {
	return {
		goalName: brain?.currentSubgoal?.constructor.name ?? "none",
		subgoalCount: brain?.subgoals?.length ?? 0,
		log: actionLog.slice(-20),
	};
}

/** Update the GOAP autopilot. Called each frame when autopilot is enabled. */
export function updateYukaAutopilot(world: World, dt: number): void {
	if (!brain || !worldState) return;
	const ws = worldState;

	// Reset pending actions
	pendingInput = { forward: false, backward: false, left: false, right: false, jump: false, sprint: false };
	pendingEat = false;
	pendingMine = false;

	// Read player state from ECS
	world.query(PlayerTag, Position).readEach(([pos]) => {
		ws.px = pos.x;
		ws.py = pos.y;
		ws.pz = pos.z;
	});
	world.query(PlayerTag, Rotation).readEach(([rot]) => {
		ws.yaw = rot.yaw;
		ws.pitch = rot.pitch;
		pendingYaw = rot.yaw;
		pendingPitch = rot.pitch;
	});
	world.query(PlayerTag, Hunger).readEach(([h]) => {
		ws.hunger = h.current;
	});
	world.query(PlayerTag, Health).readEach(([h]) => {
		ws.health = h.current;
	});
	world.query(PlayerTag, Stamina).readEach(([s]) => {
		ws.stamina = s.current;
	});
	world.query(PlayerTag, PhysicsBody).readEach(([b]) => {
		ws.onGround = b.onGround;
	});

	// Dead = do nothing
	if (ws.health <= 0) return;

	// Stuck detection
	const moved = Math.abs(ws.px - lastX) + Math.abs(ws.pz - lastZ);
	if (moved < 0.1) stuckTimer += dt;
	else stuckTimer = 0;
	lastX = ws.px;
	lastZ = ws.pz;

	if (stuckTimer > 3) {
		log("stuck — turning");
		pendingYaw += 1.5;
		stuckTimer = 0;
	}

	// Run GOAP brain — evaluates all goals, picks highest scoring
	brain.execute();

	// Apply pending inputs to ECS
	world.query(PlayerTag, MoveInput).updateEach(([input]) => {
		input.forward = pendingInput.forward;
		input.backward = pendingInput.backward;
		input.left = pendingInput.left;
		input.right = pendingInput.right;
		input.jump = pendingInput.jump;
		input.sprint = pendingInput.sprint;
	});

	// Smooth rotation toward target
	world.query(PlayerTag, Rotation).updateEach(([rot]) => {
		rot.yaw = lerpAngle(rot.yaw, pendingYaw, dt * 3);
		rot.pitch = lerpAngle(rot.pitch, pendingPitch, dt * 3);
		rot.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, rot.pitch));
	});

	// Eat action
	if (pendingEat) {
		world.query(PlayerTag, PlayerState).updateEach(([ps]) => {
			ps.wantsEat = true;
		});
	}

	// Mine action
	if (pendingMine) {
		world.query(PlayerTag, MiningState).updateEach(([mining]) => {
			mining.active = true;
		});
	}
}

/** Reset the autopilot state. */
export function resetYukaAutopilot(): void {
	brain = null;
	worldState = null;
	actionLog.length = 0;
	stuckTimer = 0;
	lastX = 0;
	lastZ = 0;
}

// ─── Helpers ───

function lerpAngle(a: number, b: number, t: number): number {
	let diff = b - a;
	while (diff > Math.PI) diff -= Math.PI * 2;
	while (diff < -Math.PI) diff += Math.PI * 2;
	return a + diff * Math.min(t, 1);
}
