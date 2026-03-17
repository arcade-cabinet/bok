import { createWorld } from "koota";
import { beforeEach, describe, expect, test } from "vitest";
import { ResourceId } from "../../engine/runes/resource.ts";
import { WorldState } from "../../engine/runes/world-state.ts";
import { Inventory, PlayerTag, Position } from "../traits/index.ts";
import { resourceToItemId } from "./rune-resource-data.ts";
import {
	PICKUP_RADIUS,
	type RuneResourcePickupEffects,
	resetRuneResourcePickupState,
	runeResourcePickupSystem,
} from "./rune-resource-pickup.ts";

function makeEffects(): RuneResourcePickupEffects & {
	calls: Array<{ x: number; y: number; z: number; color: number; count: number }>;
} {
	const calls: Array<{ x: number; y: number; z: number; color: number; count: number }> = [];
	return {
		calls,
		spawnParticles: (x, y, z, color, count) => {
			calls.push({ x, y, z, color, count });
		},
	};
}

describe("rune-resource-pickup system", () => {
	beforeEach(() => {
		resetRuneResourcePickupState();
	});

	test("picks up resources within radius", () => {
		const world = createWorld();
		const ws = new WorldState();
		const fx = makeEffects();

		// Player at (5, 10, 5)
		world.spawn(PlayerTag, Position({ x: 5, y: 10, z: 5 }), Inventory());

		// Resource at (5, 10, 5) — same position, well within radius
		ws.add(5, 10, 5, ResourceId.Wood, 3);

		runeResourcePickupSystem(world, ws, fx);

		// Resource removed from world
		expect(ws.get(5, 10, 5)).toBeNull();

		// Added to inventory
		world.query(PlayerTag, Inventory).readEach(([inv]) => {
			const itemId = resourceToItemId(ResourceId.Wood);
			expect(inv.items[itemId]).toBe(3);
		});
	});

	test("ignores resources outside radius", () => {
		const world = createWorld();
		const ws = new WorldState();
		const fx = makeEffects();

		world.spawn(PlayerTag, Position({ x: 5, y: 10, z: 5 }), Inventory());

		// Resource far away
		ws.add(50, 10, 50, ResourceId.Ore, 2);

		runeResourcePickupSystem(world, ws, fx);

		// Still in world
		expect(ws.get(50, 10, 50)).not.toBeNull();
		expect(ws.get(50, 10, 50)?.qty).toBe(2);
	});

	test("triggers particle effect on pickup", () => {
		const world = createWorld();
		const ws = new WorldState();
		const fx = makeEffects();

		world.spawn(PlayerTag, Position({ x: 5, y: 10, z: 5 }), Inventory());
		ws.add(5, 10, 5, ResourceId.Ingot, 1);

		runeResourcePickupSystem(world, ws, fx);

		expect(fx.calls.length).toBe(1);
		expect(fx.calls[0].x).toBe(5);
		expect(fx.calls[0].y).toBe(10);
		expect(fx.calls[0].z).toBe(5);
	});

	test("does not pick up when inventory is full", () => {
		const world = createWorld();
		const ws = new WorldState();
		const fx = makeEffects();

		// Create player with a full inventory
		world.spawn(PlayerTag, Position({ x: 5, y: 10, z: 5 }), Inventory());
		world.query(PlayerTag, Inventory).updateEach(([inv]) => {
			inv.items[1] = inv.capacity; // fill to capacity
		});

		ws.add(5, 10, 5, ResourceId.Wood, 2);

		runeResourcePickupSystem(world, ws, fx);

		// Resource still in world
		expect(ws.get(5, 10, 5)).not.toBeNull();
		// No particles
		expect(fx.calls.length).toBe(0);
	});

	test("picks up multiple resources in one tick", () => {
		const world = createWorld();
		const ws = new WorldState();
		const fx = makeEffects();

		world.spawn(PlayerTag, Position({ x: 5, y: 10, z: 5 }), Inventory());

		// Two resources nearby
		ws.add(5, 10, 5, ResourceId.Wood, 2);
		ws.add(6, 10, 5, ResourceId.Ore, 1);

		runeResourcePickupSystem(world, ws, fx);

		expect(ws.get(5, 10, 5)).toBeNull();
		expect(ws.get(6, 10, 5)).toBeNull();

		world.query(PlayerTag, Inventory).readEach(([inv]) => {
			expect(inv.items[resourceToItemId(ResourceId.Wood)]).toBe(2);
			expect(inv.items[resourceToItemId(ResourceId.Ore)]).toBe(1);
		});

		expect(fx.calls.length).toBe(2);
	});

	test("partial pickup when inventory nearly full", () => {
		const world = createWorld();
		const ws = new WorldState();
		const fx = makeEffects();

		world.spawn(PlayerTag, Position({ x: 5, y: 10, z: 5 }), Inventory());
		world.query(PlayerTag, Inventory).updateEach(([inv]) => {
			inv.items[1] = inv.capacity - 2; // only 2 slots free
		});

		ws.add(5, 10, 5, ResourceId.Wood, 5);

		runeResourcePickupSystem(world, ws, fx);

		// Should have picked up 2, leaving 3
		expect(ws.get(5, 10, 5)?.qty).toBe(3);

		world.query(PlayerTag, Inventory).readEach(([inv]) => {
			const itemId = resourceToItemId(ResourceId.Wood);
			expect(inv.items[itemId]).toBe(2);
		});
	});

	test("does nothing when no player exists", () => {
		const world = createWorld();
		const ws = new WorldState();
		const fx = makeEffects();

		ws.add(5, 10, 5, ResourceId.Wood, 3);

		// Should not throw
		runeResourcePickupSystem(world, ws, fx);

		// Resource untouched
		expect(ws.get(5, 10, 5)?.qty).toBe(3);
	});

	test("pickup radius constant is reasonable", () => {
		expect(PICKUP_RADIUS).toBeGreaterThanOrEqual(2);
		expect(PICKUP_RADIUS).toBeLessThanOrEqual(6);
	});

	test("boundary: resource at exact edge of radius", () => {
		const world = createWorld();
		const ws = new WorldState();
		const fx = makeEffects();

		world.spawn(PlayerTag, Position({ x: 0, y: 0, z: 0 }), Inventory());

		// Place resource just inside the radius boundary
		const justInside = PICKUP_RADIUS - 0.5;
		ws.add(Math.floor(justInside), 0, 0, ResourceId.Sand, 1);

		runeResourcePickupSystem(world, ws, fx);

		// Should be picked up (cell center is within radius)
		const cell = ws.get(Math.floor(justInside), 0, 0);
		expect(cell).toBeNull();
	});
});
