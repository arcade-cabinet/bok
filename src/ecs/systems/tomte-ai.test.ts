import { beforeEach, describe, expect, test } from "vitest";
import {
	cleanupTomteState,
	getTomteEntityId,
	getTomteHint,
	isTomteSpawned,
	registerTomte,
	resetTomteState,
	shouldDespawnTomte,
	shouldSpawnTomte,
} from "./tomte-ai.ts";

describe("tomte-ai", () => {
	beforeEach(() => {
		resetTomteState();
	});

	describe("shouldSpawnTomte", () => {
		test("returns false when no structures built", () => {
			expect(shouldSpawnTomte(0, 0)).toBe(false);
		});

		test("returns true when first structure built and no runes discovered", () => {
			expect(shouldSpawnTomte(1, 0)).toBe(true);
		});

		test("returns false when tomte already spawned", () => {
			registerTomte(42);
			expect(shouldSpawnTomte(1, 0)).toBe(false);
		});

		test("returns false when 3+ runes already discovered", () => {
			expect(shouldSpawnTomte(1, 3)).toBe(false);
		});

		test("returns true with 2 runes discovered", () => {
			expect(shouldSpawnTomte(1, 2)).toBe(true);
		});
	});

	describe("shouldDespawnTomte", () => {
		test("returns false when tomte not spawned", () => {
			expect(shouldDespawnTomte(3)).toBe(false);
		});

		test("returns true when tomte spawned and 3+ runes discovered", () => {
			registerTomte(42);
			expect(shouldDespawnTomte(3)).toBe(true);
		});

		test("returns false when only 2 runes discovered", () => {
			registerTomte(42);
			expect(shouldDespawnTomte(2)).toBe(false);
		});
	});

	describe("singleton state", () => {
		test("registerTomte sets entity id and hint", () => {
			registerTomte(99);
			expect(isTomteSpawned()).toBe(true);
			expect(getTomteEntityId()).toBe(99);
			expect(getTomteHint()).toBe("…");
		});

		test("cleanupTomteState clears when matching entity", () => {
			registerTomte(99);
			cleanupTomteState(99);
			expect(isTomteSpawned()).toBe(false);
			expect(getTomteHint()).toBe(null);
		});

		test("cleanupTomteState ignores non-matching entity", () => {
			registerTomte(99);
			cleanupTomteState(42);
			expect(isTomteSpawned()).toBe(true);
		});

		test("resetTomteState clears everything", () => {
			registerTomte(99);
			resetTomteState();
			expect(isTomteSpawned()).toBe(false);
			expect(getTomteEntityId()).toBe(-1);
		});
	});
});
