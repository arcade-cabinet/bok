import { describe, expect, it } from "vitest";
import { selectAutoTarget, yawToTarget } from "./auto-target.ts";

describe("selectAutoTarget", () => {
	const playerX = 0;
	const playerY = 5;
	const playerZ = 0;
	const yaw = 0; // looking along -Z

	it("returns null with no candidates", () => {
		expect(selectAutoTarget(playerX, playerY, playerZ, yaw, [])).toBeNull();
	});

	it("selects nearest enemy in front", () => {
		const candidates = [
			{ entityId: 1, x: 0, y: 5, z: -5 },
			{ entityId: 2, x: 0, y: 5, z: -3 },
		];
		const result = selectAutoTarget(playerX, playerY, playerZ, yaw, candidates);
		expect(result).not.toBeNull();
		expect(result?.entityId).toBe(2); // closer
	});

	it("rejects enemies beyond range", () => {
		const candidates = [{ entityId: 1, x: 0, y: 5, z: -20 }];
		const result = selectAutoTarget(playerX, playerY, playerZ, yaw, candidates, 8);
		expect(result).toBeNull();
	});

	it("rejects enemies outside view cone", () => {
		const candidates = [
			// Behind the player (positive Z when yaw=0 looks along -Z)
			{ entityId: 1, x: 0, y: 5, z: 5 },
		];
		const result = selectAutoTarget(playerX, playerY, playerZ, yaw, candidates);
		expect(result).toBeNull();
	});

	it("prefers aligned over close-but-off-angle", () => {
		const candidates = [
			// Directly ahead, 6 blocks away
			{ entityId: 1, x: 0, y: 5, z: -6 },
			// Slightly to the side, 4 blocks away but off-angle
			{ entityId: 2, x: 3, y: 5, z: -2 },
		];
		const result = selectAutoTarget(playerX, playerY, playerZ, yaw, candidates);
		expect(result).not.toBeNull();
		expect(result?.entityId).toBe(1); // more aligned wins
	});

	it("handles enemies at different Y levels", () => {
		const candidates = [{ entityId: 1, x: 0, y: 8, z: -4 }];
		const result = selectAutoTarget(playerX, playerY, playerZ, yaw, candidates);
		expect(result).not.toBeNull();
		expect(result?.entityId).toBe(1);
	});

	it("returns distSq in result", () => {
		const candidates = [{ entityId: 1, x: 3, y: 5, z: -4 }];
		const result = selectAutoTarget(playerX, playerY, playerZ, yaw, candidates);
		expect(result).not.toBeNull();
		expect(result?.distSq).toBeCloseTo(25, 5); // 3² + 0² + 4² = 25
	});

	it("respects custom range and half angle", () => {
		const candidates = [{ entityId: 1, x: 0, y: 5, z: -3 }];
		// Very small range
		const result = selectAutoTarget(playerX, playerY, playerZ, yaw, candidates, 2);
		expect(result).toBeNull();

		// Normal range, tight cone
		const result2 = selectAutoTarget(playerX, playerY, playerZ, yaw, candidates, 8, 0.01);
		expect(result2).not.toBeNull();
	});

	it("skips candidates at player position", () => {
		const candidates = [{ entityId: 1, x: 0, y: 5, z: 0 }];
		const result = selectAutoTarget(playerX, playerY, playerZ, yaw, candidates);
		expect(result).toBeNull();
	});
});

describe("yawToTarget", () => {
	it("returns correct yaw for target along -Z", () => {
		const yaw = yawToTarget(0, 0, 0, -5);
		expect(yaw).toBeCloseTo(0, 5);
	});

	it("returns correct yaw for target along +X", () => {
		const yaw = yawToTarget(0, 0, 5, 0);
		expect(yaw).toBeCloseTo(-Math.PI / 2, 3);
	});

	it("returns correct yaw for target along -X", () => {
		const yaw = yawToTarget(0, 0, -5, 0);
		expect(yaw).toBeCloseTo(Math.PI / 2, 3);
	});
});
