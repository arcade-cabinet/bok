import type { World } from "koota";
import {
	MoveInput,
	PhysicsBody,
	PlayerTag,
	Position,
	Rotation,
	Stamina,
	ToolSwing,
	Velocity,
} from "../traits/index.ts";

const CONFIG = {
	moveSpeed: 5.5,
	sprintSpeed: 9,
	baseJump: 10.5,
	swimUp: 4,
};

export function movementSystem(world: World, dt: number) {
	// PlayerTag is a tag (no data), so it's excluded from the callback tuple
	world
		.query(PlayerTag, Position, Velocity, Rotation, MoveInput, PhysicsBody, Stamina, ToolSwing)
		.updateEach(([pos, vel, rot, input, body, stamina, toolSwing]) => {
			void pos; // position updated by physics
			const canSprint = input.sprint && stamina.current > 0 && !body.isSwimming;
			const speed = canSprint ? CONFIG.sprintSpeed : CONFIG.moveSpeed;

			const cosYaw = Math.cos(rot.yaw);
			const sinYaw = Math.sin(rot.yaw);
			const fwdX = -sinYaw;
			const fwdZ = -cosYaw;
			const rightX = cosYaw;
			const rightZ = -sinYaw;

			let moveX = 0;
			let moveZ = 0;
			if (input.forward) {
				moveX += fwdX;
				moveZ += fwdZ;
			}
			if (input.backward) {
				moveX -= fwdX;
				moveZ -= fwdZ;
			}
			if (input.left) {
				moveX -= rightX;
				moveZ -= rightZ;
			}
			if (input.right) {
				moveX += rightX;
				moveZ += rightZ;
			}

			const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
			if (len > 0) {
				moveX /= len;
				moveZ /= len;
			}

			vel.x = moveX * speed;
			vel.z = moveZ * speed;

			if (canSprint && len > 0) {
				stamina.current = Math.max(0, stamina.current - dt * 15);
			}

			if (input.jump && stamina.current > 5) {
				if (body.onGround && !body.isSwimming) {
					vel.y = CONFIG.baseJump;
					stamina.current = Math.max(0, stamina.current - 10);
				} else if (body.isSwimming) {
					vel.y = CONFIG.swimUp;
					stamina.current = Math.max(0, stamina.current - 2);
				}
			}

			toolSwing.swayX += (toolSwing.targetSwayX - toolSwing.swayX) * Math.min(1, dt * 8);
			toolSwing.swayY += (toolSwing.targetSwayY - toolSwing.swayY) * Math.min(1, dt * 8);
			toolSwing.targetSwayX += (0 - toolSwing.targetSwayX) * Math.min(1, dt * 5);
			toolSwing.targetSwayY += (0 - toolSwing.targetSwayY) * Math.min(1, dt * 5);

			if (toolSwing.progress > 0) {
				toolSwing.progress = Math.max(0, toolSwing.progress - dt * 6);
			}
		});
}
