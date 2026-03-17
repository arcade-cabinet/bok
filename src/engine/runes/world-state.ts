// ─── World State ───
// Per-cell resource storage for the world effects layer.
// One resource type per cell, max quantity 16.
// No ECS, no Three.js — pure data structure.

import type { ResourceIdValue } from "./resource.ts";
import { MAX_RESOURCE_QTY } from "./resource.ts";

/** Resource stored in a single cell. */
export interface CellResource {
	type: ResourceIdValue;
	qty: number;
}

/** Pack grid coords into a string key. */
function cellKey(x: number, y: number, z: number): string {
	return `${x},${y},${z}`;
}

/**
 * Per-cell resource storage for the rune world.
 * Each cell holds at most ONE resource type with a capped quantity.
 * This forces players to build spatial production lines.
 */
export class WorldState {
	private cells = new Map<string, CellResource>();

	/** Get resource at a cell, or null if empty. */
	get(x: number, y: number, z: number): CellResource | null {
		return this.cells.get(cellKey(x, y, z)) ?? null;
	}

	/** Check if a cell has any resource. */
	has(x: number, y: number, z: number): boolean {
		return this.cells.has(cellKey(x, y, z));
	}

	/** Check if a cell has a specific resource type. */
	hasType(x: number, y: number, z: number, type: ResourceIdValue): boolean {
		const cell = this.cells.get(cellKey(x, y, z));
		return cell !== undefined && cell.type === type;
	}

	/**
	 * Add a resource to a cell. Returns the amount actually added.
	 * - If the cell is empty, creates a new entry.
	 * - If the cell has the same type, adds up to MAX_RESOURCE_QTY.
	 * - If the cell has a different type, returns 0 (no mixing).
	 */
	add(x: number, y: number, z: number, type: ResourceIdValue, qty = 1): number {
		const key = cellKey(x, y, z);
		const existing = this.cells.get(key);

		if (!existing) {
			const clamped = Math.min(qty, MAX_RESOURCE_QTY);
			this.cells.set(key, { type, qty: clamped });
			return clamped;
		}

		if (existing.type !== type) return 0;

		const space = MAX_RESOURCE_QTY - existing.qty;
		const added = Math.min(qty, space);
		existing.qty += added;
		return added;
	}

	/**
	 * Remove a quantity from a cell. Returns the amount actually removed.
	 * If the cell empties, deletes the entry.
	 */
	remove(x: number, y: number, z: number, qty = 1): number {
		const key = cellKey(x, y, z);
		const existing = this.cells.get(key);
		if (!existing) return 0;

		const removed = Math.min(qty, existing.qty);
		existing.qty -= removed;
		if (existing.qty <= 0) this.cells.delete(key);
		return removed;
	}

	/** Clear a cell completely. */
	clear(x: number, y: number, z: number): void {
		this.cells.delete(cellKey(x, y, z));
	}

	/** Clear all cells. */
	clearAll(): void {
		this.cells.clear();
	}

	/** Number of cells with resources. */
	get size(): number {
		return this.cells.size;
	}

	/** Iterate all occupied cells as [x, y, z, resource]. */
	*entries(): IterableIterator<[number, number, number, CellResource]> {
		for (const [key, res] of this.cells) {
			const parts = key.split(",");
			yield [Number(parts[0]), Number(parts[1]), Number(parts[2]), res];
		}
	}
}
