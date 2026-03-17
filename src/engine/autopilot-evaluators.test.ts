import { describe, expect, test, vi } from "vitest";
import { Think } from "yuka";
import {
	BuildEvaluator,
	EatEvaluator,
	ExploreEvaluator,
	LookAroundEvaluator,
	MineEvaluator,
	registerAllEvaluators,
} from "./autopilot-evaluators.ts";
import type { AutopilotWorldState } from "./autopilot-goals.ts";

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

describe("EatEvaluator", () => {
	test("very high when hunger critical", () => {
		const eval_ = new EatEvaluator(1.0);
		const ws = makeWorldState({ hunger: 10 });
		expect(eval_.calculateDesirability(ws)).toBeGreaterThan(0.9);
	});

	test("high when hunger low", () => {
		const eval_ = new EatEvaluator(1.0);
		const ws = makeWorldState({ hunger: 20 });
		expect(eval_.calculateDesirability(ws)).toBeGreaterThan(0.7);
	});

	test("low when well fed", () => {
		const eval_ = new EatEvaluator(1.0);
		const ws = makeWorldState({ hunger: 90 });
		expect(eval_.calculateDesirability(ws)).toBeLessThan(0.2);
	});
});

describe("ExploreEvaluator", () => {
	test("moderate baseline", () => {
		const eval_ = new ExploreEvaluator(1.0);
		const ws = makeWorldState();
		const score = eval_.calculateDesirability(ws);
		expect(score).toBeGreaterThan(0.3);
		expect(score).toBeLessThan(0.7);
	});

	test("higher when healthy", () => {
		const eval_ = new ExploreEvaluator(1.0);
		const healthy = makeWorldState({ health: 80, stamina: 80 });
		const weak = makeWorldState({ health: 20, stamina: 10 });
		expect(eval_.calculateDesirability(healthy)).toBeGreaterThan(eval_.calculateDesirability(weak));
	});
});

describe("MineEvaluator", () => {
	test("moderate score", () => {
		const eval_ = new MineEvaluator(1.0);
		const ws = makeWorldState({ stamina: 60 });
		expect(eval_.calculateDesirability(ws)).toBeGreaterThan(0.2);
	});
});

describe("BuildEvaluator", () => {
	test("lower priority", () => {
		const eval_ = new BuildEvaluator(1.0);
		const ws = makeWorldState();
		expect(eval_.calculateDesirability(ws)).toBeLessThan(0.3);
	});
});

describe("LookAroundEvaluator", () => {
	test("low priority idle", () => {
		const eval_ = new LookAroundEvaluator(1.0);
		const ws = makeWorldState();
		expect(eval_.calculateDesirability(ws)).toBeLessThan(0.3);
	});
});

describe("registerAllEvaluators", () => {
	test("registers 5 evaluators on brain", () => {
		const ws = makeWorldState();
		const brain = new Think(ws);
		registerAllEvaluators(brain);
		expect(brain.evaluators.length).toBe(5);
	});

	test("eat wins when hungry", () => {
		const ws = makeWorldState({ hunger: 10 });
		const brain = new Think(ws);
		registerAllEvaluators(brain);

		// Find the highest scoring evaluator
		let maxScore = 0;
		let maxEval: unknown = null;
		for (const e of brain.evaluators) {
			const score = e.calculateDesirability(ws);
			if (score > maxScore) {
				maxScore = score;
				maxEval = e;
			}
		}
		expect(maxEval).toBeInstanceOf(EatEvaluator);
	});
});
