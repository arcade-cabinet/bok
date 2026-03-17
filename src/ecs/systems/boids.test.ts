import { describe, expect, it } from "vitest";
import {
	alignment,
	applyForce,
	type BoidAgent,
	cohesion,
	computeFlockForce,
	isVFormation,
	separation,
	TRANA_BOID_PARAMS,
} from "./boids.ts";

describe("boids", () => {
	const agent: BoidAgent = { x: 0, z: 0, vx: 1, vz: 0 };

	// ─── Separation ───

	it("pushes away from close neighbors", () => {
		const neighbor: BoidAgent = { x: 0.5, z: 0, vx: 0, vz: 0 };
		const force = separation(agent, [neighbor], 2.0);
		expect(force.fx).toBeLessThan(0); // pushed left (away from neighbor on right)
	});

	it("returns zero with no neighbors in range", () => {
		const far: BoidAgent = { x: 100, z: 100, vx: 0, vz: 0 };
		const force = separation(agent, [far], 2.0);
		expect(force.fx).toBe(0);
		expect(force.fz).toBe(0);
	});

	it("returns zero with empty neighbors", () => {
		const force = separation(agent, [], 2.0);
		expect(force.fx).toBe(0);
		expect(force.fz).toBe(0);
	});

	// ─── Alignment ───

	it("steers towards neighbor heading", () => {
		const neighbor: BoidAgent = { x: 1, z: 0, vx: 0, vz: 1 };
		const force = alignment(agent, [neighbor], 5.0);
		// Agent moves in +x, neighbor moves in +z → force should push toward +z
		expect(force.fz).toBeGreaterThan(0);
	});

	it("returns zero with no neighbors", () => {
		const force = alignment(agent, [], 5.0);
		expect(force.fx).toBe(0);
		expect(force.fz).toBe(0);
	});

	// ─── Cohesion ───

	it("steers toward center of mass", () => {
		const neighbor: BoidAgent = { x: 3, z: 0, vx: 0, vz: 0 };
		const force = cohesion(agent, [neighbor], 5.0);
		expect(force.fx).toBeGreaterThan(0); // pulled toward neighbor at x=3
	});

	it("returns zero with no neighbors", () => {
		const force = cohesion(agent, [], 5.0);
		expect(force.fx).toBe(0);
		expect(force.fz).toBe(0);
	});

	// ─── Combined Force ───

	it("clamps combined force to maxForce", () => {
		const close: BoidAgent = { x: 0.1, z: 0, vx: -5, vz: -5 };
		const force = computeFlockForce(agent, [close], TRANA_BOID_PARAMS);
		const mag = Math.sqrt(force.fx * force.fx + force.fz * force.fz);
		expect(mag).toBeLessThanOrEqual(TRANA_BOID_PARAMS.maxForce + 0.001);
	});

	// ─── Apply Force ───

	it("accelerates agent velocity", () => {
		const result = applyForce(0, 0, { fx: 1, fz: 0 }, 1, 5);
		expect(result.vx).toBe(1);
		expect(result.vz).toBe(0);
	});

	it("clamps to max speed", () => {
		const result = applyForce(3, 0, { fx: 10, fz: 0 }, 1, 3);
		const speed = Math.sqrt(result.vx * result.vx + result.vz * result.vz);
		expect(speed).toBeCloseTo(3.0, 3);
	});

	// ─── V Formation ───

	it("detects V-formation when agents trail behind leader", () => {
		const flock: BoidAgent[] = [
			{ x: 0, z: 0, vx: 0, vz: 1 }, // leader moving +z
			{ x: -1, z: -2, vx: 0, vz: 0.8 }, // behind and left
			{ x: 1, z: -2, vx: 0, vz: 0.8 }, // behind and right
		];
		expect(isVFormation(flock)).toBe(true);
	});

	it("returns false for single agent", () => {
		expect(isVFormation([{ x: 0, z: 0, vx: 1, vz: 0 }])).toBe(false);
	});

	it("returns false for stationary agents", () => {
		const flock: BoidAgent[] = [
			{ x: 0, z: 0, vx: 0, vz: 0 },
			{ x: 1, z: 0, vx: 0, vz: 0 },
		];
		expect(isVFormation(flock)).toBe(false);
	});

	it("returns false when agents are all in front of leader", () => {
		const flock: BoidAgent[] = [
			{ x: 0, z: 0, vx: 0, vz: 1 }, // leader
			{ x: -1, z: 2, vx: 0, vz: 0.5 }, // ahead
			{ x: 1, z: 2, vx: 0, vz: 0.5 }, // ahead
		];
		expect(isVFormation(flock)).toBe(false);
	});
});
