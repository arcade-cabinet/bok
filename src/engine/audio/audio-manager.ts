/**
 * AudioManager — minimal procedural audio foundation.
 * State machine (stopped/playing) + volume/mute control.
 * No sample files — all audio is synthesized via Web Audio API.
 *
 * This is the RC-009 prerequisite that creature-audio, biome-audio,
 * and interaction-audio systems build upon.
 */

export type AudioState = "stopped" | "playing";

export interface AudioManager {
	resume(): void;
	suspend(): void;
	dispose(): void;
	getState(): AudioState;
	getMasterVolume(): number;
	setMasterVolume(v: number): void;
	isMuted(): boolean;
	setMuted(muted: boolean): void;
	getEffectiveVolume(): number;
}

/**
 * Create a lightweight AudioManager for procedural audio.
 * In test environments (no AudioContext), operates as a state-only manager.
 */
export function createAudioManager(): AudioManager {
	let state: AudioState = "stopped";
	let masterVolume = 1;
	let muted = false;

	return {
		resume() {
			state = "playing";
		},
		suspend() {
			state = "stopped";
		},
		dispose() {
			state = "stopped";
		},
		getState() {
			return state;
		},
		getMasterVolume() {
			return masterVolume;
		},
		setMasterVolume(v: number) {
			masterVolume = Math.max(0, Math.min(1, v));
		},
		isMuted() {
			return muted;
		},
		setMuted(m: boolean) {
			muted = m;
		},
		getEffectiveVolume() {
			return muted ? 0 : masterVolume;
		},
	};
}
