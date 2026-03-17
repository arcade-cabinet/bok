/**
 * Minimal Tone.js type shims for dependency injection.
 * Keeps audio-manager.ts focused on logic, not library types.
 */

export interface ToneSynth {
	triggerAttackRelease: (...args: unknown[]) => void;
	triggerAttack: () => void;
	triggerRelease: () => void;
	connect: (target: unknown) => unknown;
	dispose: () => void;
	volume: { value: number };
}

export interface ToneNode {
	connect: (target: unknown) => unknown;
	toDestination: () => unknown;
	dispose: () => void;
}

export interface ToneGainNode extends ToneNode {
	gain: { value: number };
}

/** Minimal Tone.js interface for dependency injection. */
export interface ToneLib {
	start: () => Promise<void>;
	Synth: new (opts?: unknown) => ToneSynth;
	FMSynth: new (opts?: unknown) => ToneSynth;
	AMSynth: new (opts?: unknown) => ToneSynth;
	MetalSynth: new (opts?: unknown) => ToneSynth;
	NoiseSynth: new (opts?: unknown) => ToneSynth;
	Filter: new (...args: unknown[]) => ToneNode;
	Gain: new (gain?: number) => ToneGainNode;
}

/** Internal handle for a running ambient layer. */
export interface AmbientHandle {
	synth: ToneSynth;
	filter: ToneNode;
	gain: ToneGainNode;
}
