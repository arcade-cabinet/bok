/**
 * AudioManager unit tests — minimal foundation for procedural audio.
 * Tests state machine (play/stop/mute), volume control, and layer management.
 */

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { type AudioManager, createAudioManager } from "./audio-manager.ts";

describe("AudioManager", () => {
	let mgr: AudioManager;

	beforeEach(() => {
		mgr = createAudioManager();
	});

	afterEach(() => {
		mgr.dispose();
	});

	test("starts in stopped state", () => {
		expect(mgr.getState()).toBe("stopped");
	});

	test("resume transitions to playing", () => {
		mgr.resume();
		expect(mgr.getState()).toBe("playing");
	});

	test("suspend transitions to stopped", () => {
		mgr.resume();
		mgr.suspend();
		expect(mgr.getState()).toBe("stopped");
	});

	test("master volume defaults to 1", () => {
		expect(mgr.getMasterVolume()).toBe(1);
	});

	test("setMasterVolume clamps to [0, 1]", () => {
		mgr.setMasterVolume(0.5);
		expect(mgr.getMasterVolume()).toBe(0.5);
		mgr.setMasterVolume(-1);
		expect(mgr.getMasterVolume()).toBe(0);
		mgr.setMasterVolume(2);
		expect(mgr.getMasterVolume()).toBe(1);
	});

	test("mute and unmute", () => {
		expect(mgr.isMuted()).toBe(false);
		mgr.setMuted(true);
		expect(mgr.isMuted()).toBe(true);
		expect(mgr.getEffectiveVolume()).toBe(0);
		mgr.setMuted(false);
		expect(mgr.isMuted()).toBe(false);
	});

	test("effective volume = master * mute", () => {
		mgr.setMasterVolume(0.8);
		expect(mgr.getEffectiveVolume()).toBeCloseTo(0.8);
		mgr.setMuted(true);
		expect(mgr.getEffectiveVolume()).toBe(0);
	});

	test("dispose cleans up", () => {
		mgr.resume();
		mgr.dispose();
		expect(mgr.getState()).toBe("stopped");
	});
});
