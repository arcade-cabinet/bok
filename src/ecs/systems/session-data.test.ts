import { describe, expect, it } from "vitest";
import {
	AUTO_SAVE_INTERVAL_MS,
	MICRO_GOAL_HINT_DELAY_S,
	MICRO_GOAL_SCAN_RADIUS,
	RESUME_BANNER_DURATION_MS,
} from "./session-data.ts";

describe("session-data", () => {
	it("auto-save interval is 60 seconds", () => {
		expect(AUTO_SAVE_INTERVAL_MS).toBe(60_000);
	});

	it("resume banner duration is 5 seconds", () => {
		expect(RESUME_BANNER_DURATION_MS).toBe(5_000);
	});

	it("micro-goal scan radius is reasonable", () => {
		expect(MICRO_GOAL_SCAN_RADIUS).toBeGreaterThan(0);
		expect(MICRO_GOAL_SCAN_RADIUS).toBeLessThanOrEqual(5);
	});

	it("micro-goal hint delay is 2 minutes", () => {
		expect(MICRO_GOAL_HINT_DELAY_S).toBe(120);
	});
});
