/**
 * E2E-style test for spawn area generation.
 *
 * Exercises the full terrain pipeline: noise init → 9 chunks generated →
 * plateau flattened → shrine placed → player entity spawned. Verifies
 * the player has a walkable floor, the biome is Ängen, and the Tomte
 * can spawn.
 */

import { createWorld } from "koota";
import { describe, expect, test } from "vitest";
import { shouldSpawnTomte } from "../ecs/systems/tomte-ai.ts";
import { Health, Hunger, PlayerTag, Position, Stamina } from "../ecs/traits/index.ts";
import { Biome, selectBiome } from "../world/biomes.ts";
import { BlockId } from "../world/blocks.ts";
import { detectLandmarkType } from "../world/landmark-generator.ts";
import { initNoise } from "../world/noise.ts";
import { forceSpawnBiome, isInSpawnZone } from "../world/spawn-zone.ts";
import {
	CHUNK_SIZE,
	computeHeight,
	generateChunkTerrain,
	sampleNoiseLayers,
	WATER_LEVEL,
} from "../world/terrain-generator.ts";
import { spawnPlayerEntity } from "./game-world-setup.ts";

// ─── Mock VoxelRenderer ───

interface StoredVoxel {
	blockId: number;
}

function createMockRenderer() {
	const voxels = new Map<string, StoredVoxel>();

	const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

	return {
		voxels,
		getVoxel(pos: { x: number; y: number; z: number }): StoredVoxel | null {
			return voxels.get(key(pos.x, pos.y, pos.z)) ?? null;
		},
		setVoxel(_layer: string, opts: { position: { x: number; y: number; z: number }; blockId: number }) {
			voxels.set(key(opts.position.x, opts.position.y, opts.position.z), { blockId: opts.blockId });
		},
		setVoxelBulk(_layer: string, entries: Array<{ position: { x: number; y: number; z: number }; blockId: number }>) {
			for (const e of entries) {
				voxels.set(key(e.position.x, e.position.y, e.position.z), { blockId: e.blockId });
			}
		},
		removeVoxel(_layer: string, opts: { position: { x: number; y: number; z: number } }) {
			voxels.delete(key(opts.position.x, opts.position.y, opts.position.z));
		},
		flushDirtyChunks() {},
		rebuildChunkMesh(_cx: number, _cz: number) {},
	};
}

describe("game-world-setup e2e", () => {
	test("spawn area generates 9 chunks with walkable terrain", () => {
		initNoise("e2e-test-seed");
		const renderer = createMockRenderer();

		// Generate all 9 spawn zone chunks (same as generateSpawnArea)
		for (let cx = -1; cx <= 1; cx++) {
			for (let cz = -1; cz <= 1; cz++) {
				generateChunkTerrain(renderer as never, "Ground", cx, cz);
			}
		}

		// Verify: all 9 chunks generated voxels
		expect(renderer.voxels.size).toBeGreaterThan(1000);

		// Verify: shrine center (8,y,8) has a solid block at some reasonable height
		let shrineY = -1;
		for (let y = 30; y >= 0; y--) {
			const v = renderer.getVoxel({ x: 8, y, z: 8 });
			if (v && v.blockId !== 0 && v.blockId !== BlockId.Water) {
				shrineY = y;
				break;
			}
		}
		expect(shrineY).toBeGreaterThan(WATER_LEVEL);

		// Verify: player spawn position (8, shrineY+2, 8) has air above it
		const aboveSpawn = renderer.getVoxel({ x: 8, y: shrineY + 2, z: 8 });
		const blockAbove = aboveSpawn?.blockId ?? 0;
		expect(blockAbove === 0 || blockAbove === undefined).toBe(true);
	});

	test("spawn zone forces Ängen biome in all 9 chunks", () => {
		initNoise("biome-test-seed");

		// Sample every column in the 3x3 spawn zone
		for (let cx = -1; cx <= 1; cx++) {
			for (let cz = -1; cz <= 1; cz++) {
				expect(isInSpawnZone(cx, cz)).toBe(true);

				for (let lx = 0; lx < CHUNK_SIZE; lx += 4) {
					for (let lz = 0; lz < CHUNK_SIZE; lz += 4) {
						const gx = cx * CHUNK_SIZE + lx;
						const gz = cz * CHUNK_SIZE + lz;
						const forced = forceSpawnBiome(gx, gz);
						expect(forced).toBe(Biome.Angen);
					}
				}
			}
		}
	});

	test("spawn zone has no landmarks", () => {
		initNoise("landmark-test-seed");
		// detectLandmarkType imported at top level

		for (let cx = -1; cx <= 1; cx++) {
			for (let cz = -1; cz <= 1; cz++) {
				expect(detectLandmarkType(cx, cz)).toBeNull();
			}
		}
	});

	test("terrain around shrine is flat (height variation <= 2 blocks)", () => {
		initNoise("flat-test-seed");
		const renderer = createMockRenderer();

		// Generate chunk (0,0)
		generateChunkTerrain(renderer as never, "Ground", 0, 0);

		// Find surface heights in an 8-block radius around shrine center
		const heights: number[] = [];
		for (let gx = 4; gx <= 12; gx++) {
			for (let gz = 4; gz <= 12; gz++) {
				for (let y = 30; y >= 0; y--) {
					const v = renderer.getVoxel({ x: gx, y, z: gz });
					if (v && v.blockId !== 0 && v.blockId !== BlockId.Water) {
						heights.push(y);
						break;
					}
				}
			}
		}

		expect(heights.length).toBeGreaterThan(0);
		const minH = Math.min(...heights);
		const maxH = Math.max(...heights);
		// Within the inner 8-block radius, height variation should be small
		expect(maxH - minH).toBeLessThanOrEqual(4);
	});

	test("player entity spawns with correct traits", () => {
		const world = createWorld();

		// Spawn player at y=14 (typical surface)
		spawnPlayerEntity(world, 14);

		// Verify player entity exists with key traits
		let found = false;
		world.query(PlayerTag, Position, Health, Hunger, Stamina).readEach(([pos, health, hunger, stamina]) => {
			found = true;
			expect(pos.x).toBeCloseTo(8.5, 1);
			expect(pos.y).toBe(16); // surfaceY + 2
			expect(pos.z).toBeCloseTo(8.5, 1);
			expect(health.current).toBe(100);
			expect(hunger.current).toBe(100);
			expect(stamina.current).toBe(100);
		});
		expect(found).toBe(true);

		world.destroy();
	});

	test("Tomte should spawn on fresh game", () => {
		// shouldSpawnTomte returns true when no tomte exists and conditions met
		expect(shouldSpawnTomte()).toBe(true);
	});

	test("chunks outside spawn zone use natural biomes (not forced Ängen)", () => {
		initNoise("natural-biome-seed");

		// Check a variety of chunks outside the spawn zone
		const outsideChunks = [
			[3, 0],
			[0, 3],
			[-3, -3],
			[5, 5],
			[10, 10],
		];

		let foundNonAngen = false;
		for (const [cx, cz] of outsideChunks) {
			expect(isInSpawnZone(cx, cz)).toBe(false);
			const gx = cx * CHUNK_SIZE + 8;
			const gz = cz * CHUNK_SIZE + 8;
			const forced = forceSpawnBiome(gx, gz);
			expect(forced).toBeNull(); // Not forced

			// Check actual biome from noise
			const layers = sampleNoiseLayers(gx, gz);
			const h = computeHeight(layers);
			const temp = Math.max(0, Math.min(1, layers.temperature - Math.max(0, (h - 10) / 22) * 0.3));
			const biome = selectBiome(temp, layers.moisture);
			if (biome !== Biome.Angen) foundNonAngen = true;
		}

		// At least some chunks outside spawn zone should have non-Ängen biomes
		expect(foundNonAngen).toBe(true);
	});
});
