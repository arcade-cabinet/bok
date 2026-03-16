import type { World } from "koota";
import { BlockId } from "../../world/blocks.ts";
import { getVoxelAt, isBlockSolid } from "../../world/voxel-helpers.ts";
import { Health, PhysicsBody, PlayerState, PlayerTag, Position, Velocity } from "../traits/index.ts";

const BASE_GRAVITY = 28;

export function physicsSystem(world: World, dt: number) {
	world
		.query(PlayerTag, Position, Velocity, PhysicsBody, Health, PlayerState)
		.updateEach(([pos, vel, body, health, state]) => {
			const headVoxel = getVoxelAt(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));
			const feetVoxel = getVoxelAt(Math.floor(pos.x), Math.floor(pos.y - 1.5), Math.floor(pos.z));
			body.isSwimming = feetVoxel === BlockId.Water || headVoxel === BlockId.Water;

			if (body.isSwimming) {
				body.gravity = BASE_GRAVITY * 0.3;
				vel.x *= 0.9;
				vel.z *= 0.9;
				if (vel.y < -3) vel.y = -3;
			} else {
				body.gravity = BASE_GRAVITY;
			}

			vel.y -= body.gravity * dt;

			const prevX = pos.x;
			pos.x += vel.x * dt;
			if (checkPlayerCollision(pos, body)) {
				pos.x = prevX;
				vel.x = 0;
			}

			const prevZ = pos.z;
			pos.z += vel.z * dt;
			if (checkPlayerCollision(pos, body)) {
				pos.z = prevZ;
				vel.z = 0;
			}

			const prevY = pos.y;
			pos.y += vel.y * dt;
			body.onGround = false;
			if (checkPlayerCollision(pos, body)) {
				pos.y = prevY;
				if (vel.y < 0) body.onGround = true;
				vel.y = 0;
			}

			if (pos.y < -10) {
				pos.x = 8.5;
				pos.y = 30;
				pos.z = 8.5;
				vel.x = 0;
				vel.y = 0;
				vel.z = 0;
				health.current = Math.max(0, health.current - 25);
				state.damageFlash = 1.0;
			}
		});
}

function checkPlayerCollision(
	pos: { x: number; y: number; z: number },
	body: { width: number; height: number; depth: number },
): boolean {
	const hw = body.width / 2;
	const hd = body.depth / 2;
	const minX = Math.floor(pos.x - hw);
	const maxX = Math.floor(pos.x + hw);
	const minY = Math.floor(pos.y - body.height);
	const maxY = Math.floor(pos.y);
	const minZ = Math.floor(pos.z - hd);
	const maxZ = Math.floor(pos.z + hd);

	for (let x = minX; x <= maxX; x++) {
		for (let y = minY; y <= maxY; y++) {
			for (let z = minZ; z <= maxZ; z++) {
				const v = getVoxelAt(x, y, z);
				if (v > 0 && isBlockSolid(v)) return true;
			}
		}
	}
	return false;
}
