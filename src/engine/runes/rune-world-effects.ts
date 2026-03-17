// ─── Rune World Effects ───
// Actuator implementations: Berkanan (grow), Fehu (pull),
// Jera (transform), Uruz (push).
// Each operates on WorldState when powered.
// No ECS, no Three.js — pure world mutation logic.

import type { SurfaceInscription } from "./inscription.ts";
import { findRecipe } from "./recipe-table.ts";
import type { ResourceIdValue } from "./resource.ts";
import type { WorldState } from "./world-state.ts";

// ─── Constants ───

/** Ticks between Berkanan generation events. */
export const BERKANAN_COOLDOWN = 4;

/** 6-connected neighbor offsets for adjacency. */
const NEIGHBORS: ReadonlyArray<readonly [number, number, number]> = [
	[1, 0, 0],
	[-1, 0, 0],
	[0, 1, 0],
	[0, -1, 0],
	[0, 0, 1],
	[0, 0, -1],
];

// ─── Per-rune Cooldown Tracking ───

/** Track cooldowns keyed by inscription position. */
export class CooldownTracker {
	private counters = new Map<string, number>();

	/** Decrement and check if ready (counter reaches 0). */
	tickAndCheck(key: string, cooldown: number): boolean {
		const current = this.counters.get(key) ?? 0;
		if (current <= 1) {
			this.counters.set(key, cooldown);
			return true;
		}
		this.counters.set(key, current - 1);
		return false;
	}

	/** Reset a specific counter. */
	reset(key: string): void {
		this.counters.delete(key);
	}
}

// ─── Inscription Key ───

function insKey(ins: SurfaceInscription): string {
	return `${ins.x},${ins.y},${ins.z}`;
}

// ─── Berkanan: Generate ───

/**
 * Berkanan (ᛒ Growth): generates 1 resource at its cell every N ticks.
 * The resource type must be configured per inscription.
 */
export function applyBerkanan(
	ins: SurfaceInscription,
	world: WorldState,
	cooldowns: CooldownTracker,
	resourceType: ResourceIdValue,
): void {
	if (!cooldowns.tickAndCheck(insKey(ins), BERKANAN_COOLDOWN)) return;
	world.add(ins.x, ins.y, ins.z, resourceType);
}

// ─── Fehu: Pull ───

/**
 * Fehu (ᚠ Wealth): pulls 1 resource from each adjacent cell toward itself.
 * Only pulls if the Fehu cell is empty or has the same type.
 */
export function applyFehu(ins: SurfaceInscription, world: WorldState): void {
	for (const [dx, dy, dz] of NEIGHBORS) {
		const nx = ins.x + dx;
		const ny = ins.y + dy;
		const nz = ins.z + dz;

		const neighbor = world.get(nx, ny, nz);
		if (!neighbor) continue;

		const added = world.add(ins.x, ins.y, ins.z, neighbor.type);
		if (added > 0) {
			world.remove(nx, ny, nz);
		}
	}
}

// ─── Jera: Transform ───

/**
 * Jera (ᛃ Harvest): if cell has a resource with a matching recipe,
 * consumes input and produces output at the same cell.
 */
export function applyJera(ins: SurfaceInscription, world: WorldState): void {
	const cell = world.get(ins.x, ins.y, ins.z);
	if (!cell) return;

	const recipe = findRecipe(cell.type);
	if (!recipe) return;
	if (cell.qty < recipe.inputQty) return;

	// Consume input
	world.remove(ins.x, ins.y, ins.z, recipe.inputQty);

	// Produce output — if cell emptied, add new type; if not, skip (different type)
	world.add(ins.x, ins.y, ins.z, recipe.output, recipe.outputQty);
}

// ─── Uruz: Push ───

/**
 * Uruz (ᚢ Strength): pushes 1 resource from its cell
 * in the inscription's normal direction.
 */
export function applyUruz(ins: SurfaceInscription, world: WorldState): void {
	const cell = world.get(ins.x, ins.y, ins.z);
	if (!cell) return;

	const tx = ins.x + ins.nx;
	const ty = ins.y + ins.ny;
	const tz = ins.z + ins.nz;

	const added = world.add(tx, ty, tz, cell.type);
	if (added > 0) {
		world.remove(ins.x, ins.y, ins.z);
	}
}
