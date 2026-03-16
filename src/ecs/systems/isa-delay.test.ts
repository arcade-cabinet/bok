import { afterEach, describe, expect, it } from "vitest";
import { ISA_CRYSTAL_DELAY, ISA_DEFAULT_DELAY } from "./computational-rune-data.ts";
import { evaluateIsa, getIsaDelay, popIsaOutput, pushIsaInput, resetIsaState } from "./isa-delay.ts";
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

describe("isa-delay", () => {
	describe("getIsaDelay", () => {
		it("returns 1 for non-crystal blocks", () => {
			expect(getIsaDelay(false)).toBe(ISA_DEFAULT_DELAY);
			expect(ISA_DEFAULT_DELAY).toBe(1);
		});

		it("returns 2 for crystal blocks", () => {
			expect(getIsaDelay(true)).toBe(ISA_CRYSTAL_DELAY);
			expect(ISA_CRYSTAL_DELAY).toBe(2);
		});
	});

	describe("pushIsaInput / popIsaOutput — delay timing", () => {
		it("signal is not available until delay ticks pass", () => {
			pushIsaInput(0, 0, 0, SignalType.Heat, 8, 1);
			// At tick 1, with delay=1, need tick >= 2 for output
			expect(popIsaOutput(0, 0, 0, 1, 1)).toBeNull();
		});

		it("signal is available after exactly delay ticks", () => {
			pushIsaInput(0, 0, 0, SignalType.Heat, 8, 1);
			const result = popIsaOutput(0, 0, 0, 1, 2);
			expect(result).not.toBeNull();
			expect(result!.signalType).toBe(SignalType.Heat);
			expect(result!.strength).toBe(8);
		});

		it("crystal delay requires 2 ticks", () => {
			pushIsaInput(0, 0, 0, SignalType.Light, 10, 1);
			expect(popIsaOutput(0, 0, 0, 2, 2)).toBeNull(); // only 1 tick passed
			const result = popIsaOutput(0, 0, 0, 2, 3); // 2 ticks passed
			expect(result).not.toBeNull();
			expect(result!.strength).toBe(10);
		});

		it("preserves signal type through delay", () => {
			pushIsaInput(5, 3, 2, SignalType.Detection, 6, 10);
			const result = popIsaOutput(5, 3, 2, 1, 11);
			expect(result!.signalType).toBe(SignalType.Detection);
		});

		it("preserves signal strength through delay", () => {
			pushIsaInput(0, 0, 0, SignalType.Heat, 12, 5);
			const result = popIsaOutput(0, 0, 0, 1, 6);
			expect(result!.strength).toBe(12);
		});

		it("returns null when no input was ever pushed", () => {
			expect(popIsaOutput(0, 0, 0, 1, 100)).toBeNull();
		});

		it("consecutive signals are delayed independently", () => {
			pushIsaInput(0, 0, 0, SignalType.Heat, 5, 1);
			pushIsaInput(0, 0, 0, SignalType.Heat, 10, 2);

			const r1 = popIsaOutput(0, 0, 0, 1, 2);
			expect(r1!.strength).toBe(5);

			const r2 = popIsaOutput(0, 0, 0, 1, 3);
			expect(r2!.strength).toBe(10);
		});
	});

	describe("evaluateIsa — integrated evaluation", () => {
		it("stores input and returns null on first tick (no prior data)", () => {
			const map = makeSignalMap([["0,0,0", [[SignalType.Heat, 8]]]]);
			const result = evaluateIsa(0, 0, 0, Face.PosX, map, false, 1);
			expect(result).toBeNull();
		});

		it("outputs delayed signal on subsequent tick", () => {
			const map = makeSignalMap([["0,0,0", [[SignalType.Heat, 8]]]]);
			// Tick 1: store input
			evaluateIsa(0, 0, 0, Face.PosX, map, false, 1);
			// Tick 2: should output the stored signal
			const emptyMap: SignalMap = new Map();
			const result = evaluateIsa(0, 0, 0, Face.PosX, emptyMap, false, 2);
			expect(result).not.toBeNull();
			expect(result!.strength).toBe(8);
			expect(result!.signalType).toBe(SignalType.Heat);
			expect(result!.face).toBe(Face.PosX);
		});

		it("crystal block delays by 2 ticks", () => {
			const map = makeSignalMap([["0,0,0", [[SignalType.Light, 10]]]]);
			evaluateIsa(0, 0, 0, Face.PosZ, map, true, 1);
			const emptyMap: SignalMap = new Map();
			// Tick 2: not ready yet (crystal delay = 2)
			const r2 = evaluateIsa(0, 0, 0, Face.PosZ, emptyMap, true, 2);
			expect(r2).toBeNull();
			// Tick 3: ready
			const r3 = evaluateIsa(0, 0, 0, Face.PosZ, emptyMap, true, 3);
			expect(r3).not.toBeNull();
			expect(r3!.strength).toBe(10);
		});

		it("passes no signal when input has no signal", () => {
			const emptyMap: SignalMap = new Map();
			evaluateIsa(0, 0, 0, Face.PosX, emptyMap, false, 1);
			evaluateIsa(0, 0, 0, Face.PosX, emptyMap, false, 2);
			const result = evaluateIsa(0, 0, 0, Face.PosX, emptyMap, false, 3);
			expect(result).toBeNull();
		});
	});

	describe("resetIsaState", () => {
		it("clears all delay buffers", () => {
			pushIsaInput(0, 0, 0, SignalType.Heat, 8, 1);
			resetIsaState();
			expect(popIsaOutput(0, 0, 0, 1, 2)).toBeNull();
		});
	});
});
