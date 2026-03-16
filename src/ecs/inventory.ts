// ─── Inventory Helpers ───
// Pure functions for manipulating Record<number, number> inventories.
// Keys are BlockId or item IDs, values are counts.

export interface InventoryData {
	items: Record<number, number>;
	capacity: number;
}

/** Total number of items in the inventory (sum of all counts). */
export function inventoryCount(inv: InventoryData): number {
	let total = 0;
	for (const count of Object.values(inv.items)) {
		total += count;
	}
	return total;
}

/** How many of a specific item/block the inventory contains. */
export function getItemCount(inv: InventoryData, id: number): number {
	return inv.items[id] ?? 0;
}

/** Whether the inventory has at least `amount` of the given item. */
export function hasItem(inv: InventoryData, id: number, amount = 1): boolean {
	return getItemCount(inv, id) >= amount;
}

/** Whether adding `amount` items would exceed capacity. */
export function isFull(inv: InventoryData, amount = 1): boolean {
	return inventoryCount(inv) + amount > inv.capacity;
}

/**
 * Add `amount` of an item. Returns the number actually added
 * (may be less than requested if capacity would be exceeded).
 */
export function addItem(inv: InventoryData, id: number, amount = 1): number {
	const space = inv.capacity - inventoryCount(inv);
	const toAdd = Math.min(amount, space);
	if (toAdd <= 0) return 0;
	inv.items[id] = (inv.items[id] ?? 0) + toAdd;
	return toAdd;
}

/**
 * Remove `amount` of an item. Returns the number actually removed
 * (may be less than requested if not enough in stock).
 */
export function removeItem(inv: InventoryData, id: number, amount = 1): number {
	const has = inv.items[id] ?? 0;
	const toRemove = Math.min(amount, has);
	if (toRemove <= 0) return 0;
	inv.items[id] = has - toRemove;
	if (inv.items[id] === 0) {
		delete inv.items[id];
	}
	return toRemove;
}

/** Check if the inventory can afford a cost map (id → amount). */
export function canAfford(inv: InventoryData, cost: Record<number, number>): boolean {
	for (const [id, amount] of Object.entries(cost)) {
		if (getItemCount(inv, Number(id)) < amount) return false;
	}
	return true;
}

/** Deduct a cost map from inventory. Returns false if cannot afford. */
export function deductCost(inv: InventoryData, cost: Record<number, number>): boolean {
	if (!canAfford(inv, cost)) return false;
	for (const [id, amount] of Object.entries(cost)) {
		removeItem(inv, Number(id), amount);
	}
	return true;
}

/** Serialize inventory for persistence (JSON.stringify-safe). */
export function serializeInventory(inv: InventoryData): string {
	return JSON.stringify({ items: inv.items, capacity: inv.capacity });
}

/** Deserialize inventory from JSON string. Falls back to empty on error. */
export function deserializeInventory(json: string, defaultCapacity = 256): InventoryData {
	try {
		const parsed = JSON.parse(json);
		// Normalize string keys to numbers (JSON keys are always strings)
		const items: Record<number, number> = {};
		if (parsed.items && typeof parsed.items === "object") {
			for (const [k, v] of Object.entries(parsed.items)) {
				if (typeof v === "number" && v > 0) {
					items[Number(k)] = v;
				}
			}
		}
		return {
			items,
			capacity: typeof parsed.capacity === "number" ? parsed.capacity : defaultCapacity,
		};
	} catch {
		return { items: {}, capacity: defaultCapacity };
	}
}
