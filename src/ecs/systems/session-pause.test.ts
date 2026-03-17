import { afterEach, describe, expect, it } from "vitest";
import { isGamePaused, resetPauseState, setGamePaused } from "./session-pause.ts";

describe("session-pause", () => {
	afterEach(() => {
		resetPauseState();
	});

	it("starts unpaused", () => {
		expect(isGamePaused()).toBe(false);
	});

	it("setGamePaused(true) pauses the game", () => {
		setGamePaused(true);
		expect(isGamePaused()).toBe(true);
	});

	it("setGamePaused(false) resumes the game", () => {
		setGamePaused(true);
		setGamePaused(false);
		expect(isGamePaused()).toBe(false);
	});

	it("resetPauseState clears paused state", () => {
		setGamePaused(true);
		resetPauseState();
		expect(isGamePaused()).toBe(false);
	});

	it("multiple pause/resume cycles work correctly", () => {
		setGamePaused(true);
		expect(isGamePaused()).toBe(true);
		setGamePaused(false);
		expect(isGamePaused()).toBe(false);
		setGamePaused(true);
		expect(isGamePaused()).toBe(true);
	});
});
