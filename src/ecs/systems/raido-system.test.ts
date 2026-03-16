import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestWorld, spawnPlayer } from "../../test-utils.ts";
import { BlockId } from "../../world/blocks.ts";
import { Inventory, PlayerTag, Position } from "../traits/index.ts";
import { CRYSTAL_DUST_ID, RAIDO_SCAN_INTERVAL } from "./raido-data.ts";
import type { RaidoEffects } from "./raido-system.ts";
import { executeFastTravel, getActiveAnchors, getActivePairs, raidoSystem, resetRaidoState } from "./raido-system.ts";
import type { TravelAnchor } from "./raido-travel.ts";
import { Face } from "./rune-data.ts";
import { getRuneIndex, resetRuneIndex } from "./rune-index.ts";

const noopEffects: RaidoEffects = {
	spawnParticles: vi.fn(),
};

afterEach(() => {
	resetRaidoState();
	resetRuneIndex();
});

describe("raidoSystem", () => {
	it("detects Raido anchors on RuneStone blocks", () => {
		const world = createTestWorld();
		spawnPlayer(world);
		const idx = getRuneIndex();
		idx.setRune(10, 5, 20, Face.PosX, 14); // Raido

		raidoSystem(world, RAIDO_SCAN_INTERVAL, () => BlockId.RuneStone, noopEffects);

		const anchors = getActiveAnchors();
		expect(anchors).toHaveLength(1);
		expect(anchors[0].x).toBe(10);
	});

	it("throttles scanning to RAIDO_SCAN_INTERVAL", () => {
		const world = createTestWorld();
		spawnPlayer(world);
		const idx = getRuneIndex();
		idx.setRune(10, 5, 20, Face.PosX, 14);

		// First call at half interval — should not scan
		raidoSystem(world, RAIDO_SCAN_INTERVAL / 2, () => BlockId.RuneStone, noopEffects);
		expect(getActiveAnchors()).toHaveLength(0);

		// Second call pushes past interval
		raidoSystem(world, RAIDO_SCAN_INTERVAL / 2, () => BlockId.RuneStone, noopEffects);
		expect(getActiveAnchors()).toHaveLength(1);
	});

	it("detects paired anchors within range", () => {
		const world = createTestWorld();
		spawnPlayer(world);
		const idx = getRuneIndex();
		idx.setRune(10, 5, 10, Face.PosX, 14);
		idx.setRune(20, 5, 20, Face.PosX, 14);

		raidoSystem(world, RAIDO_SCAN_INTERVAL, () => BlockId.RuneStone, noopEffects);

		expect(getActivePairs()).toHaveLength(1);
	});

	it("spawns particles at anchors", () => {
		const world = createTestWorld();
		spawnPlayer(world);
		const idx = getRuneIndex();
		idx.setRune(10, 5, 20, Face.PosX, 14);

		const effects: RaidoEffects = { spawnParticles: vi.fn() };
		raidoSystem(world, RAIDO_SCAN_INTERVAL, () => BlockId.RuneStone, effects);

		expect(effects.spawnParticles).toHaveBeenCalledOnce();
	});

	it("clears anchors when runes removed", () => {
		const world = createTestWorld();
		spawnPlayer(world);
		const idx = getRuneIndex();
		idx.setRune(10, 5, 20, Face.PosX, 14);

		raidoSystem(world, RAIDO_SCAN_INTERVAL, () => BlockId.RuneStone, noopEffects);
		expect(getActiveAnchors()).toHaveLength(1);

		// Remove the rune and rescan
		idx.removeRune(10, 5, 20, Face.PosX);
		raidoSystem(world, RAIDO_SCAN_INTERVAL, () => BlockId.RuneStone, noopEffects);
		expect(getActiveAnchors()).toHaveLength(0);
	});
});

describe("executeFastTravel", () => {
	it("teleports player and deducts crystal dust", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 0, y: 10, z: 0 } });

		// Give player crystal dust
		world.query(PlayerTag, Inventory).updateEach(([inv]) => {
			inv.items[CRYSTAL_DUST_ID] = 5;
		});

		const target: TravelAnchor = { x: 100, y: 20, z: 100, cx: 6, cz: 6 };
		const result = executeFastTravel(world, target, 2);

		expect(result).toBe(true);

		world.query(PlayerTag, Position, Inventory).readEach(([pos, inv]) => {
			expect(pos.x).toBeCloseTo(100.5);
			expect(pos.y).toBe(22); // 1 block above anchor
			expect(pos.z).toBeCloseTo(100.5);
			expect(inv.items[CRYSTAL_DUST_ID]).toBe(3); // 5 - 2
		});
	});

	it("fails when not enough crystal dust", () => {
		const world = createTestWorld();
		spawnPlayer(world, { position: { x: 0, y: 10, z: 0 } });

		// Give player only 1 crystal dust
		world.query(PlayerTag, Inventory).updateEach(([inv]) => {
			inv.items[CRYSTAL_DUST_ID] = 1;
		});

		const target: TravelAnchor = { x: 100, y: 20, z: 100, cx: 6, cz: 6 };
		const result = executeFastTravel(world, target, 2);

		expect(result).toBe(false);

		// Position unchanged
		world.query(PlayerTag, Position).readEach(([pos]) => {
			expect(pos.x).toBe(0);
		});
	});

	it("fails when no crystal dust in inventory", () => {
		const world = createTestWorld();
		spawnPlayer(world);

		const target: TravelAnchor = { x: 100, y: 20, z: 100, cx: 6, cz: 6 };
		const result = executeFastTravel(world, target, 1);
		expect(result).toBe(false);
	});
});
