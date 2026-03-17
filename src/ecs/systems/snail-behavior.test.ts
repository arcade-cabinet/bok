import { describe, expect, it } from "vitest";
import { Biome } from "../../world/biomes.ts";
import {
	createSnailState,
	GRAZE_CHANCE,
	GRAZE_DURATION,
	isSnailBiome,
	newWanderDirection,
	RETRACT_DURATION,
	RETRACT_RANGE,
	SnailState,
	shouldGraze,
	shouldRetract,
	updateSnailBehavior,
	WANDER_INTERVAL,
	WANDER_SPEED,
	wanderDelta,
} from "./snail-behavior.ts";

describe("snail-behavior", () => {
	// ─── Biome validation ───

	it("allows spawning in Angen", () => {
		expect(isSnailBiome(Biome.Angen)).toBe(true);
	});

	it("allows spawning in Bokskogen", () => {
		expect(isSnailBiome(Biome.Bokskogen)).toBe(true);
	});

	it("allows spawning in Myren", () => {
		expect(isSnailBiome(Biome.Myren)).toBe(true);
	});

	it("rejects Fjallen", () => {
		expect(isSnailBiome(Biome.Fjallen)).toBe(false);
	});

	it("rejects Skargarden", () => {
		expect(isSnailBiome(Biome.Skargarden)).toBe(false);
	});

	// ─── State transitions ───

	it("retracts when player is close", () => {
		expect(shouldRetract(RETRACT_RANGE - 1)).toBe(true);
	});

	it("does not retract when player is far", () => {
		expect(shouldRetract(RETRACT_RANGE + 1)).toBe(false);
	});

	it("grazes when on grass and chance passes", () => {
		expect(shouldGraze(true, GRAZE_CHANCE - 0.01)).toBe(true);
	});

	it("does not graze when not on grass", () => {
		expect(shouldGraze(false, 0)).toBe(false);
	});

	it("does not graze when chance fails", () => {
		expect(shouldGraze(true, GRAZE_CHANCE + 0.01)).toBe(false);
	});

	// ─── Wander direction ───

	it("produces normalized wander direction", () => {
		const dir = newWanderDirection(0.25);
		const len = Math.sqrt(dir.dx * dir.dx + dir.dz * dir.dz);
		expect(len).toBeCloseTo(1.0, 3);
	});

	it("varies direction with different hashes", () => {
		const d1 = newWanderDirection(0.0);
		const d2 = newWanderDirection(0.5);
		// hash=0 → angle=0 → dx=1; hash=0.5 → angle=π → dx=-1
		expect(d1.dx).toBeCloseTo(1, 3);
		expect(d2.dx).toBeCloseTo(-1, 3);
	});

	// ─── State machine ───

	it("starts in wander state", () => {
		const state = createSnailState();
		expect(state.state).toBe(SnailState.Wander);
	});

	it("transitions to retract when threatened", () => {
		const state = createSnailState();
		const next = updateSnailBehavior(state, 0.1, 2, false, 0.9);
		expect(next.state).toBe(SnailState.Retract);
		expect(next.stateTimer).toBe(0);
	});

	it("stays retracted while timer and player close", () => {
		let state = createSnailState();
		state = updateSnailBehavior(state, 0.1, 2, false, 0.9); // retract
		state = updateSnailBehavior(state, 1, 2, false, 0.9); // still retracted
		expect(state.state).toBe(SnailState.Retract);
		expect(state.stateTimer).toBeGreaterThan(0);
	});

	it("emerges from retract after timer AND player far", () => {
		let state = createSnailState();
		state = updateSnailBehavior(state, 0.1, 2, false, 0.9); // retract
		state = updateSnailBehavior(state, RETRACT_DURATION + 0.1, 20, false, 0.9);
		expect(state.state).toBe(SnailState.Wander);
	});

	it("stays retracted after timer if player still close", () => {
		let state = createSnailState();
		state = updateSnailBehavior(state, 0.1, 2, false, 0.9);
		state = updateSnailBehavior(state, RETRACT_DURATION + 0.1, 2, false, 0.9);
		expect(state.state).toBe(SnailState.Retract);
	});

	it("transitions to graze when on grass", () => {
		const state = createSnailState();
		// Chance must be < GRAZE_CHANCE
		const next = updateSnailBehavior(state, 0.1, 20, true, 0.1);
		expect(next.state).toBe(SnailState.Graze);
	});

	it("finishes grazing after duration", () => {
		let state = createSnailState();
		state = updateSnailBehavior(state, 0.1, 20, true, 0.1); // start graze
		expect(state.state).toBe(SnailState.Graze);
		state = updateSnailBehavior(state, GRAZE_DURATION + 0.1, 20, false, 0.9);
		expect(state.state).toBe(SnailState.Wander);
	});

	it("changes wander direction after interval", () => {
		let state = createSnailState();
		state = updateSnailBehavior(state, WANDER_INTERVAL + 0.1, 20, false, 0.4);
		// Timer resets after direction change
		expect(state.wanderTimer).toBe(0);
	});

	// ─── Movement ───

	it("produces movement when wandering", () => {
		const state = createSnailState();
		const delta = wanderDelta(state, 1.0);
		expect(delta.dx).not.toBe(0);
		expect(Math.abs(delta.dx)).toBeLessThanOrEqual(WANDER_SPEED * 1.0);
	});

	it("produces zero movement when retracted", () => {
		let state = createSnailState();
		state = { ...state, state: SnailState.Retract };
		const delta = wanderDelta(state, 1.0);
		expect(delta.dx).toBe(0);
		expect(delta.dz).toBe(0);
	});

	it("produces zero movement when grazing", () => {
		let state = createSnailState();
		state = { ...state, state: SnailState.Graze };
		const delta = wanderDelta(state, 1.0);
		expect(delta.dx).toBe(0);
		expect(delta.dz).toBe(0);
	});
});
