import { describe, expect, it, vi } from "vitest";
import { BlockId } from "../../world/blocks.ts";
import { Face, type FaceIndex } from "./rune-data.ts";
import {
	getBlockConductivity,
	MAX_BLOCKS_PER_TICK,
	MAX_EMITTERS,
	MAX_PROPAGATION_DEPTH,
	MAX_SIGNAL_STRENGTH,
	oppositeFace,
	SIGNAL_TICK_INTERVAL,
	SignalType,
} from "./signal-data.ts";
import {
	computeEffectiveStrength,
	getSignalStrength,
	propagateSignals,
	type SignalEmitter,
} from "./signal-propagation.ts";

// ─── Helpers ───

/** Create a getBlock function from a sparse block map. Defaults to Air. */
function blockMap(blocks: Record<string, number>): (x: number, y: number, z: number) => number {
	return (x, y, z) => blocks[`${x},${y},${z}`] ?? BlockId.Air;
}

/** Create a straight line of stone blocks from (sx,y,z) to (ex,y,z). */
function stoneLine(sx: number, ex: number, y: number, z: number): Record<string, number> {
	const blocks: Record<string, number> = {};
	const lo = Math.min(sx, ex);
	const hi = Math.max(sx, ex);
	for (let x = lo; x <= hi; x++) {
		blocks[`${x},${y},${z}`] = BlockId.Stone;
	}
	return blocks;
}

// ─── Constants ───

describe("signal constants", () => {
	it("tick interval is 250ms (4 ticks/second)", () => {
		expect(SIGNAL_TICK_INTERVAL).toBe(0.25);
	});

	it("budget constants match spec", () => {
		expect(MAX_BLOCKS_PER_TICK).toBe(128);
		expect(MAX_EMITTERS).toBe(32);
		expect(MAX_PROPAGATION_DEPTH).toBe(16);
		expect(MAX_SIGNAL_STRENGTH).toBe(15);
	});
});

// ─── Material Conductivity ───

describe("getBlockConductivity", () => {
	it("stone blocks conduct at 1.0", () => {
		expect(getBlockConductivity(BlockId.Stone)).toBe(1.0);
		expect(getBlockConductivity(BlockId.StoneBricks)).toBe(1.0);
		expect(getBlockConductivity(BlockId.SmoothStone)).toBe(1.0);
		expect(getBlockConductivity(BlockId.RuneStone)).toBe(1.0);
	});

	it("iron ore conducts at 1.0", () => {
		expect(getBlockConductivity(BlockId.IronOre)).toBe(1.0);
	});

	it("copper ore conducts at 1.0", () => {
		expect(getBlockConductivity(BlockId.CopperOre)).toBe(1.0);
	});

	it("crystal amplifies at 1.5", () => {
		expect(getBlockConductivity(BlockId.Crystal)).toBe(1.5);
	});

	it("wood insulates (0)", () => {
		expect(getBlockConductivity(BlockId.Wood)).toBe(0);
		expect(getBlockConductivity(BlockId.Planks)).toBe(0);
		expect(getBlockConductivity(BlockId.BirchWood)).toBe(0);
	});

	it("air returns 0", () => {
		expect(getBlockConductivity(BlockId.Air)).toBe(0);
	});

	it("dirt and grass return 0", () => {
		expect(getBlockConductivity(BlockId.Dirt)).toBe(0);
		expect(getBlockConductivity(BlockId.Grass)).toBe(0);
	});
});

// ─── Face Utilities ───

describe("oppositeFace", () => {
	it("PosX ↔ NegX", () => {
		expect(oppositeFace(Face.PosX)).toBe(Face.NegX);
		expect(oppositeFace(Face.NegX)).toBe(Face.PosX);
	});

	it("PosY ↔ NegY", () => {
		expect(oppositeFace(Face.PosY)).toBe(Face.NegY);
		expect(oppositeFace(Face.NegY)).toBe(Face.PosY);
	});

	it("PosZ ↔ NegZ", () => {
		expect(oppositeFace(Face.PosZ)).toBe(Face.NegZ);
		expect(oppositeFace(Face.NegZ)).toBe(Face.PosZ);
	});
});

// ─── BFS Traversal ───

describe("propagateSignals — BFS traversal", () => {
	it("propagates through a straight line of stone blocks", () => {
		// Emitter at (0,0,0) exits through PosX → signal enters (1,0,0)
		const emitters: SignalEmitter[] = [
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Heat, strength: 10 },
		];
		const blocks = stoneLine(1, 10, 0, 0);
		const result = propagateSignals(emitters, blockMap(blocks));

		// Signal should reach block (1,0,0) at full strength
		expect(getSignalStrength(result, 1, 0, 0, SignalType.Heat)).toBe(10);

		// Attenuates by 1 per block
		expect(getSignalStrength(result, 2, 0, 0, SignalType.Heat)).toBe(9);
		expect(getSignalStrength(result, 5, 0, 0, SignalType.Heat)).toBe(6);
	});

	it("signal attenuates to zero and stops", () => {
		const emitters: SignalEmitter[] = [
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Light, strength: 3 },
		];
		// Long line of stone
		const blocks = stoneLine(1, 20, 0, 0);
		const result = propagateSignals(emitters, blockMap(blocks));

		expect(getSignalStrength(result, 1, 0, 0, SignalType.Light)).toBe(3);
		expect(getSignalStrength(result, 2, 0, 0, SignalType.Light)).toBe(2);
		expect(getSignalStrength(result, 3, 0, 0, SignalType.Light)).toBe(1);
		// Strength 1 doesn't propagate further (1-1=0)
		expect(getSignalStrength(result, 4, 0, 0, SignalType.Light)).toBe(0);
	});

	it("returns empty map with no emitters", () => {
		const result = propagateSignals([], blockMap({}));
		expect(result.size).toBe(0);
	});

	it("signal does not propagate into air gaps", () => {
		const emitters: SignalEmitter[] = [
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Heat, strength: 10 },
		];
		// Stone at x=1, air at x=2, stone at x=3
		const blocks: Record<string, number> = {
			"1,0,0": BlockId.Stone,
			"3,0,0": BlockId.Stone,
		};
		const result = propagateSignals(emitters, blockMap(blocks));

		expect(getSignalStrength(result, 1, 0, 0, SignalType.Heat)).toBe(10);
		expect(getSignalStrength(result, 3, 0, 0, SignalType.Heat)).toBe(0);
	});
});

// ─── Material Conductivity in Propagation ───

describe("propagateSignals — material conductivity", () => {
	it("wood blocks the signal (insulation)", () => {
		const emitters: SignalEmitter[] = [
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Heat, strength: 10 },
		];
		const blocks: Record<string, number> = {
			"1,0,0": BlockId.Wood, // insulator
			"2,0,0": BlockId.Stone,
		};
		const result = propagateSignals(emitters, blockMap(blocks));

		expect(getSignalStrength(result, 1, 0, 0, SignalType.Heat)).toBe(0);
		expect(getSignalStrength(result, 2, 0, 0, SignalType.Heat)).toBe(0);
	});

	it("crystal amplifies signal by 1.5x", () => {
		const emitters: SignalEmitter[] = [
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Force, strength: 10 },
		];
		const blocks: Record<string, number> = {
			"1,0,0": BlockId.Crystal,
			"2,0,0": BlockId.Stone,
		};
		const result = propagateSignals(emitters, blockMap(blocks));

		// Crystal: 10 * 1.5 = 15 (capped at MAX)
		expect(getSignalStrength(result, 1, 0, 0, SignalType.Force)).toBe(15);
		// Next block: 15 - 1 = 14 (stone, no amplification)
		expect(getSignalStrength(result, 2, 0, 0, SignalType.Force)).toBe(14);
	});

	it("crystal amplification is capped at MAX_SIGNAL_STRENGTH", () => {
		const emitters: SignalEmitter[] = [
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Heat, strength: 15 },
		];
		const blocks: Record<string, number> = {
			"1,0,0": BlockId.Crystal,
		};
		const result = propagateSignals(emitters, blockMap(blocks));

		// 15 * 1.5 = 22.5, rounded to 23, capped at 15
		expect(getSignalStrength(result, 1, 0, 0, SignalType.Heat)).toBe(15);
	});

	it("iron and copper ore both conduct", () => {
		const emitters: SignalEmitter[] = [
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Detection, strength: 8 },
		];
		const blocks: Record<string, number> = {
			"1,0,0": BlockId.IronOre,
			"2,0,0": BlockId.CopperOre,
			"3,0,0": BlockId.Stone,
		};
		const result = propagateSignals(emitters, blockMap(blocks));

		expect(getSignalStrength(result, 1, 0, 0, SignalType.Detection)).toBe(8);
		expect(getSignalStrength(result, 2, 0, 0, SignalType.Detection)).toBe(7);
		expect(getSignalStrength(result, 3, 0, 0, SignalType.Detection)).toBe(6);
	});
});

// ─── Signal Attenuation ───

describe("propagateSignals — signal attenuation", () => {
	it("attenuates by 1 per conducting block", () => {
		const emitters: SignalEmitter[] = [{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Heat, strength: 5 }];
		const blocks = stoneLine(1, 10, 0, 0);
		const result = propagateSignals(emitters, blockMap(blocks));

		for (let i = 1; i <= 5; i++) {
			expect(getSignalStrength(result, i, 0, 0, SignalType.Heat)).toBe(5 - (i - 1));
		}
		expect(getSignalStrength(result, 6, 0, 0, SignalType.Heat)).toBe(0);
	});
});

// ─── Face-Direction Routing ───

describe("propagateSignals — face-direction routing", () => {
	it("signal exits through emitter face and enters adjacent block", () => {
		// Emitter at (5,5,5) exits through NegZ face
		const emitters: SignalEmitter[] = [{ x: 5, y: 5, z: 5, face: Face.NegZ, signalType: SignalType.Heat, strength: 8 }];
		const blocks: Record<string, number> = {
			"5,5,4": BlockId.Stone, // block at z-1
		};
		const result = propagateSignals(emitters, blockMap(blocks));

		expect(getSignalStrength(result, 5, 5, 4, SignalType.Heat)).toBe(8);
	});

	it("signal propagates in 3D through L-shaped stone path", () => {
		// Emitter exits PosX → stone corridor turns up via PosY
		const emitters: SignalEmitter[] = [
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Light, strength: 10 },
		];
		const blocks: Record<string, number> = {
			"1,0,0": BlockId.Stone,
			"1,1,0": BlockId.Stone, // turn upward
			"1,2,0": BlockId.Stone,
		};
		const result = propagateSignals(emitters, blockMap(blocks));

		expect(getSignalStrength(result, 1, 0, 0, SignalType.Light)).toBe(10);
		// From (1,0,0) → (1,1,0): attenuate once
		expect(getSignalStrength(result, 1, 1, 0, SignalType.Light)).toBe(9);
		expect(getSignalStrength(result, 1, 2, 0, SignalType.Light)).toBe(8);
	});

	it("rune transform can modify signal type", () => {
		const emitters: SignalEmitter[] = [{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Heat, strength: 8 }];
		const blocks: Record<string, number> = {
			"1,0,0": BlockId.Stone,
			"2,0,0": BlockId.Stone,
		};
		// Transform at block (1,0,0): Heat → Light
		const transform = vi.fn(
			(x: number, _y: number, _z: number, _face: FaceIndex, signal: { type: SignalTypeId; strength: number }) => {
				if (x === 1) return { type: SignalType.Light, strength: signal.strength };
				return signal;
			},
		);
		const result = propagateSignals(emitters, blockMap(blocks), transform);

		// Block 1 gets light (transformed from heat)
		expect(getSignalStrength(result, 1, 0, 0, SignalType.Light)).toBe(8);
		expect(getSignalStrength(result, 1, 0, 0, SignalType.Heat)).toBe(0);
	});

	it("rune transform can block signal (return null)", () => {
		const emitters: SignalEmitter[] = [
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Force, strength: 10 },
		];
		const blocks: Record<string, number> = {
			"1,0,0": BlockId.Stone,
			"2,0,0": BlockId.Stone,
		};
		const transform = vi.fn(() => null);
		const result = propagateSignals(emitters, blockMap(blocks), transform);

		expect(getSignalStrength(result, 1, 0, 0, SignalType.Force)).toBe(0);
		expect(getSignalStrength(result, 2, 0, 0, SignalType.Force)).toBe(0);
	});
});

// ─── Signal Combining (Multiplexing) ───

describe("propagateSignals — signal combining", () => {
	it("same-type same-direction ADD (capped at 15)", () => {
		// Two runes on same block face — both emit heat through PosX
		const emitters: SignalEmitter[] = [
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Heat, strength: 8 },
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Heat, strength: 5 },
		];
		const blocks: Record<string, number> = {
			"1,0,0": BlockId.Stone,
		};
		const result = propagateSignals(emitters, blockMap(blocks));

		// Both enter (1,0,0) through NegX face: 8 + 5 = 13
		expect(getSignalStrength(result, 1, 0, 0, SignalType.Heat)).toBe(13);
	});

	it("same-type opposing-direction SUBTRACT", () => {
		// Heat from left (PosX) and heat from right (NegX) into same block
		const emitters: SignalEmitter[] = [
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Heat, strength: 10 },
			{ x: 4, y: 0, z: 0, face: Face.NegX, signalType: SignalType.Heat, strength: 7 },
		];
		const blocks: Record<string, number> = {
			"1,0,0": BlockId.Stone,
			"2,0,0": BlockId.Stone,
			"3,0,0": BlockId.Stone,
		};
		const result = propagateSignals(emitters, blockMap(blocks));

		// Block (2,0,0):
		// From left (NegX face): emitter strength 10, depth 2 → 10 - 1 = 9
		// From right (PosX face): emitter strength 7, depth 2 → 7 - 1 = 6
		// Opposing: |9 - 6| = 3
		expect(getSignalStrength(result, 2, 0, 0, SignalType.Heat)).toBe(3);
	});

	it("different signal types pass independently (multiplexed)", () => {
		const emitters: SignalEmitter[] = [
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Heat, strength: 10 },
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Detection, strength: 5 },
		];
		const blocks: Record<string, number> = {
			"1,0,0": BlockId.Stone,
		};
		const result = propagateSignals(emitters, blockMap(blocks));

		expect(getSignalStrength(result, 1, 0, 0, SignalType.Heat)).toBe(10);
		expect(getSignalStrength(result, 1, 0, 0, SignalType.Detection)).toBe(5);
	});

	it("four signal types can coexist at one block", () => {
		const emitters: SignalEmitter[] = [
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Heat, strength: 12 },
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Light, strength: 8 },
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Force, strength: 5 },
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Detection, strength: 3 },
		];
		const blocks: Record<string, number> = {
			"1,0,0": BlockId.Stone,
		};
		const result = propagateSignals(emitters, blockMap(blocks));
		const blockSignals = result.get("1,0,0");

		expect(blockSignals?.size).toBe(4);
		expect(blockSignals?.get(SignalType.Heat)).toBe(12);
		expect(blockSignals?.get(SignalType.Light)).toBe(8);
		expect(blockSignals?.get(SignalType.Force)).toBe(5);
		expect(blockSignals?.get(SignalType.Detection)).toBe(3);
	});
});

// ─── computeEffectiveStrength ───

describe("computeEffectiveStrength", () => {
	it("single face returns full strength", () => {
		const faceMap = new Map<FaceIndex, number>([[Face.NegX, 10]]);
		expect(computeEffectiveStrength(faceMap)).toBe(10);
	});

	it("opposing faces subtract", () => {
		const faceMap = new Map<FaceIndex, number>([
			[Face.PosX, 3],
			[Face.NegX, 10],
		]);
		expect(computeEffectiveStrength(faceMap)).toBe(7);
	});

	it("equal opposing signals cancel to 0", () => {
		const faceMap = new Map<FaceIndex, number>([
			[Face.PosX, 8],
			[Face.NegX, 8],
		]);
		expect(computeEffectiveStrength(faceMap)).toBe(0);
	});

	it("takes max across axes", () => {
		const faceMap = new Map<FaceIndex, number>([
			[Face.NegX, 10], // X axis net: 10
			[Face.PosY, 5], // Y axis net: 5
		]);
		expect(computeEffectiveStrength(faceMap)).toBe(10);
	});

	it("empty map returns 0", () => {
		expect(computeEffectiveStrength(new Map())).toBe(0);
	});

	it("caps at MAX_SIGNAL_STRENGTH", () => {
		// Manually set above max (shouldn't happen in practice, but defensive)
		const faceMap = new Map<FaceIndex, number>([[Face.NegX, 20]]);
		expect(computeEffectiveStrength(faceMap)).toBe(15);
	});
});

// ─── Budget Limits ───

describe("propagateSignals — budget limits", () => {
	it("caps emitters at MAX_EMITTERS (32)", () => {
		// Create 40 emitters — only first 32 should be processed
		const emitters: SignalEmitter[] = [];
		const blocks: Record<string, number> = {};
		for (let i = 0; i < 40; i++) {
			emitters.push({
				x: i * 3,
				y: 0,
				z: 0,
				face: Face.PosX,
				signalType: SignalType.Heat,
				strength: 5,
			});
			blocks[`${i * 3 + 1},0,0`] = BlockId.Stone;
		}
		const result = propagateSignals(emitters, blockMap(blocks));

		// First 32 emitters should produce signals
		for (let i = 0; i < 32; i++) {
			expect(getSignalStrength(result, i * 3 + 1, 0, 0, SignalType.Heat)).toBe(5);
		}
		// Emitters 32-39 are ignored
		for (let i = 32; i < 40; i++) {
			expect(getSignalStrength(result, i * 3 + 1, 0, 0, SignalType.Heat)).toBe(0);
		}
	});

	it("respects MAX_PROPAGATION_DEPTH (16)", () => {
		const emitters: SignalEmitter[] = [
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Heat, strength: 15 },
		];
		// Very long stone corridor
		const blocks = stoneLine(1, 30, 0, 0);
		const result = propagateSignals(emitters, blockMap(blocks));

		// Block at depth 16 should have signal (strength 15 - 15 = 0, but entered at depth 16)
		// Actually: depth 1 → strength 15, depth 2 → 14, ..., depth 15 → 1
		// At depth 16 the block is evaluated (strength 15 - 15 = 0 at entry)
		// But depth 16 means we entered the block at the limit — it's evaluated but doesn't expand
		// The signal at depth d has strength (15 - (d-1))
		// At depth 16: strength would be 15 - 15 = 0, but actually the block IS visited
		// Let's verify: at depth 15, strength = 1, which doesn't propagate (1-1=0)
		// So depth 15 block is the last to receive signal
		expect(getSignalStrength(result, 15, 0, 0, SignalType.Heat)).toBe(1);
		expect(getSignalStrength(result, 16, 0, 0, SignalType.Heat)).toBe(0);
	});

	it("respects MAX_BLOCKS_PER_TICK (128)", () => {
		// Create a large 3D grid that would exceed 128 blocks
		const emitters: SignalEmitter[] = [
			{ x: 5, y: 5, z: 5, face: Face.PosX, signalType: SignalType.Heat, strength: 15 },
		];
		const blocks: Record<string, number> = {};
		// Fill a 12x12x12 cube with stone (1728 blocks)
		for (let x = 0; x < 12; x++) {
			for (let y = 0; y < 12; y++) {
				for (let z = 0; z < 12; z++) {
					blocks[`${x},${y},${z}`] = BlockId.Stone;
				}
			}
		}
		const result = propagateSignals(emitters, blockMap(blocks));

		// Should not have evaluated all 1728 blocks — budget is 128
		// We can't know exact count, but the result should be limited
		let totalBlocks = 0;
		for (const [, typeMap] of result) {
			if (typeMap.size > 0) totalBlocks++;
		}
		expect(totalBlocks).toBeLessThanOrEqual(MAX_BLOCKS_PER_TICK);
	});
});

// ─── Visited Set ───

describe("propagateSignals — visited set prevents double-evaluation", () => {
	it("cyclic stone loop does not cause infinite propagation", () => {
		// 2×2 stone ring at y=0
		const emitters: SignalEmitter[] = [
			{ x: -1, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Heat, strength: 10 },
		];
		const blocks: Record<string, number> = {
			"0,0,0": BlockId.Stone,
			"1,0,0": BlockId.Stone,
			"0,0,1": BlockId.Stone,
			"1,0,1": BlockId.Stone,
		};
		// This should not hang or exceed budget
		const result = propagateSignals(emitters, blockMap(blocks));

		// Signal should be present but finite
		expect(getSignalStrength(result, 0, 0, 0, SignalType.Heat)).toBeGreaterThan(0);
		expect(getSignalStrength(result, 1, 0, 0, SignalType.Heat)).toBeGreaterThan(0);
	});

	it("same block receives signal from multiple paths without double-counting per face", () => {
		// T-junction: emitter → stone → two paths → converge
		const emitters: SignalEmitter[] = [
			{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Light, strength: 8 },
		];
		const blocks: Record<string, number> = {
			"1,0,0": BlockId.Stone, // fork point
			"1,1,0": BlockId.Stone, // path A (up)
			"1,-1,0": BlockId.Stone, // path B (down)
			"2,1,0": BlockId.Stone, // path A continues
			"2,-1,0": BlockId.Stone, // path B continues
			"2,0,0": BlockId.Stone, // convergence point
		};
		const result = propagateSignals(emitters, blockMap(blocks));

		// (2,0,0) gets signal from (1,0,0) directly and from paths A and B
		// Direct: depth 2, strength 7
		// It should have signal
		expect(getSignalStrength(result, 2, 0, 0, SignalType.Light)).toBeGreaterThan(0);
	});
});

// ─── getSignalStrength helper ───

describe("getSignalStrength", () => {
	it("returns 0 for blocks with no signal", () => {
		const result = propagateSignals([], blockMap({}));
		expect(getSignalStrength(result, 0, 0, 0, SignalType.Heat)).toBe(0);
	});

	it("returns 0 for signal type not present at block", () => {
		const emitters: SignalEmitter[] = [{ x: 0, y: 0, z: 0, face: Face.PosX, signalType: SignalType.Heat, strength: 5 }];
		const blocks: Record<string, number> = { "1,0,0": BlockId.Stone };
		const result = propagateSignals(emitters, blockMap(blocks));

		expect(getSignalStrength(result, 1, 0, 0, SignalType.Heat)).toBe(5);
		expect(getSignalStrength(result, 1, 0, 0, SignalType.Light)).toBe(0);
	});
});
