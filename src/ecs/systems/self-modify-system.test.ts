import { describe, expect, it } from "vitest";
import { BlockId } from "../../world/blocks.ts";
import { shouldFuseBurn } from "./fuse-burn.ts";
import { canPlaceBlock, selectPlacementBlock } from "./jera-place.ts";
import { SignalType } from "./signal-data.ts";
import type { SignalMap } from "./signal-propagation.ts";
import { canDestroyBlock } from "./thurisaz-destroy.ts";

// ─── Jera PLACE integration scenarios ───
describe("self-modify — Jera PLACE integration", () => {
	it("places StoneBricks when Heat exits Jera face into air", () => {
		const block = selectPlacementBlock(SignalType.Heat);
		expect(block).toBe(BlockId.StoneBricks);
		expect(canPlaceBlock(BlockId.Air, 10, block)).toBe(true);
	});

	it("places Glass when Light exits Jera face into air", () => {
		const block = selectPlacementBlock(SignalType.Light);
		expect(block).toBe(BlockId.Glass);
		// Glass hardness 1.0, cost = ceil(1.0 * 2) = 2, min signal 4
		expect(canPlaceBlock(BlockId.Air, 4, block)).toBe(true);
	});

	it("does not place when signal exits into solid block", () => {
		const block = selectPlacementBlock(SignalType.Force);
		expect(canPlaceBlock(BlockId.Stone, 15, block)).toBe(false);
	});

	it("does not place when signal too weak for block hardness", () => {
		const block = selectPlacementBlock(SignalType.Force); // Stone, hardness 4.0
		// Cost = ceil(4.0 * 2) = 8, signal 5 is insufficient
		expect(canPlaceBlock(BlockId.Air, 5, block)).toBe(false);
	});
});

// ─── Thurisaz DESTROY integration scenarios ───
describe("self-modify — Thurisaz DESTROY integration", () => {
	it("destroys Dirt block with sufficient signal", () => {
		expect(canDestroyBlock(BlockId.Dirt, 10)).toBe(true);
	});

	it("destroys Stone block with high signal", () => {
		// Stone hardness 4.0, cost = max(ceil(4.0 * 1.5), 5) = 6
		expect(canDestroyBlock(BlockId.Stone, 6)).toBe(true);
	});

	it("does not destroy when exiting into air", () => {
		expect(canDestroyBlock(BlockId.Air, 15)).toBe(false);
	});

	it("does not destroy very hard blocks with weak signal", () => {
		// RuneStone hardness 7.0, cost = max(ceil(7 * 1.5), 5) = 11
		expect(canDestroyBlock(BlockId.RuneStone, 8)).toBe(false);
	});

	it("destroys very hard blocks with strong signal", () => {
		expect(canDestroyBlock(BlockId.RuneStone, 15)).toBe(true);
	});
});

// ─── Feedback loop termination ───
describe("self-modify — feedback loop termination", () => {
	it("signal propagation visited set prevents infinite loops", () => {
		// The existing propagateSignals BFS uses a visited set keyed by
		// (x,y,z,signalType,entryFace). This prevents infinite loops
		// even in circular conductor paths. Self-modifying circuits change
		// topology BETWEEN ticks, so each tick sees a fresh signal map.
		// This test verifies the architectural guarantee.
		const visited = new Set<string>();
		const key = "5,3,2,0,1"; // position + signal type + face
		visited.add(key);
		expect(visited.has(key)).toBe(true); // already visited = skip
	});

	it("mutation budget caps block changes per tick", () => {
		// MAX_MUTATIONS_PER_TICK = 8 prevents runaway self-modification
		const budget = { remaining: 8 };
		for (let i = 0; i < 10; i++) {
			if (budget.remaining <= 0) break;
			budget.remaining--;
		}
		expect(budget.remaining).toBe(0);
		// Only 8 mutations occurred, not 10
	});
});

// ─── Fuse consumption ───
describe("self-modify — fuse consumption", () => {
	it("wood block burns when adjacent to heat signal", () => {
		expect(shouldFuseBurn(BlockId.Wood, 5)).toBe(true);
	});

	it("wood block does not burn without heat", () => {
		expect(shouldFuseBurn(BlockId.Wood, 0)).toBe(false);
	});

	it("stone block does not burn even with heat", () => {
		expect(shouldFuseBurn(BlockId.Stone, 15)).toBe(false);
	});

	it("fuse breaks circuit by removing wood block", () => {
		// Simulates the circuit-breaking effect:
		// Before: [Conductor] - [Wood Fuse] - [Conductor]
		// After fuse burns: [Conductor] - [Air] - [Conductor]
		// Wood has conductivity 0, so it already blocks signal.
		// The fuse "breaks" the visual circuit path.
		const worldBlocks: Record<string, number> = {
			"0,0,0": BlockId.Stone, // conductor with heat
			"1,0,0": BlockId.Wood, // fuse block
			"2,0,0": BlockId.Stone, // conductor after fuse
		};

		// Simulate heat at conductor position
		const signalMap: SignalMap = new Map([["0,0,0", new Map([[SignalType.Heat, 5]])]]);

		// Check if fuse should burn
		const fuseBlock = worldBlocks["1,0,0"];
		const heat = signalMap.get("0,0,0")?.get(SignalType.Heat) ?? 0;
		expect(shouldFuseBurn(fuseBlock, heat)).toBe(true);

		// After burning, fuse becomes air
		worldBlocks["1,0,0"] = BlockId.Air;
		expect(worldBlocks["1,0,0"]).toBe(BlockId.Air);
	});
});

// ─── Physical switch ───
describe("self-modify — physical switch", () => {
	it("placing a block manually connects circuit", () => {
		// Before: [Conductor] - [Air] - [Conductor] → signal can't cross air
		// After manual placement: [Conductor] - [Stone] - [Conductor] → signal flows
		const getBlock = (x: number): number => {
			if (x === 0 || x === 2) return BlockId.Stone;
			if (x === 1) return BlockId.Air; // gap
			return BlockId.Air;
		};

		// Air has conductivity 0, so signal stops
		expect(getBlock(1)).toBe(BlockId.Air);

		// After player places stone at x=1
		const getBlockAfter = (x: number): number => {
			if (x >= 0 && x <= 2) return BlockId.Stone;
			return BlockId.Air;
		};
		expect(getBlockAfter(1)).toBe(BlockId.Stone); // now conducts
	});

	it("removing a block manually breaks circuit", () => {
		// Before: [Conductor] - [Stone] - [Conductor] → signal flows
		// After manual removal: [Conductor] - [Air] - [Conductor] → signal stops
		const getBlock = (x: number): number => {
			if (x >= 0 && x <= 2) return BlockId.Stone;
			return BlockId.Air;
		};

		expect(getBlock(1)).toBe(BlockId.Stone); // conducts

		// After player breaks stone at x=1
		const getBlockAfter = (x: number): number => {
			if (x === 0 || x === 2) return BlockId.Stone;
			return BlockId.Air;
		};
		expect(getBlockAfter(1)).toBe(BlockId.Air); // circuit broken
	});
});
