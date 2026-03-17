import { afterEach, describe, expect, it } from "vitest";
import { NAUDIZ_OUTPUT_STRENGTH } from "./computational-rune-data.ts";
import { analyzeAdjacentSignals, evaluateHagalaz, faceAxis, perpendicularFaces } from "./hagalaz-gate.ts";
import { resetIsaState } from "./isa-delay.ts";
import { computeNaudizOutput } from "./naudiz-not.ts";
import { Face } from "./rune-data.ts";
import { SignalType } from "./signal-data.ts";
import type { SignalMap } from "./signal-propagation.ts";

function makeSignalMap(entries: Array<[string, Array<[number, number]>]>): SignalMap {
	const map: SignalMap = new Map();
	for (const [key, signals] of entries) {
		const typeMap = new Map<number, number>();
		for (const [type, str] of signals) typeMap.set(type, str);
		map.set(key, typeMap);
	}
	return map;
}

afterEach(() => resetIsaState());

describe("hagalaz-gate", () => {
	describe("faceAxis", () => {
		it("maps PosX/NegX to axis 0", () => {
			expect(faceAxis(Face.PosX)).toBe(0);
			expect(faceAxis(Face.NegX)).toBe(0);
		});

		it("maps PosY/NegY to axis 1", () => {
			expect(faceAxis(Face.PosY)).toBe(1);
			expect(faceAxis(Face.NegY)).toBe(1);
		});

		it("maps PosZ/NegZ to axis 2", () => {
			expect(faceAxis(Face.PosZ)).toBe(2);
			expect(faceAxis(Face.NegZ)).toBe(2);
		});
	});

	describe("perpendicularFaces", () => {
		it("returns 4 faces for PosX", () => {
			const perp = perpendicularFaces(Face.PosX);
			expect(perp).toHaveLength(4);
			expect(perp).toContain(Face.PosY);
			expect(perp).toContain(Face.NegY);
			expect(perp).toContain(Face.PosZ);
			expect(perp).toContain(Face.NegZ);
			expect(perp).not.toContain(Face.PosX);
			expect(perp).not.toContain(Face.NegX);
		});

		it("returns faces not on the same axis for PosZ", () => {
			const perp = perpendicularFaces(Face.PosZ);
			expect(perp).toHaveLength(4);
			expect(perp).toContain(Face.PosX);
			expect(perp).toContain(Face.NegX);
			expect(perp).toContain(Face.PosY);
			expect(perp).toContain(Face.NegY);
		});
	});

	describe("analyzeAdjacentSignals", () => {
		it("returns 0 axes for empty signal map", () => {
			const map: SignalMap = new Map();
			const info = analyzeAdjacentSignals(5, 5, 5, map);
			expect(info.axisCount).toBe(0);
			expect(info.maxStrength).toBe(0);
		});

		it("detects signal on X axis neighbor", () => {
			// Signal at (6,5,5) = PosX neighbor of (5,5,5)
			const map = makeSignalMap([["6,5,5", [[SignalType.Heat, 8]]]]);
			const info = analyzeAdjacentSignals(5, 5, 5, map);
			expect(info.axisCount).toBe(1);
			expect(info.maxStrength).toBe(8);
		});

		it("detects signal on 2 perpendicular axes", () => {
			const map = makeSignalMap([
				["6,5,5", [[SignalType.Heat, 8]]], // PosX neighbor
				["5,6,5", [[SignalType.Light, 6]]], // PosY neighbor
			]);
			const info = analyzeAdjacentSignals(5, 5, 5, map);
			expect(info.axisCount).toBe(2);
			expect(info.maxStrength).toBe(8);
		});

		it("detects signal on all 3 axes", () => {
			const map = makeSignalMap([
				["4,5,5", [[SignalType.Heat, 3]]], // NegX
				["5,6,5", [[SignalType.Light, 7]]], // PosY
				["5,5,4", [[SignalType.Force, 5]]], // NegZ
			]);
			const info = analyzeAdjacentSignals(5, 5, 5, map);
			expect(info.axisCount).toBe(3);
			expect(info.maxStrength).toBe(7);
		});

		it("counts both faces of same axis as 1 axis", () => {
			const map = makeSignalMap([
				["4,5,5", [[SignalType.Heat, 5]]], // NegX
				["6,5,5", [[SignalType.Heat, 5]]], // PosX (same axis)
			]);
			const info = analyzeAdjacentSignals(5, 5, 5, map);
			expect(info.axisCount).toBe(1); // both on X axis
		});
	});

	describe("evaluateHagalaz — AND truth table", () => {
		it("gate closed: no signal anywhere", () => {
			const map: SignalMap = new Map();
			expect(evaluateHagalaz(5, 5, 5, Face.PosX, map)).toBeNull();
		});

		it("gate closed: signal on only 1 axis", () => {
			const map = makeSignalMap([
				["6,5,5", [[SignalType.Heat, 10]]], // PosX neighbor only
			]);
			expect(evaluateHagalaz(5, 5, 5, Face.PosX, map)).toBeNull();
		});

		it("gate open: signal on 2 perpendicular axes", () => {
			const map = makeSignalMap([
				["6,5,5", [[SignalType.Heat, 8]]], // X axis
				["5,6,5", [[SignalType.Light, 6]]], // Y axis
				["5,5,5", [[SignalType.Heat, 7]]], // signal at block itself
			]);
			const result = evaluateHagalaz(5, 5, 5, Face.PosX, map);
			expect(result).not.toBeNull();
			expect(result?.x).toBe(5);
			expect(result?.y).toBe(5);
			expect(result?.z).toBe(5);
			expect(result?.face).toBe(Face.PosX);
			expect(result?.strength).toBeGreaterThan(0);
		});

		it("gate open: emits on the inscribed face", () => {
			const map = makeSignalMap([
				["6,5,5", [[SignalType.Heat, 8]]], // X axis
				["5,5,6", [[SignalType.Heat, 6]]], // Z axis
				["5,5,5", [[SignalType.Heat, 5]]], // self
			]);
			const result = evaluateHagalaz(5, 5, 5, Face.NegY, map);
			expect(result?.face).toBe(Face.NegY);
		});

		it("gate closed: signal on same axis both sides (not perpendicular)", () => {
			const map = makeSignalMap([
				["4,5,5", [[SignalType.Heat, 8]]], // NegX
				["6,5,5", [[SignalType.Heat, 8]]], // PosX (same axis!)
			]);
			expect(evaluateHagalaz(5, 5, 5, Face.PosZ, map)).toBeNull();
		});
	});

	describe("composite gates", () => {
		describe("NAND = Hagalaz -> Naudiz", () => {
			it("NAND truth table: both inputs off -> output on", () => {
				// No signal at Hagalaz → gate closed → no signal at Naudiz → Naudiz outputs
				const hagalazOutput = evaluateHagalaz(5, 5, 5, Face.PosX, new Map());
				expect(hagalazOutput).toBeNull(); // Hagalaz closed
				const naudizInput = hagalazOutput ? hagalazOutput.strength : 0;
				expect(computeNaudizOutput(naudizInput)).toBe(NAUDIZ_OUTPUT_STRENGTH);
			});

			it("NAND truth table: one input on -> output on", () => {
				// Signal on 1 axis → Hagalaz still closed → Naudiz outputs
				const map = makeSignalMap([["6,5,5", [[SignalType.Heat, 8]]]]);
				const hagalazOutput = evaluateHagalaz(5, 5, 5, Face.PosX, map);
				expect(hagalazOutput).toBeNull();
				expect(computeNaudizOutput(0)).toBe(NAUDIZ_OUTPUT_STRENGTH);
			});

			it("NAND truth table: both inputs on -> output off", () => {
				// Signal on 2 axes → Hagalaz opens → Naudiz receives signal → silent
				const map = makeSignalMap([
					["6,5,5", [[SignalType.Heat, 8]]],
					["5,6,5", [[SignalType.Light, 6]]],
					["5,5,5", [[SignalType.Heat, 7]]],
				]);
				const hagalazOutput = evaluateHagalaz(5, 5, 5, Face.PosX, map);
				expect(hagalazOutput).not.toBeNull();
				expect(computeNaudizOutput(hagalazOutput?.strength)).toBe(0);
			});
		});

		describe("clock oscillator (Naudiz + Isa loop)", () => {
			it("oscillates with period = 2 × delay ticks", () => {
				// Simulate: Naudiz (no input) → emits → Isa (delay 1) → feeds back to Naudiz
				// Tick 0: Naudiz has no input → outputs 5
				// Tick 1: Isa releases delayed signal (5) → Naudiz has input → outputs 0
				// Tick 2: Isa releases delayed 0 (nothing) → Naudiz has no input → outputs 5
				// Period = 2 ticks

				const outputs: number[] = [];
				let naudizFeedback = 0;

				for (let tick = 0; tick < 6; tick++) {
					// Naudiz evaluates
					const naudizOutput = computeNaudizOutput(naudizFeedback);
					outputs.push(naudizOutput);

					// Isa would delay by 1 tick, so feedback arrives next tick
					// Simplified: feedback = previous tick's naudiz output
					naudizFeedback = naudizOutput;
				}

				// Pattern: 5, 0, 5, 0, 5, 0 (period = 2)
				expect(outputs[0]).toBe(NAUDIZ_OUTPUT_STRENGTH);
				expect(outputs[1]).toBe(0);
				expect(outputs[2]).toBe(NAUDIZ_OUTPUT_STRENGTH);
				expect(outputs[3]).toBe(0);
				expect(outputs[4]).toBe(NAUDIZ_OUTPUT_STRENGTH);
				expect(outputs[5]).toBe(0);
			});

			it("crystal Isa extends period to 4 ticks", () => {
				// With crystal delay = 2, oscillation period = 2 × 2 = 4 ticks
				// Tick 0: Naudiz outputs 5, Isa stores it
				// Tick 1: Naudiz outputs 5 (no feedback yet), Isa stores it
				// Tick 2: Isa releases tick-0 signal → Naudiz gets 5 → outputs 0
				// Tick 3: Isa releases tick-1 signal → Naudiz gets 5 → outputs 0
				// Tick 4: Isa releases tick-2 signal → Naudiz gets 0 → outputs 5
				// ...

				const outputs: number[] = [];
				const isaBuffer: number[] = [];
				const crystalDelay = 2;

				for (let tick = 0; tick < 8; tick++) {
					// Feedback = what Isa releases (delayed by crystalDelay ticks)
					const feedback = tick >= crystalDelay ? isaBuffer[tick - crystalDelay] : 0;
					const naudizOutput = computeNaudizOutput(feedback);
					outputs.push(naudizOutput);
					isaBuffer.push(naudizOutput);
				}

				// First 2 ticks: no feedback, Naudiz outputs 5
				expect(outputs[0]).toBe(5);
				expect(outputs[1]).toBe(5);
				// Ticks 2-3: feedback from ticks 0-1 (5), Naudiz outputs 0
				expect(outputs[2]).toBe(0);
				expect(outputs[3]).toBe(0);
				// Ticks 4-5: feedback from ticks 2-3 (0), Naudiz outputs 5
				expect(outputs[4]).toBe(5);
				expect(outputs[5]).toBe(5);
				// Period = 4 ticks
				expect(outputs[6]).toBe(0);
				expect(outputs[7]).toBe(0);
			});
		});

		describe("flip-flop stability", () => {
			it("cross-coupled Naudiz gates oscillate in sync (no Isa = no stability)", () => {
				// Without delay, two cross-connected NOT gates oscillate together.
				// Both start with no input → both output 5 → both receive 5 → both output 0 → ...
				const a_outputs: number[] = [];
				const b_outputs: number[] = [];
				let a_input = 0;
				let b_input = 0;

				for (let i = 0; i < 6; i++) {
					const a_out = computeNaudizOutput(a_input);
					const b_out = computeNaudizOutput(b_input);
					a_outputs.push(a_out);
					b_outputs.push(b_out);
					a_input = b_out;
					b_input = a_out;
				}

				// Both oscillate in phase: 5,0,5,0,5,0
				for (let i = 0; i < 6; i++) {
					expect(a_outputs[i]).toBe(b_outputs[i]);
				}
				expect(a_outputs[0]).toBe(NAUDIZ_OUTPUT_STRENGTH);
				expect(a_outputs[1]).toBe(0);
			});

			it("double NOT (Naudiz → Naudiz) preserves signal identity", () => {
				// Signal passes through two NOT gates = identity (with 2-tick delay)
				// Input=0 → NOT → 5 → NOT → 0 (matches original)
				// Input=5 → NOT → 0 → NOT → 5 (matches original)
				expect(computeNaudizOutput(computeNaudizOutput(0))).toBe(0);
				expect(computeNaudizOutput(computeNaudizOutput(5))).toBe(NAUDIZ_OUTPUT_STRENGTH);
			});
		});
	});
});
