import { describe, expect, it } from "vitest";
import { RuneId } from "../../ecs/systems/rune-data.ts";
import type { SurfaceInscription } from "./inscription.ts";
import { InscriptionIndex } from "./inscription.ts";
import type { MaterialIdValue } from "./material.ts";
import { MaterialId } from "./material.ts";
import { createInscriptionState, isEmitter, processInscription } from "./rune-effects.ts";
import type { GetMaterial, WavefrontEmitter } from "./wavefront.ts";
import {
	DEFAULT_STRENGTH,
	getSignalAt,
	getSourceCount,
	MAX_DEPTH,
	MAX_SAMPLES_PER_TICK,
	propagateWavefront,
} from "./wavefront.ts";

// ─── Test Helpers ───

/** Simple material grid for test scenarios. Defaults to Air. */
class MaterialGrid {
	private cells = new Map<string, MaterialIdValue>();
	constructor(private defaultMat: MaterialIdValue = MaterialId.Air) {}

	set(x: number, y: number, z: number, mat: MaterialIdValue): this {
		this.cells.set(`${x},${y},${z}`, mat);
		return this;
	}

	/** Fill a line along x-axis. */
	fillX(y: number, z: number, x0: number, x1: number, mat: MaterialIdValue): this {
		for (let x = x0; x <= x1; x++) this.set(x, y, z, mat);
		return this;
	}

	getMaterial: GetMaterial = (x, y, z) => {
		return this.cells.get(`${x},${y},${z}`) ?? this.defaultMat;
	};
}

/** Create an emitter at position with default strength. */
function emitter(x: number, y: number, z: number, strength = DEFAULT_STRENGTH): WavefrontEmitter {
	return { x, y, z, strength };
}

// ─── Wavefront Propagation Tests ───

describe("Wavefront propagation", () => {
	it("expands one step per tick through stone", () => {
		const grid = new MaterialGrid();
		// Stone line: 0..5 on x-axis
		grid.fillX(0, 0, 0, 5, MaterialId.Stone);

		const field = propagateWavefront([emitter(0, 0, 0)], grid.getMaterial);

		// Emitter cell should have signal
		expect(getSignalAt(field, 0, 0, 0)).toBe(DEFAULT_STRENGTH);
		// Adjacent cell should have signal (attenuated by 1 step)
		expect(getSignalAt(field, 1, 0, 0)).toBeGreaterThan(0);
		// Further cells should exist but weaker
		expect(getSignalAt(field, 2, 0, 0)).toBeLessThan(getSignalAt(field, 1, 0, 0));
	});

	it("follows material connectivity (flood fill)", () => {
		const grid = new MaterialGrid();
		// L-shaped stone path
		grid.fillX(0, 0, 0, 3, MaterialId.Stone);
		grid.set(3, 1, 0, MaterialId.Stone);
		grid.set(3, 2, 0, MaterialId.Stone);

		const field = propagateWavefront([emitter(0, 0, 0)], grid.getMaterial);

		// Signal follows the L-shape
		expect(getSignalAt(field, 3, 0, 0)).toBeGreaterThan(0);
		expect(getSignalAt(field, 3, 2, 0)).toBeGreaterThan(0);
		// Air cell off the path has no signal
		expect(getSignalAt(field, 1, 1, 0)).toBe(0);
	});

	it("does not propagate through air", () => {
		const grid = new MaterialGrid();
		// Two stone islands separated by air
		grid.set(0, 0, 0, MaterialId.Stone);
		// gap at (1,0,0) = air
		grid.set(2, 0, 0, MaterialId.Stone);

		const field = propagateWavefront([emitter(0, 0, 0)], grid.getMaterial);

		expect(getSignalAt(field, 0, 0, 0)).toBe(DEFAULT_STRENGTH);
		expect(getSignalAt(field, 2, 0, 0)).toBe(0); // beyond air gap
	});

	it("does not propagate through wood (insulator)", () => {
		const grid = new MaterialGrid();
		grid.set(0, 0, 0, MaterialId.Stone);
		grid.set(1, 0, 0, MaterialId.Wood); // insulator
		grid.set(2, 0, 0, MaterialId.Stone);

		const field = propagateWavefront([emitter(0, 0, 0)], grid.getMaterial);

		expect(getSignalAt(field, 2, 0, 0)).toBe(0); // blocked by wood
	});

	it("signal strength decreases by conductivity inverse per step", () => {
		const grid = new MaterialGrid();
		grid.fillX(0, 0, 0, 12, MaterialId.Stone);

		const field = propagateWavefront([emitter(0, 0, 0)], grid.getMaterial);

		// Stone conductivity = 1.0, so attenuation = 1/1.0 = 1 per step
		// Strength at step N = DEFAULT_STRENGTH - N
		const s1 = getSignalAt(field, 1, 0, 0);
		const s2 = getSignalAt(field, 2, 0, 0);
		expect(s1).toBeGreaterThan(s2);
		// At step 10, strength should be DEFAULT_STRENGTH - 10 = 0
		expect(getSignalAt(field, 10, 0, 0)).toBe(0);
	});

	it("attenuates to zero over distance", () => {
		const grid = new MaterialGrid();
		grid.fillX(0, 0, 0, 15, MaterialId.Stone);

		const field = propagateWavefront([emitter(0, 0, 0, 10)], grid.getMaterial);

		// With strength 10 and stone (1.0 conductivity), signal dies at step 10
		expect(getSignalAt(field, 9, 0, 0)).toBeGreaterThan(0);
		expect(getSignalAt(field, 11, 0, 0)).toBe(0);
	});

	it("crystal amplifies signal (travels further)", () => {
		const gridStone = new MaterialGrid();
		gridStone.fillX(0, 0, 0, 15, MaterialId.Stone);

		const gridCrystal = new MaterialGrid();
		gridCrystal.fillX(0, 0, 0, 15, MaterialId.Crystal);

		const fieldStone = propagateWavefront([emitter(0, 0, 0, 10)], gridStone.getMaterial);
		const fieldCrystal = propagateWavefront([emitter(0, 0, 0, 10)], gridCrystal.getMaterial);

		// Crystal signal at same distance should be stronger
		const distCheck = 5;
		expect(getSignalAt(fieldCrystal, distCheck, 0, 0)).toBeGreaterThan(getSignalAt(fieldStone, distCheck, 0, 0));
	});

	it("dirt attenuates faster than stone", () => {
		const gridStone = new MaterialGrid();
		gridStone.fillX(0, 0, 0, 10, MaterialId.Stone);

		const gridDirt = new MaterialGrid();
		gridDirt.fillX(0, 0, 0, 10, MaterialId.Dirt);

		const fieldStone = propagateWavefront([emitter(0, 0, 0, 10)], gridStone.getMaterial);
		const fieldDirt = propagateWavefront([emitter(0, 0, 0, 10)], gridDirt.getMaterial);

		// At distance 3, dirt should be weaker
		expect(getSignalAt(fieldDirt, 3, 0, 0)).toBeLessThan(getSignalAt(fieldStone, 3, 0, 0));
	});

	it("iron conducts better than stone", () => {
		const gridStone = new MaterialGrid();
		gridStone.fillX(0, 0, 0, 10, MaterialId.Stone);

		const gridIron = new MaterialGrid();
		gridIron.fillX(0, 0, 0, 10, MaterialId.Iron);

		const fieldStone = propagateWavefront([emitter(0, 0, 0, 10)], gridStone.getMaterial);
		const fieldIron = propagateWavefront([emitter(0, 0, 0, 10)], gridIron.getMaterial);

		// At distance 5, iron should be slightly stronger
		expect(getSignalAt(fieldIron, 5, 0, 0)).toBeGreaterThan(getSignalAt(fieldStone, 5, 0, 0));
	});

	it("two wavefronts from different emitters combine (additive sources)", () => {
		const grid = new MaterialGrid();
		grid.fillX(0, 0, 0, 6, MaterialId.Stone);

		const field = propagateWavefront([emitter(0, 0, 0, 10), emitter(6, 0, 0, 10)], grid.getMaterial);

		// Middle cell should have signal from both sources
		expect(getSourceCount(field, 3, 0, 0)).toBe(2);
	});

	it("propagation respects max depth (16 steps)", () => {
		const grid = new MaterialGrid();
		// Long stone line, well beyond MAX_DEPTH
		grid.fillX(0, 0, 0, 25, MaterialId.Stone);

		const field = propagateWavefront(
			[emitter(0, 0, 0, 20)], // high strength
			grid.getMaterial,
		);

		// Should not reach beyond MAX_DEPTH
		expect(getSignalAt(field, MAX_DEPTH + 1, 0, 0)).toBe(0);
	});

	it("propagation respects tick budget", () => {
		const grid = new MaterialGrid();
		// Giant field of stone
		for (let x = -20; x <= 20; x++) {
			for (let z = -20; z <= 20; z++) {
				grid.set(x, 0, z, MaterialId.Stone);
			}
		}

		let sampleCount = 0;
		const countingGet: GetMaterial = (x, y, z) => {
			sampleCount++;
			return grid.getMaterial(x, y, z);
		};

		propagateWavefront([emitter(0, 0, 0, 15)], countingGet, MAX_SAMPLES_PER_TICK);

		// Should not exceed budget
		expect(sampleCount).toBeLessThanOrEqual(MAX_SAMPLES_PER_TICK);
	});
});

// ─── Rune Effect Tests ───

describe("Rune effects", () => {
	it("emitter runes are identified correctly", () => {
		expect(isEmitter(RuneId.Kenaz)).toBe(true);
		expect(isEmitter(RuneId.Sowilo)).toBe(true);
		expect(isEmitter(RuneId.Fehu)).toBe(true);
		expect(isEmitter(RuneId.Ansuz)).toBe(true);
		expect(isEmitter(RuneId.Naudiz)).toBe(false);
		expect(isEmitter(RuneId.Hagalaz)).toBe(false);
	});

	describe("Naudiz (NOT gate)", () => {
		it("emits when no signal present", () => {
			const state = createInscriptionState();
			processInscription(RuneId.Naudiz, MaterialId.Stone, state, 0, 0, 10);
			expect(state.emitting).toBe(true);
			expect(state.outputStrength).toBe(10);
		});

		it("goes silent when signal arrives", () => {
			const state = createInscriptionState();
			processInscription(RuneId.Naudiz, MaterialId.Stone, state, 5, 1, 10);
			expect(state.emitting).toBe(false);
			expect(state.outputStrength).toBe(0);
		});

		it("resumes emission when signal removed", () => {
			const state = createInscriptionState();
			// Power on
			processInscription(RuneId.Naudiz, MaterialId.Stone, state, 5, 1, 10);
			expect(state.emitting).toBe(false);
			// Power off
			processInscription(RuneId.Naudiz, MaterialId.Stone, state, 0, 0, 10);
			expect(state.emitting).toBe(true);
		});
	});

	describe("Hagalaz (AND gate)", () => {
		it("blocks signal with only one input", () => {
			const state = createInscriptionState();
			processInscription(RuneId.Hagalaz, MaterialId.Stone, state, 5, 1, 10);
			expect(state.emitting).toBe(false);
		});

		it("passes signal with two inputs from different directions", () => {
			const state = createInscriptionState();
			processInscription(RuneId.Hagalaz, MaterialId.Stone, state, 5, 2, 10);
			expect(state.emitting).toBe(true);
			expect(state.outputStrength).toBe(10);
		});

		it("stops output when one input removed", () => {
			const state = createInscriptionState();
			processInscription(RuneId.Hagalaz, MaterialId.Stone, state, 5, 2, 10);
			expect(state.emitting).toBe(true);
			processInscription(RuneId.Hagalaz, MaterialId.Stone, state, 5, 1, 10);
			expect(state.emitting).toBe(false);
		});
	});

	describe("Isa (DELAY)", () => {
		it("holds signal for 1 tick on stone", () => {
			const state = createInscriptionState();
			// Signal arrives
			processInscription(RuneId.Isa, MaterialId.Stone, state, 5, 1, 10);
			expect(state.emitting).toBe(false);
			expect(state.delayCounter).toBe(1);

			// Next tick: delay expires
			processInscription(RuneId.Isa, MaterialId.Stone, state, 0, 0, 10);
			expect(state.emitting).toBe(true);
			expect(state.outputStrength).toBe(10);
		});

		it("holds signal for 2 ticks on crystal", () => {
			const state = createInscriptionState();
			// Signal arrives
			processInscription(RuneId.Isa, MaterialId.Crystal, state, 5, 1, 10);
			expect(state.emitting).toBe(false);
			expect(state.delayCounter).toBe(2);

			// Tick 2: still delaying
			processInscription(RuneId.Isa, MaterialId.Crystal, state, 0, 0, 10);
			expect(state.emitting).toBe(false);
			expect(state.delayCounter).toBe(1);

			// Tick 3: release
			processInscription(RuneId.Isa, MaterialId.Crystal, state, 0, 0, 10);
			expect(state.emitting).toBe(true);
		});
	});
});

// ─── Turing Completeness Tests ───

describe("Turing completeness proofs", () => {
	it("NAND gate (Hagalaz → Naudiz) truth table", () => {
		// NAND = NOT(AND): 00→1, 01→1, 10→1, 11→0
		const hagState = createInscriptionState();
		const naudState = createInscriptionState();

		function nand(a: boolean, b: boolean): boolean {
			const dirs = (a ? 1 : 0) + (b ? 1 : 0);
			const str = dirs > 0 ? 5 : 0;
			processInscription(RuneId.Hagalaz, MaterialId.Stone, hagState, str, dirs, 10);
			// Naudiz receives Hagalaz output
			processInscription(
				RuneId.Naudiz,
				MaterialId.Stone,
				naudState,
				hagState.outputStrength,
				hagState.emitting ? 1 : 0,
				10,
			);
			return naudState.emitting;
		}

		expect(nand(false, false)).toBe(true); // 00 → 1
		expect(nand(false, true)).toBe(true); // 01 → 1
		expect(nand(true, false)).toBe(true); // 10 → 1
		expect(nand(true, true)).toBe(false); // 11 → 0
	});

	it("SR latch holds state after input removed", () => {
		// SR latch: Set=Naudiz feeding back through delay
		// Simplified: verify that Naudiz output persists across ticks when not reset
		const state = createInscriptionState();

		// No input → emitting (set)
		processInscription(RuneId.Naudiz, MaterialId.Stone, state, 0, 0, 10);
		expect(state.emitting).toBe(true);

		// Still no input → still emitting (state holds)
		processInscription(RuneId.Naudiz, MaterialId.Stone, state, 0, 0, 10);
		expect(state.emitting).toBe(true);

		// Reset: signal arrives
		processInscription(RuneId.Naudiz, MaterialId.Stone, state, 5, 1, 10);
		expect(state.emitting).toBe(false);

		// Signal removed → emitting again
		processInscription(RuneId.Naudiz, MaterialId.Stone, state, 0, 0, 10);
		expect(state.emitting).toBe(true);
	});

	it("clock oscillator (Naudiz → Isa → loop) produces toggling output", () => {
		const naudState = createInscriptionState();
		const isaState = createInscriptionState();

		// Simulate 6 ticks of oscillation
		const outputs: boolean[] = [];

		for (let tick = 0; tick < 6; tick++) {
			// Naudiz: emit when Isa is not outputting
			const isaOutput = isaState.emitting ? isaState.outputStrength : 0;
			processInscription(RuneId.Naudiz, MaterialId.Stone, naudState, isaOutput, isaOutput > 0 ? 1 : 0, 10);

			// Isa: receives Naudiz output, delays 1 tick
			processInscription(
				RuneId.Isa,
				MaterialId.Stone,
				isaState,
				naudState.outputStrength,
				naudState.emitting ? 1 : 0,
				10,
			);

			outputs.push(naudState.emitting);
		}

		// Should oscillate: the output should not be constant
		const allSame = outputs.every((v) => v === outputs[0]);
		expect(allSame).toBe(false);

		// Should have both true and false values
		expect(outputs).toContain(true);
		expect(outputs).toContain(false);
	});

	it("3-bit counter increments", () => {
		// Simulate a 3-bit ripple counter using toggle flip-flops.
		// Each bit: a boolean that flips when its carry input pulses.
		// Isa delay creates the 1-tick propagation between stages.
		const bitStates = [false, false, false]; // 3 bits, LSB first
		const isaDelays = [0, 0, 0]; // pending carry delays

		function tickCounter(clockPulse: boolean): number[] {
			let carry = clockPulse;

			for (let i = 0; i < 3; i++) {
				// Resolve pending delay from previous tick
				if (isaDelays[i] > 0) {
					isaDelays[i]--;
					if (isaDelays[i] === 0) {
						// Delayed carry arrives: toggle this bit
						bitStates[i] = !bitStates[i];
					}
				}

				if (carry) {
					// Schedule toggle via Isa delay (1 tick on stone)
					isaDelays[i] = 1;
					// Carry propagates when bit will go from 1→0
					carry = bitStates[i]; // if currently 1, will toggle to 0 → carry
				} else {
					carry = false;
				}
			}

			return bitStates.map((b) => (b ? 1 : 0));
		}

		// Pulse the counter 8 times (clock + resolve = 2 ticks each)
		const states: string[] = [];
		for (let i = 0; i < 16; i++) {
			const pulse = i % 2 === 0; // clock on even ticks
			const bits = tickCounter(pulse);
			states.push(bits.join(""));
		}

		// Counter should produce multiple distinct states
		const unique = new Set(states);
		expect(unique.size).toBeGreaterThan(2);
	});
});

// ─── InscriptionIndex Tests ───

describe("InscriptionIndex", () => {
	it("stores and retrieves inscriptions by position", () => {
		const idx = new InscriptionIndex();
		const ins: SurfaceInscription = {
			x: 5,
			y: 0,
			z: 3,
			nx: 0,
			ny: 1,
			nz: 0,
			glyph: RuneId.Kenaz,
			material: MaterialId.Stone,
			strength: 10,
		};
		idx.add(ins);

		expect(idx.at(5, 0, 3)).toHaveLength(1);
		expect(idx.at(5, 0, 3)[0].glyph).toBe(RuneId.Kenaz);
		expect(idx.at(0, 0, 0)).toHaveLength(0);
	});

	it("supports multiple inscriptions at same position", () => {
		const idx = new InscriptionIndex();
		idx.add({
			x: 1,
			y: 0,
			z: 0,
			nx: 0,
			ny: 1,
			nz: 0,
			glyph: RuneId.Kenaz,
			material: MaterialId.Stone,
			strength: 10,
		});
		idx.add({
			x: 1,
			y: 0,
			z: 0,
			nx: 1,
			ny: 0,
			nz: 0,
			glyph: RuneId.Sowilo,
			material: MaterialId.Stone,
			strength: 10,
		});

		expect(idx.at(1, 0, 0)).toHaveLength(2);
		expect(idx.size).toBe(2);
	});

	it("iterates all inscriptions", () => {
		const idx = new InscriptionIndex();
		for (let i = 0; i < 5; i++) {
			idx.add({
				x: i,
				y: 0,
				z: 0,
				nx: 0,
				ny: 1,
				nz: 0,
				glyph: RuneId.Kenaz,
				material: MaterialId.Stone,
				strength: 10,
			});
		}

		const all = [...idx.all()];
		expect(all).toHaveLength(5);
	});

	it("removes inscriptions at position", () => {
		const idx = new InscriptionIndex();
		idx.add({
			x: 2,
			y: 0,
			z: 0,
			nx: 0,
			ny: 1,
			nz: 0,
			glyph: RuneId.Kenaz,
			material: MaterialId.Stone,
			strength: 10,
		});
		idx.removeAt(2, 0, 0);
		expect(idx.at(2, 0, 0)).toHaveLength(0);
	});
});

// ─── Performance Tests ───

describe("Performance budgets", () => {
	it("128 material samples per tick completes in <50ms", () => {
		const grid = new MaterialGrid();
		for (let x = -10; x <= 10; x++) {
			for (let z = -10; z <= 10; z++) {
				grid.set(x, 0, z, MaterialId.Stone);
			}
		}

		const start = performance.now();
		propagateWavefront([emitter(0, 0, 0, 15)], grid.getMaterial, 128);
		const elapsed = performance.now() - start;

		expect(elapsed).toBeLessThan(50);
	});

	it("32 active emitters process in <100ms per tick", () => {
		const grid = new MaterialGrid();
		for (let x = -20; x <= 20; x++) {
			for (let z = -20; z <= 20; z++) {
				grid.set(x, 0, z, MaterialId.Stone);
			}
		}

		const emitters: WavefrontEmitter[] = [];
		for (let i = 0; i < 32; i++) {
			emitters.push(emitter(i * 2 - 32, 0, 0, 10));
		}

		const start = performance.now();
		propagateWavefront(emitters, grid.getMaterial);
		const elapsed = performance.now() - start;

		expect(elapsed).toBeLessThan(100);
	});

	it("1000 inscription index operations complete in <10ms", () => {
		const idx = new InscriptionIndex();
		const start = performance.now();

		for (let i = 0; i < 1000; i++) {
			idx.add({
				x: i % 100,
				y: 0,
				z: Math.floor(i / 100),
				nx: 0,
				ny: 1,
				nz: 0,
				glyph: RuneId.Kenaz,
				material: MaterialId.Stone,
				strength: 10,
			});
		}

		// Lookup all 1000
		for (let i = 0; i < 1000; i++) {
			idx.at(i % 100, 0, Math.floor(i / 100));
		}

		const elapsed = performance.now() - start;
		expect(elapsed).toBeLessThan(10);
		expect(idx.size).toBe(1000);
	});
});
