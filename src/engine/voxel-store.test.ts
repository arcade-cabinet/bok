/**
 * VoxelStore — unit tests (TDD: written FIRST).
 * Tests data storage, retrieval, bulk operations, and removal.
 */

import { describe, expect, test } from "vitest";
import { VoxelStore } from "./voxel-store.ts";

const CS = 16; // chunk size
const WH = 32; // world height

describe("VoxelStore", () => {
	test("getVoxel returns 0 for unset positions", () => {
		const store = new VoxelStore(CS, WH);
		expect(store.getVoxel(5, 10, 5)).toBe(0);
	});

	test("setVoxel + getVoxel roundtrip", () => {
		const store = new VoxelStore(CS, WH);
		store.setVoxel(5, 10, 5, 3);
		expect(store.getVoxel(5, 10, 5)).toBe(3);
	});

	test("removeVoxel sets block to 0", () => {
		const store = new VoxelStore(CS, WH);
		store.setVoxel(5, 10, 5, 3);
		store.removeVoxel(5, 10, 5);
		expect(store.getVoxel(5, 10, 5)).toBe(0);
	});

	test("setVoxelBulk writes multiple entries", () => {
		const store = new VoxelStore(CS, WH);
		store.setVoxelBulk([
			{ position: { x: 0, y: 0, z: 0 }, blockId: 1 },
			{ position: { x: 1, y: 5, z: 2 }, blockId: 7 },
			{ position: { x: 15, y: 31, z: 15 }, blockId: 10 },
		]);
		expect(store.getVoxel(0, 0, 0)).toBe(1);
		expect(store.getVoxel(1, 5, 2)).toBe(7);
		expect(store.getVoxel(15, 31, 15)).toBe(10);
	});

	test("cross-chunk voxels are stored correctly", () => {
		const store = new VoxelStore(CS, WH);
		// Chunk (0,0) and chunk (1,0)
		store.setVoxel(5, 5, 5, 1);
		store.setVoxel(20, 5, 5, 2); // chunk (1,0)
		expect(store.getVoxel(5, 5, 5)).toBe(1);
		expect(store.getVoxel(20, 5, 5)).toBe(2);
	});

	test("negative coordinates work (chunk -1,-1)", () => {
		const store = new VoxelStore(CS, WH);
		store.setVoxel(-5, 10, -5, 4);
		expect(store.getVoxel(-5, 10, -5)).toBe(4);
	});

	test("getChunkData returns null for empty chunk", () => {
		const store = new VoxelStore(CS, WH);
		expect(store.getChunkData(99, 99)).toBeNull();
	});

	test("getChunkData returns array for populated chunk", () => {
		const store = new VoxelStore(CS, WH);
		store.setVoxel(5, 5, 5, 3);
		const data = store.getChunkData(0, 0);
		expect(data).not.toBeNull();
		expect(data!.length).toBe(CS * WH * CS);
		// Check the voxel at local (5,5,5)
		expect(data![5 + 5 * CS + 5 * CS * CS]).toBe(3);
	});

	test("out-of-height-range returns 0", () => {
		const store = new VoxelStore(CS, WH);
		expect(store.getVoxel(0, -1, 0)).toBe(0);
		expect(store.getVoxel(0, WH, 0)).toBe(0);
	});

	test("hasChunk returns true for populated chunks", () => {
		const store = new VoxelStore(CS, WH);
		expect(store.hasChunk(0, 0)).toBe(false);
		store.setVoxel(5, 5, 5, 1);
		expect(store.hasChunk(0, 0)).toBe(true);
	});

	test("deleteChunk removes chunk data", () => {
		const store = new VoxelStore(CS, WH);
		store.setVoxel(5, 5, 5, 1);
		store.deleteChunk(0, 0);
		expect(store.hasChunk(0, 0)).toBe(false);
		expect(store.getVoxel(5, 5, 5)).toBe(0);
	});
});
