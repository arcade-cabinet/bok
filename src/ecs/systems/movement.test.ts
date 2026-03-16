import { describe, expect, it } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import { MoveInput, PlayerTag, Rotation, Velocity } from "../traits/index.ts";
import { movementSystem } from "./movement.ts";

function readVel(world: ReturnType<typeof createTestWorld>) {
	let vx = 0,
		vy = 0,
		vz = 0;
	world.query(PlayerTag, Velocity).readEach(([v]) => {
		vx = v.x;
		vy = v.y;
		vz = v.z;
	});
	return { vx, vy, vz };
}

describe("movementSystem", () => {
	it("no input produces zero velocity", () => {
		const world = createTestWorld();
		spawnPlayer(world);
		movementSystem(world, 1 / 60);
		const { vx, vz } = readVel(world);
		expect(vx).toBeCloseTo(0, 1);
		expect(vz).toBeCloseTo(0, 1);
	});

	it("forward input produces non-zero velocity", () => {
		const world = createTestWorld();
		spawnPlayer(world, { moveInput: { forward: true } });
		// Run several frames to let momentum ramp up
		for (let i = 0; i < 30; i++) movementSystem(world, 1 / 60);
		const { vx, vz } = readVel(world);
		const speed = Math.sqrt(vx * vx + vz * vz);
		expect(speed).toBeGreaterThan(4);
	});

	it("movement is camera-relative — yaw rotates direction", () => {
		const world = createTestWorld();
		spawnPlayer(world, {
			moveInput: { forward: true },
			rotation: { yaw: Math.PI / 2 }, // looking right
		});
		for (let i = 0; i < 30; i++) movementSystem(world, 1 / 60);
		const { vx, vz } = readVel(world);
		// With yaw = PI/2, forward should be mostly +X
		expect(Math.abs(vx)).toBeGreaterThan(Math.abs(vz));
	});

	it("stopping input decelerates with momentum", () => {
		const world = createTestWorld();
		spawnPlayer(world, { moveInput: { forward: true } });
		// Ramp up
		for (let i = 0; i < 30; i++) movementSystem(world, 1 / 60);
		const { vz: movingVz } = readVel(world);
		expect(Math.abs(movingVz)).toBeGreaterThan(4);

		// Stop input
		world.query(PlayerTag, MoveInput).updateEach(([input]) => {
			input.forward = false;
		});

		// One frame later — should still have velocity (momentum)
		movementSystem(world, 1 / 60);
		const { vz: slidingVz } = readVel(world);
		expect(Math.abs(slidingVz)).toBeGreaterThan(0.5);

		// After many frames — should decay to near zero
		for (let i = 0; i < 60; i++) movementSystem(world, 1 / 60);
		const { vz: stoppedVz } = readVel(world);
		expect(Math.abs(stoppedVz)).toBeLessThan(0.1);
	});

	it("diagonal movement is normalized — no faster than cardinal", () => {
		const world = createTestWorld();
		spawnPlayer(world, { moveInput: { forward: true, right: true } });
		for (let i = 0; i < 30; i++) movementSystem(world, 1 / 60);
		const { vx, vz } = readVel(world);
		const diagonalSpeed = Math.sqrt(vx * vx + vz * vz);

		const world2 = createTestWorld();
		spawnPlayer(world2, { moveInput: { forward: true } });
		for (let i = 0; i < 30; i++) movementSystem(world2, 1 / 60);
		const v2 = readVel(world2);
		const cardinalSpeed = Math.sqrt(v2.vx * v2.vx + v2.vz * v2.vz);

		expect(diagonalSpeed).toBeCloseTo(cardinalSpeed, 0);
	});

	it("sprint moves faster than walk", () => {
		const world = createTestWorld();
		spawnPlayer(world, { moveInput: { forward: true, sprint: true }, physics: { onGround: true } });
		for (let i = 0; i < 30; i++) movementSystem(world, 1 / 60);
		const sprint = readVel(world);
		const sprintSpeed = Math.sqrt(sprint.vx * sprint.vx + sprint.vz * sprint.vz);

		const world2 = createTestWorld();
		spawnPlayer(world2, { moveInput: { forward: true } });
		for (let i = 0; i < 30; i++) movementSystem(world2, 1 / 60);
		const walk = readVel(world2);
		const walkSpeed = Math.sqrt(walk.vx * walk.vx + walk.vz * walk.vz);

		expect(sprintSpeed).toBeGreaterThan(walkSpeed);
	});

	it("backward moves opposite to forward", () => {
		const world = createTestWorld();
		spawnPlayer(world, { moveInput: { backward: true } });
		for (let i = 0; i < 30; i++) movementSystem(world, 1 / 60);
		const bwd = readVel(world);

		const world2 = createTestWorld();
		spawnPlayer(world2, { moveInput: { forward: true } });
		for (let i = 0; i < 30; i++) movementSystem(world2, 1 / 60);
		const fwd = readVel(world2);

		// Z components should be opposite signs
		expect(Math.sign(bwd.vz)).toBe(-Math.sign(fwd.vz));
	});

	it("arrow key directions match WASD (left/right strafe)", () => {
		const world = createTestWorld();
		spawnPlayer(world, { moveInput: { left: true } });
		for (let i = 0; i < 30; i++) movementSystem(world, 1 / 60);
		const left = readVel(world);

		const world2 = createTestWorld();
		spawnPlayer(world2, { moveInput: { right: true } });
		for (let i = 0; i < 30; i++) movementSystem(world2, 1 / 60);
		const right = readVel(world2);

		// X components should be opposite signs
		expect(Math.sign(left.vx)).toBe(-Math.sign(right.vx));
	});
});
