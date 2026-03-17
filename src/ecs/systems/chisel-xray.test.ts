import { describe, expect, it } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import { ChiselState, Hotbar, MiningState } from "../traits/index.ts";
import { chiselXraySystem, XRAY_HOLD_THRESHOLD } from "./chisel-xray.ts";
import { CHISEL_ITEM_ID } from "./rune-data.ts";

/** Equip a chisel in the player's active hotbar slot. */
function equipChisel(world: ReturnType<typeof createTestWorld>) {
	world.query(Hotbar).updateEach(([hotbar]) => {
		hotbar.slots[0] = { id: CHISEL_ITEM_ID, type: "item", durability: 500 };
		hotbar.activeSlot = 0;
	});
}

/** Set mining state to active (simulating button hold). */
function setMiningActive(world: ReturnType<typeof createTestWorld>, active: boolean) {
	world.query(MiningState).updateEach(([mining]) => {
		mining.active = active;
	});
}

describe("chisel-xray", () => {
	it("does not activate x-ray when chisel is not held", () => {
		const world = createTestWorld();
		const player = spawnPlayer(world);

		// Default hotbar (no chisel), mining active
		setMiningActive(world, true);
		chiselXraySystem(world, XRAY_HOLD_THRESHOLD + 0.1);

		expect(player.get(ChiselState)?.xrayActive).toBe(false);
	});

	it("does not activate x-ray when mining is not active", () => {
		const world = createTestWorld();
		const player = spawnPlayer(world);

		equipChisel(world);
		// Chisel active is set by rune-inscription system — manually set it here
		world.query(ChiselState).updateEach(([chisel]) => {
			chisel.active = true;
		});

		// Mining not active, even with long hold
		chiselXraySystem(world, XRAY_HOLD_THRESHOLD + 0.1);

		expect(player.get(ChiselState)?.xrayActive).toBe(false);
	});

	it("does not activate x-ray before threshold is reached", () => {
		const world = createTestWorld();
		const player = spawnPlayer(world);

		equipChisel(world);
		world.query(ChiselState).updateEach(([chisel]) => {
			chisel.active = true;
		});
		setMiningActive(world, true);

		// Small tick, not enough for threshold
		chiselXraySystem(world, XRAY_HOLD_THRESHOLD * 0.5);

		expect(player.get(ChiselState)?.xrayActive).toBe(false);
	});

	it("activates x-ray after hold threshold is reached", () => {
		const world = createTestWorld();
		const player = spawnPlayer(world);

		equipChisel(world);
		world.query(ChiselState).updateEach(([chisel]) => {
			chisel.active = true;
		});
		setMiningActive(world, true);

		// Accumulate past threshold
		chiselXraySystem(world, XRAY_HOLD_THRESHOLD * 0.6);
		chiselXraySystem(world, XRAY_HOLD_THRESHOLD * 0.6);

		expect(player.get(ChiselState)?.xrayActive).toBe(true);
	});

	it("deactivates x-ray when mining stops", () => {
		const world = createTestWorld();
		const player = spawnPlayer(world);

		equipChisel(world);
		world.query(ChiselState).updateEach(([chisel]) => {
			chisel.active = true;
		});
		setMiningActive(world, true);

		// Activate x-ray
		chiselXraySystem(world, XRAY_HOLD_THRESHOLD + 0.1);
		expect(player.get(ChiselState)?.xrayActive).toBe(true);

		// Release mining button
		setMiningActive(world, false);
		chiselXraySystem(world, 0.016);

		expect(player.get(ChiselState)?.xrayActive).toBe(false);
	});

	it("deactivates x-ray when chisel is unequipped", () => {
		const world = createTestWorld();
		const player = spawnPlayer(world);

		equipChisel(world);
		world.query(ChiselState).updateEach(([chisel]) => {
			chisel.active = true;
		});
		setMiningActive(world, true);

		// Activate x-ray
		chiselXraySystem(world, XRAY_HOLD_THRESHOLD + 0.1);
		expect(player.get(ChiselState)?.xrayActive).toBe(true);

		// Unequip chisel
		world.query(ChiselState).updateEach(([chisel]) => {
			chisel.active = false;
		});
		chiselXraySystem(world, 0.016);

		expect(player.get(ChiselState)?.xrayActive).toBe(false);
	});

	it("resets timer when conditions are interrupted", () => {
		const world = createTestWorld();
		const player = spawnPlayer(world);

		equipChisel(world);
		world.query(ChiselState).updateEach(([chisel]) => {
			chisel.active = true;
		});
		setMiningActive(world, true);

		// Partial hold
		chiselXraySystem(world, XRAY_HOLD_THRESHOLD * 0.4);
		expect(player.get(ChiselState)?.xrayActive).toBe(false);

		// Interrupt (release mining)
		setMiningActive(world, false);
		chiselXraySystem(world, 0.016);

		// Re-hold — timer should have reset
		setMiningActive(world, true);
		chiselXraySystem(world, XRAY_HOLD_THRESHOLD * 0.4);

		expect(player.get(ChiselState)?.xrayActive).toBe(false);
	});
});
