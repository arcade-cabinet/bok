import { describe, expect, it } from "vitest";
import { Biome } from "../../world/biomes.ts";
import {
	createTranaState,
	FISH_CHANCE,
	FISH_DURATION,
	FLEE_RANGE,
	fleeDirection,
	isTranaBiome,
	isTranaSpawnHeight,
	MAX_ABOVE_WATER,
	neckDipProgress,
	newWadeDirection,
	shouldFish,
	shouldFlee,
	TranaState,
	updateTranaBehavior,
	WADE_SPEED,
	WATER_LEVEL,
	wadeDelta,
} from "./trana-behavior.ts";

describe("trana-behavior", () => {
	// ─── Biome validation ───

	it("allows spawning in Angen", () => {
		expect(isTranaBiome(Biome.Angen)).toBe(true);
	});

	it("allows spawning in Skargarden", () => {
		expect(isTranaBiome(Biome.Skargarden)).toBe(true);
	});

	it("rejects Bokskogen", () => {
		expect(isTranaBiome(Biome.Bokskogen)).toBe(false);
	});

	it("rejects Fjallen", () => {
		expect(isTranaBiome(Biome.Fjallen)).toBe(false);
	});

	// ─── Spawn height ───

	it("accepts spawn at water level", () => {
		expect(isTranaSpawnHeight(WATER_LEVEL)).toBe(true);
	});

	it("accepts spawn slightly above water", () => {
		expect(isTranaSpawnHeight(WATER_LEVEL + MAX_ABOVE_WATER)).toBe(true);
	});

	it("rejects spawn far above water", () => {
		expect(isTranaSpawnHeight(WATER_LEVEL + MAX_ABOVE_WATER + 1)).toBe(false);
	});

	it("rejects spawn below water", () => {
		expect(isTranaSpawnHeight(WATER_LEVEL - 1)).toBe(false);
	});

	// ─── State transitions ───

	it("flees when player is close", () => {
		expect(shouldFlee(FLEE_RANGE - 1)).toBe(true);
	});

	it("does not flee when player is far", () => {
		expect(shouldFlee(FLEE_RANGE + 1)).toBe(false);
	});

	it("fishes when chance passes", () => {
		expect(shouldFish(FISH_CHANCE - 0.01)).toBe(true);
	});

	it("does not fish when chance fails", () => {
		expect(shouldFish(FISH_CHANCE + 0.01)).toBe(false);
	});

	// ─── Flee direction ───

	it("flees away from player", () => {
		const dir = fleeDirection(5, 5, 0, 0);
		expect(dir.dx).toBeGreaterThan(0);
		expect(dir.dz).toBeGreaterThan(0);
	});

	it("produces unit vector", () => {
		const dir = fleeDirection(3, 4, 0, 0);
		const len = Math.sqrt(dir.dx * dir.dx + dir.dz * dir.dz);
		expect(len).toBeCloseTo(1.0, 3);
	});

	// ─── Wade direction ───

	it("produces normalized wade direction", () => {
		const dir = newWadeDirection(0.25);
		const len = Math.sqrt(dir.dx * dir.dx + dir.dz * dir.dz);
		expect(len).toBeCloseTo(1.0, 3);
	});

	// ─── Neck dip ───

	it("neck dip starts at 0", () => {
		expect(neckDipProgress(0)).toBeCloseTo(0, 3);
	});

	it("neck dip peaks at halfway", () => {
		expect(neckDipProgress(FISH_DURATION / 2)).toBeCloseTo(1.0, 3);
	});

	it("neck dip returns to 0 at end", () => {
		expect(neckDipProgress(FISH_DURATION)).toBeCloseTo(0, 3);
	});

	// ─── State machine ───

	it("starts in wade state", () => {
		const state = createTranaState();
		expect(state.state).toBe(TranaState.Wade);
	});

	it("transitions to flee when player close", () => {
		const state = createTranaState();
		const next = updateTranaBehavior(state, 0.1, 5, 0.9);
		expect(next.state).toBe(TranaState.Flee);
	});

	it("returns to wade when player retreats far enough", () => {
		let state = createTranaState();
		state = updateTranaBehavior(state, 0.1, 5, 0.9); // flee
		state = updateTranaBehavior(state, 1, FLEE_RANGE * 1.5 + 1, 0.9);
		expect(state.state).toBe(TranaState.Wade);
	});

	it("transitions to fish when chance passes", () => {
		const state = createTranaState();
		const next = updateTranaBehavior(state, 0.1, 30, 0.05);
		expect(next.state).toBe(TranaState.Fish);
	});

	it("finishes fishing after duration", () => {
		let state = createTranaState();
		state = updateTranaBehavior(state, 0.1, 30, 0.05); // start fish
		expect(state.state).toBe(TranaState.Fish);
		state = updateTranaBehavior(state, FISH_DURATION + 0.1, 30, 0.9);
		expect(state.state).toBe(TranaState.Wade);
	});

	// ─── Movement ───

	it("produces movement when wading", () => {
		const state = createTranaState();
		const delta = wadeDelta(state, 1.0);
		expect(delta.dx).not.toBe(0);
		expect(Math.abs(delta.dx)).toBeLessThanOrEqual(WADE_SPEED * 1.0);
	});

	it("produces zero movement when fleeing", () => {
		let state = createTranaState();
		state = { ...state, state: TranaState.Flee };
		const delta = wadeDelta(state, 1.0);
		expect(delta.dx).toBe(0);
		expect(delta.dz).toBe(0);
	});

	it("produces zero movement when fishing", () => {
		let state = createTranaState();
		state = { ...state, state: TranaState.Fish };
		const delta = wadeDelta(state, 1.0);
		expect(delta.dx).toBe(0);
		expect(delta.dz).toBe(0);
	});
});
