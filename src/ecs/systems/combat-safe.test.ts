import { describe, expect, it } from "vitest";
import { createTestWorld, spawnCreature, spawnPlayer } from "../../test-utils.ts";
import { BehaviorState, CreatureAI } from "../traits/index.ts";
import { isInActiveCombat } from "./combat-safe.ts";

describe("combat-safe", () => {
	describe("isInActiveCombat", () => {
		it("returns false when no creatures exist", () => {
			const world = createTestWorld();
			spawnPlayer(world);
			expect(isInActiveCombat(world)).toBe(false);
		});

		it("returns false when creature is idle", () => {
			const world = createTestWorld();
			const player = spawnPlayer(world);
			const creature = spawnCreature(world);
			// Set target to player but state is Idle
			creature.set(CreatureAI, {
				behaviorState: BehaviorState.Idle,
				targetEntity: player.id(),
			});
			expect(isInActiveCombat(world)).toBe(false);
		});

		it("returns true when creature is chasing player", () => {
			const world = createTestWorld();
			const player = spawnPlayer(world);
			const creature = spawnCreature(world);
			creature.set(CreatureAI, {
				behaviorState: BehaviorState.Chase,
				targetEntity: player.id(),
			});
			expect(isInActiveCombat(world)).toBe(true);
		});

		it("returns true when creature is attacking player", () => {
			const world = createTestWorld();
			const player = spawnPlayer(world);
			const creature = spawnCreature(world);
			creature.set(CreatureAI, {
				behaviorState: BehaviorState.Attack,
				targetEntity: player.id(),
			});
			expect(isInActiveCombat(world)).toBe(true);
		});

		it("returns false when creature is fleeing", () => {
			const world = createTestWorld();
			const player = spawnPlayer(world);
			const creature = spawnCreature(world);
			creature.set(CreatureAI, {
				behaviorState: BehaviorState.Flee,
				targetEntity: player.id(),
			});
			expect(isInActiveCombat(world)).toBe(false);
		});

		it("returns false when creature targets non-player entity", () => {
			const world = createTestWorld();
			spawnPlayer(world);
			const creature = spawnCreature(world);
			creature.set(CreatureAI, {
				behaviorState: BehaviorState.Chase,
				targetEntity: -1,
			});
			expect(isInActiveCombat(world)).toBe(false);
		});

		it("returns true when any one of multiple creatures is in combat", () => {
			const world = createTestWorld();
			const player = spawnPlayer(world);
			spawnCreature(world); // idle
			const attacker = spawnCreature(world);
			attacker.set(CreatureAI, {
				behaviorState: BehaviorState.Attack,
				targetEntity: player.id(),
			});
			spawnCreature(world); // idle
			expect(isInActiveCombat(world)).toBe(true);
		});

		it("returns false when no player exists", () => {
			const world = createTestWorld();
			spawnCreature(world);
			expect(isInActiveCombat(world)).toBe(false);
		});
	});
});
