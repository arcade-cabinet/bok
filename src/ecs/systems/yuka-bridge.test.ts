import { afterEach, describe, expect, test } from "vitest";
import { SeekBehavior, Vector3 as YVector3 } from "yuka";
import {
	createCreatureVehicle,
	destroyCreatureVehicle,
	getPoolSize,
	getVehicle,
	hasVehicle,
	resetVehiclePool,
	setVehicleTarget,
	syncEcsToYuka,
	syncYukaToEcs,
	updateVehicle,
} from "./yuka-bridge.ts";

afterEach(() => {
	resetVehiclePool();
});

describe("YukaVehiclePool", () => {
	test("createCreatureVehicle adds to pool", () => {
		const vehicle = createCreatureVehicle(42, { maxSpeed: 3.0, maxForce: 6.0, mass: 2.0 });
		expect(hasVehicle(42)).toBe(true);
		expect(getPoolSize()).toBe(1);
		expect(vehicle.maxSpeed).toBe(3.0);
		expect(vehicle.maxForce).toBe(6.0);
		expect(vehicle.mass).toBe(2.0);
	});

	test("duplicate create returns existing vehicle", () => {
		const v1 = createCreatureVehicle(1);
		const v2 = createCreatureVehicle(1);
		expect(v1).toBe(v2);
		expect(getPoolSize()).toBe(1);
	});

	test("destroyCreatureVehicle removes from pool", () => {
		createCreatureVehicle(10);
		expect(hasVehicle(10)).toBe(true);
		destroyCreatureVehicle(10);
		expect(hasVehicle(10)).toBe(false);
		expect(getPoolSize()).toBe(0);
	});

	test("destroy non-existent is a no-op", () => {
		destroyCreatureVehicle(999);
		expect(getPoolSize()).toBe(0);
	});

	test("resetVehiclePool clears all", () => {
		createCreatureVehicle(1);
		createCreatureVehicle(2);
		createCreatureVehicle(3);
		expect(getPoolSize()).toBe(3);
		resetVehiclePool();
		expect(getPoolSize()).toBe(0);
	});

	test("initial position can be set", () => {
		const vehicle = createCreatureVehicle(5, {
			position: { x: 10, y: 20, z: 30 },
		});
		expect(vehicle.position.x).toBe(10);
		expect(vehicle.position.y).toBe(20);
		expect(vehicle.position.z).toBe(30);
	});
});

describe("ECS ↔ Yuka sync", () => {
	test("syncEcsToYuka copies position and velocity", () => {
		createCreatureVehicle(1);
		syncEcsToYuka(1, { x: 5, y: 10, z: 15 }, { x: 1, y: 0, z: -1 });
		const v = getVehicle(1);
		expect(v).toBeDefined();
		expect(v?.position.x).toBe(5);
		expect(v?.position.y).toBe(10);
		expect(v?.position.z).toBe(15);
		expect(v?.velocity.x).toBe(1);
		expect(v?.velocity.z).toBe(-1);
	});

	test("syncYukaToEcs copies horizontal position/velocity, preserves Y", () => {
		const vehicle = createCreatureVehicle(1);
		vehicle.position.set(10, 20, 30);
		vehicle.velocity.set(2, 0, -3);

		const pos = { x: 0, y: 99, z: 0 };
		const vel = { x: 0, y: -5, z: 0 };
		syncYukaToEcs(1, pos, vel);

		expect(pos.x).toBe(10);
		expect(pos.y).toBe(99); // Y preserved (gravity owned by ECS)
		expect(pos.z).toBe(30);
		expect(vel.x).toBe(2);
		expect(vel.y).toBe(-5); // Y preserved
		expect(vel.z).toBe(-3);
	});

	test("sync on non-existent vehicle is a no-op", () => {
		const pos = { x: 1, y: 2, z: 3 };
		const vel = { x: 0, y: 0, z: 0 };
		syncEcsToYuka(999, pos, vel);
		syncYukaToEcs(999, pos, vel);
		expect(pos.x).toBe(1); // unchanged
	});
});

describe("Steering", () => {
	test("SeekBehavior produces movement toward target", () => {
		const vehicle = createCreatureVehicle(1, {
			maxSpeed: 5,
			maxForce: 10,
			position: { x: 0, y: 0, z: 0 },
		});

		const seek = new SeekBehavior(new YVector3(10, 0, 0));
		vehicle.steering.add(seek);

		// Run several ticks
		for (let i = 0; i < 10; i++) {
			updateVehicle(1, 0.1);
		}

		// Vehicle should have moved toward target (x=10)
		expect(vehicle.position.x).toBeGreaterThan(0.5);
	});

	test("setVehicleTarget updates targets on behaviors", () => {
		const vehicle = createCreatureVehicle(1);
		const seek = new SeekBehavior(new YVector3());
		vehicle.steering.add(seek);
		setVehicleTarget(1, 5, 5, 5);
		expect(seek.target.x).toBe(5);
		expect(seek.target.z).toBe(5);
	});
});
