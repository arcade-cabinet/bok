// ─── Rune Spatial Index ───
// Chunk-organized, per-face rune storage with sparse face maps.
// Provides O(1) lookup by position + face and efficient chunk-level queries.
// No ECS, no Three.js — pure data structure.

import { type FaceIndex, packFaceKey, type RuneIdValue, unpackFaceKey } from "./rune-data.ts";

/** Chunk size in blocks (must match terrain-generator). */
const CHUNK_SIZE = 16;

/** Serialized format for a single rune entry. */
export interface RuneEntry {
	x: number;
	y: number;
	z: number;
	face: FaceIndex;
	runeId: RuneIdValue;
}

/** Pack chunk coordinates into a string key. */
function chunkKey(cx: number, cz: number): string {
	return `${cx},${cz}`;
}

/** Derive chunk coordinates from global block position. */
function toChunk(x: number, z: number): { cx: number; cz: number } {
	return { cx: Math.floor(x / CHUNK_SIZE), cz: Math.floor(z / CHUNK_SIZE) };
}

/**
 * Chunk-organized spatial index for rune inscriptions.
 *
 * Structure: Map<chunkKey, Map<voxelKey, Map<FaceIndex, RuneId>>>
 * Sparse — only stores faces that actually have runes.
 */
export class RuneIndex {
	/** chunkKey → voxelKey → face → runeId */
	private chunks = new Map<string, Map<string, Map<number, number>>>();

	/** Total number of inscribed faces across all chunks. */
	get size(): number {
		let count = 0;
		for (const voxels of this.chunks.values()) {
			for (const faces of voxels.values()) {
				count += faces.size;
			}
		}
		return count;
	}

	/** Set a rune on a specific block face. Overwrites any existing rune. */
	setRune(x: number, y: number, z: number, face: FaceIndex, runeId: number): void {
		const { cx, cz } = toChunk(x, z);
		const ck = chunkKey(cx, cz);
		const vk = packFaceKey(x, y, z);

		let voxels = this.chunks.get(ck);
		if (!voxels) {
			voxels = new Map();
			this.chunks.set(ck, voxels);
		}

		let faces = voxels.get(vk);
		if (!faces) {
			faces = new Map();
			voxels.set(vk, faces);
		}

		if (runeId === 0) {
			faces.delete(face);
			if (faces.size === 0) voxels.delete(vk);
			if (voxels.size === 0) this.chunks.delete(ck);
		} else {
			faces.set(face, runeId);
		}
	}

	/** Get the rune ID on a specific face, or 0 (None) if blank. */
	getRune(x: number, y: number, z: number, face: FaceIndex): number {
		const { cx, cz } = toChunk(x, z);
		const voxels = this.chunks.get(chunkKey(cx, cz));
		if (!voxels) return 0;
		const faces = voxels.get(packFaceKey(x, y, z));
		if (!faces) return 0;
		return faces.get(face) ?? 0;
	}

	/** Remove a single rune from a face. */
	removeRune(x: number, y: number, z: number, face: FaceIndex): void {
		this.setRune(x, y, z, face, 0);
	}

	/** Remove all runes from a block (e.g., when the block is broken). */
	removeBlock(x: number, y: number, z: number): void {
		const { cx, cz } = toChunk(x, z);
		const ck = chunkKey(cx, cz);
		const voxels = this.chunks.get(ck);
		if (!voxels) return;
		voxels.delete(packFaceKey(x, y, z));
		if (voxels.size === 0) this.chunks.delete(ck);
	}

	/** Get all inscribed faces for a block as a Map<FaceIndex, RuneId>. */
	getBlockFaces(x: number, y: number, z: number): ReadonlyMap<number, number> | null {
		const { cx, cz } = toChunk(x, z);
		const voxels = this.chunks.get(chunkKey(cx, cz));
		if (!voxels) return null;
		return voxels.get(packFaceKey(x, y, z)) ?? null;
	}

	/** Get all inscribed blocks in a chunk. Returns voxelKey → Map<FaceIndex, RuneId>. */
	getChunkRunes(cx: number, cz: number): ReadonlyMap<string, ReadonlyMap<number, number>> | null {
		return this.chunks.get(chunkKey(cx, cz)) ?? null;
	}

	/** Check if a block has any inscribed faces. */
	hasRunes(x: number, y: number, z: number): boolean {
		const { cx, cz } = toChunk(x, z);
		const voxels = this.chunks.get(chunkKey(cx, cz));
		if (!voxels) return false;
		const faces = voxels.get(packFaceKey(x, y, z));
		return faces !== undefined && faces.size > 0;
	}

	/** Get all entries as a flat array (for persistence). */
	getAllEntries(): RuneEntry[] {
		const entries: RuneEntry[] = [];
		for (const voxels of this.chunks.values()) {
			for (const [vk, faces] of voxels) {
				const { x, y, z } = unpackFaceKey(vk);
				for (const [face, runeId] of faces) {
					entries.push({ x, y, z, face: face as FaceIndex, runeId: runeId as RuneIdValue });
				}
			}
		}
		return entries;
	}

	/** Bulk-load entries (from persistence). */
	loadEntries(entries: ReadonlyArray<RuneEntry>): void {
		for (const e of entries) {
			this.setRune(e.x, e.y, e.z, e.face, e.runeId);
		}
	}

	/** Clear all data. */
	clear(): void {
		this.chunks.clear();
	}
}

// ─── Module-level singleton ───

let globalIndex: RuneIndex | null = null;

/** Get the global rune index (creates on first access). */
export function getRuneIndex(): RuneIndex {
	if (!globalIndex) {
		globalIndex = new RuneIndex();
	}
	return globalIndex;
}

/** Reset the global rune index (call on game destroy). */
export function resetRuneIndex(): void {
	globalIndex?.clear();
	globalIndex = null;
}
