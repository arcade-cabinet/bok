import { describe, expect, test, vi } from "vitest";
import { Goal } from "yuka";
import type { AutopilotWorldState } from "./autopilot-goals.ts";
import { BuildGoal, EatGoal, ExploreGoal, LookAroundGoal, MineGoal } from "./autopilot-goals.ts";

function makeWorldState(overrides?: Partial<AutopilotWorldState>): AutopilotWorldState {
	return {
		px: 0,
		py: 0,
		pz: 0,
		yaw: 0,
		pitch: 0,
		hunger: 100,
		health: 100,
		stamina: 100,
		onGround: true,
		setInput: vi.fn(),
		setTargetRotation: vi.fn(),
		triggerEat: vi.fn(),
		triggerMine: vi.fn(),
		log: vi.fn(),
		...overrides,
	};
}

describe("ExploreGoal", () => {
	test("activates and sets forward input", () => {
		const ws = makeWorldState();
		const goal = new ExploreGoal(ws);
		goal.activate();

		const status = goal.execute();
		expect(status).toBe(Goal.STATUS.ACTIVE);
		expect(ws.setInput).toHaveBeenCalledWith(true, false, false, false, expect.any(Boolean), expect.any(Boolean));
	});

	test("logs on activate", () => {
		const ws = makeWorldState();
		const goal = new ExploreGoal(ws);
		goal.activate();
		expect(ws.log).toHaveBeenCalledWith("goal: explore");
	});

	test("clears input on terminate", () => {
		const ws = makeWorldState();
		const goal = new ExploreGoal(ws);
		goal.terminate();
		expect(ws.setInput).toHaveBeenCalledWith(false, false, false, false, false, false);
	});
});

describe("MineGoal", () => {
	test("starts in approach phase", () => {
		const ws = makeWorldState();
		const goal = new MineGoal(ws);
		goal.activate();

		const status = goal.execute();
		expect(status).toBe(Goal.STATUS.ACTIVE);
		// Should be walking forward during approach
		expect(ws.setInput).toHaveBeenCalledWith(true, false, false, false, false, false);
	});
});

describe("EatGoal", () => {
	test("triggers eat action", () => {
		const ws = makeWorldState();
		const goal = new EatGoal(ws);
		goal.activate();

		goal.execute();
		expect(ws.triggerEat).toHaveBeenCalled();
		expect(ws.setInput).toHaveBeenCalledWith(false, false, false, false, false, false);
	});
});

describe("BuildGoal", () => {
	test("walks forward", () => {
		const ws = makeWorldState();
		const goal = new BuildGoal(ws);
		goal.activate();

		goal.execute();
		expect(ws.setInput).toHaveBeenCalled();
	});
});

describe("LookAroundGoal", () => {
	test("stays still and looks", () => {
		const ws = makeWorldState();
		const goal = new LookAroundGoal(ws);
		goal.activate();

		goal.execute();
		expect(ws.setInput).toHaveBeenCalledWith(false, false, false, false, false, false);
		expect(ws.setTargetRotation).toHaveBeenCalled();
	});
});
