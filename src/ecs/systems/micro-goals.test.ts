import { describe, expect, it } from "vitest";
import { packChunk } from "./map-data.ts";
import { countUnexploredNearby, findMicroGoal } from "./micro-goals.ts";

describe("micro-goals", () => {
	describe("countUnexploredNearby", () => {
		it("returns full count when nothing explored", () => {
			const visited = new Set<number>();
			// 7×7 grid minus center = 48
			expect(countUnexploredNearby(0, 0, visited)).toBe(48);
		});

		it("returns 0 when everything explored", () => {
			const visited = new Set<number>();
			for (let dx = -3; dx <= 3; dx++) {
				for (let dz = -3; dz <= 3; dz++) {
					visited.add(packChunk(dx, dz));
				}
			}
			expect(countUnexploredNearby(0, 0, visited)).toBe(0);
		});

		it("excludes center chunk from count", () => {
			const visited = new Set<number>();
			// Add all chunks except center
			for (let dx = -3; dx <= 3; dx++) {
				for (let dz = -3; dz <= 3; dz++) {
					if (dx === 0 && dz === 0) continue;
					visited.add(packChunk(dx, dz));
				}
			}
			// All explored — center is never counted
			expect(countUnexploredNearby(0, 0, visited)).toBe(0);
		});

		it("works with offset player position", () => {
			const visited = new Set<number>();
			visited.add(packChunk(11, 11));
			// Only 1 of 48 explored
			expect(countUnexploredNearby(10, 10, visited)).toBe(47);
		});
	});

	describe("findMicroGoal", () => {
		const fullVisited = (() => {
			const s = new Set<number>();
			for (let dx = -3; dx <= 3; dx++) {
				for (let dz = -3; dz <= 3; dz++) {
					s.add(packChunk(dx, dz));
				}
			}
			return s;
		})();

		it("returns build_shelter when night approaches without shelter", () => {
			const goal = findMicroGoal(0, 0, new Set(), 0.7, false, false, 0, 0);
			expect(goal?.type).toBe("build_shelter");
		});

		it("returns explore_chunk when unexplored chunks exist", () => {
			const goal = findMicroGoal(0, 0, new Set(), 0.3, false, false, 0, 0);
			expect(goal?.type).toBe("explore_chunk");
		});

		it("returns observe_creature when creature nearby and all explored", () => {
			const goal = findMicroGoal(0, 0, fullVisited, 0.3, false, true, 0, 1);
			expect(goal?.type).toBe("observe_creature");
		});

		it("returns craft_tool when workstation tier is 0", () => {
			const goal = findMicroGoal(0, 0, fullVisited, 0.3, false, false, 0, 0);
			expect(goal?.type).toBe("craft_tool");
		});

		it("returns discover_rune when undiscovered runes exist", () => {
			const goal = findMicroGoal(0, 0, fullVisited, 0.3, false, false, 5, 1);
			expect(goal?.type).toBe("discover_rune");
		});

		it("returns find_landmark as fallback", () => {
			const goal = findMicroGoal(0, 0, fullVisited, 0.3, false, false, 0, 1);
			expect(goal?.type).toBe("find_landmark");
		});

		it("shelter goal has hint text", () => {
			const goal = findMicroGoal(0, 0, new Set(), 0.7, false, false, 0, 0);
			expect(goal?.hint).toBeTruthy();
			expect(goal?.hint.length).toBeGreaterThan(10);
		});

		it("does not suggest shelter when already sheltered", () => {
			const goal = findMicroGoal(0, 0, new Set(), 0.7, true, false, 0, 0);
			expect(goal?.type).not.toBe("build_shelter");
		});

		it("night approaching range is specific (0.65-0.8)", () => {
			// Before the range — should not suggest shelter
			const before = findMicroGoal(0, 0, fullVisited, 0.6, false, false, 0, 1);
			expect(before?.type).not.toBe("build_shelter");

			// After the range — should not suggest shelter
			const after = findMicroGoal(0, 0, fullVisited, 0.85, false, false, 0, 1);
			expect(after?.type).not.toBe("build_shelter");
		});
	});
});
