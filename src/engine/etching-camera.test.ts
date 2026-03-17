import { describe, expect, test } from "vitest";
import { computeEtchingTarget, lerpCameraState } from "./etching-camera.ts";

describe("etching-camera", () => {
	describe("computeEtchingTarget", () => {
		test("PosX face: camera positioned to the right of block", () => {
			const target = computeEtchingTarget(5, 10, 15, 0); // Face.PosX = 0
			expect(target.position.x).toBeGreaterThan(5.5);
			expect(target.position.y).toBeCloseTo(10.5, 0);
			expect(target.position.z).toBeCloseTo(15.5, 0);
			expect(target.lookAt.x).toBeCloseTo(5.5, 0);
		});

		test("NegX face: camera positioned to the left of block", () => {
			const target = computeEtchingTarget(5, 10, 15, 1); // Face.NegX = 1
			expect(target.position.x).toBeLessThan(5.5);
			expect(target.lookAt.x).toBeCloseTo(5.5, 0);
		});

		test("PosY face: camera positioned above block", () => {
			const target = computeEtchingTarget(5, 10, 15, 2); // Face.PosY = 2
			expect(target.position.y).toBeGreaterThan(10.5);
			expect(target.lookAt.y).toBeCloseTo(10.5, 0);
		});

		test("NegY face: camera positioned below block", () => {
			const target = computeEtchingTarget(5, 10, 15, 3); // Face.NegY = 3
			expect(target.position.y).toBeLessThan(10.5);
			expect(target.lookAt.y).toBeCloseTo(10.5, 0);
		});

		test("PosZ face: camera positioned in front of block", () => {
			const target = computeEtchingTarget(5, 10, 15, 4); // Face.PosZ = 4
			expect(target.position.z).toBeGreaterThan(15.5);
			expect(target.lookAt.z).toBeCloseTo(15.5, 0);
		});

		test("NegZ face: camera positioned behind block", () => {
			const target = computeEtchingTarget(5, 10, 15, 5); // Face.NegZ = 5
			expect(target.position.z).toBeLessThan(15.5);
			expect(target.lookAt.z).toBeCloseTo(15.5, 0);
		});

		test("lookAt always points to block center", () => {
			for (let face = 0; face < 6; face++) {
				const target = computeEtchingTarget(10, 20, 30, face);
				expect(target.lookAt.x).toBeCloseTo(10.5, 0);
				expect(target.lookAt.y).toBeCloseTo(20.5, 0);
				expect(target.lookAt.z).toBeCloseTo(30.5, 0);
			}
		});

		test("camera distance from block center is consistent", () => {
			const distances: number[] = [];
			for (let face = 0; face < 6; face++) {
				const target = computeEtchingTarget(0, 0, 0, face);
				const dx = target.position.x - target.lookAt.x;
				const dy = target.position.y - target.lookAt.y;
				const dz = target.position.z - target.lookAt.z;
				distances.push(Math.sqrt(dx * dx + dy * dy + dz * dz));
			}
			// All faces should have the same camera distance
			for (const d of distances) {
				expect(d).toBeCloseTo(distances[0], 1);
			}
		});
	});

	describe("lerpCameraState", () => {
		test("t=0 returns start position", () => {
			const start = { x: 0, y: 0, z: 0 };
			const end = { x: 10, y: 10, z: 10 };
			const result = lerpCameraState(start, end, 0);
			expect(result.x).toBeCloseTo(0);
			expect(result.y).toBeCloseTo(0);
			expect(result.z).toBeCloseTo(0);
		});

		test("t=1 returns end position", () => {
			const start = { x: 0, y: 0, z: 0 };
			const end = { x: 10, y: 10, z: 10 };
			const result = lerpCameraState(start, end, 1);
			expect(result.x).toBeCloseTo(10);
			expect(result.y).toBeCloseTo(10);
			expect(result.z).toBeCloseTo(10);
		});

		test("t=0.5 returns midpoint", () => {
			const start = { x: 0, y: 0, z: 0 };
			const end = { x: 10, y: 20, z: 30 };
			const result = lerpCameraState(start, end, 0.5);
			expect(result.x).toBeCloseTo(5);
			expect(result.y).toBeCloseTo(10);
			expect(result.z).toBeCloseTo(15);
		});

		test("t is clamped to [0, 1]", () => {
			const start = { x: 0, y: 0, z: 0 };
			const end = { x: 10, y: 10, z: 10 };
			const under = lerpCameraState(start, end, -0.5);
			expect(under.x).toBeCloseTo(0);
			const over = lerpCameraState(start, end, 1.5);
			expect(over.x).toBeCloseTo(10);
		});
	});
});
