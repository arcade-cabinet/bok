import { describe, expect, it } from "vitest";
import { NAUDIZ_OUTPUT_STRENGTH } from "./computational-rune-data.ts";
import { computeNaudizOutput, evaluateNaudiz, maxSignalAtBlock } from "./naudiz-not.ts";
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

describe("naudiz-not", () => {
	describe("computeNaudizOutput — NOT truth table", () => {
		it("outputs NAUDIZ_OUTPUT_STRENGTH when input is 0", () => {
			expect(computeNaudizOutput(0)).toBe(NAUDIZ_OUTPUT_STRENGTH);
		});

		it("outputs 0 when input is any positive value", () => {
			expect(computeNaudizOutput(1)).toBe(0);
			expect(computeNaudizOutput(5)).toBe(0);
			expect(computeNaudizOutput(15)).toBe(0);
		});

		it("default output strength is 5", () => {
			expect(NAUDIZ_OUTPUT_STRENGTH).toBe(5);
		});
	});

	describe("maxSignalAtBlock", () => {
		it("returns 0 for empty signal map", () => {
			const map: SignalMap = new Map();
			expect(maxSignalAtBlock(map, 0, 0, 0)).toBe(0);
		});

		it("returns 0 for block not in map", () => {
			const map = makeSignalMap([["1,1,1", [[SignalType.Heat, 5]]]]);
			expect(maxSignalAtBlock(map, 0, 0, 0)).toBe(0);
		});

		it("returns signal strength when present", () => {
			const map = makeSignalMap([["5,3,2", [[SignalType.Heat, 8]]]]);
			expect(maxSignalAtBlock(map, 5, 3, 2)).toBe(8);
		});

		it("returns max across multiple signal types", () => {
			const map = makeSignalMap([
				[
					"0,0,0",
					[
						[SignalType.Heat, 3],
						[SignalType.Light, 7],
						[SignalType.Detection, 5],
					],
				],
			]);
			expect(maxSignalAtBlock(map, 0, 0, 0)).toBe(7);
		});
	});

	describe("evaluateNaudiz", () => {
		it("emits when no signal at block", () => {
			const map: SignalMap = new Map();
			const result = evaluateNaudiz(5, 3, 2, Face.PosX, map);
			expect(result).not.toBeNull();
			expect(result?.strength).toBe(NAUDIZ_OUTPUT_STRENGTH);
			expect(result?.x).toBe(5);
			expect(result?.y).toBe(3);
			expect(result?.z).toBe(2);
			expect(result?.face).toBe(Face.PosX);
			expect(result?.signalType).toBe(SignalType.Force);
		});

		it("is silent when signal is present at block", () => {
			const map = makeSignalMap([["5,3,2", [[SignalType.Heat, 10]]]]);
			const result = evaluateNaudiz(5, 3, 2, Face.PosX, map);
			expect(result).toBeNull();
		});

		it("is silent even for weak signal", () => {
			const map = makeSignalMap([["0,0,0", [[SignalType.Light, 1]]]]);
			expect(evaluateNaudiz(0, 0, 0, Face.PosZ, map)).toBeNull();
		});

		it("emits on correct face", () => {
			const map: SignalMap = new Map();
			const result = evaluateNaudiz(1, 2, 3, Face.NegY, map);
			expect(result?.face).toBe(Face.NegY);
		});
	});
});
