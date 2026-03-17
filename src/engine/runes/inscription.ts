// ─── Inscription Data ───
// Surface inscription type and spatial index.
// No ECS, no Three.js — pure data structures.

import type { RuneIdValue } from "../../ecs/systems/rune-data.ts";
import type { MaterialIdValue } from "./material.ts";

/** A rune inscribed on a surface in the world. */
export interface SurfaceInscription {
	/** Grid position of the inscription. */
	x: number;
	y: number;
	z: number;
	/** Surface normal at the inscription point (axis-aligned integer triple). */
	nx: number;
	ny: number;
	nz: number;
	/** Which Elder Futhark rune is inscribed. */
	glyph: RuneIdValue;
	/** Material the surface is made of. */
	material: MaterialIdValue;
	/** Initial signal output strength (default 10). */
	strength: number;
}

/** Pack grid position into a lookup key. */
export function inscriptionKey(x: number, y: number, z: number): string {
	return `${x},${y},${z}`;
}

/**
 * Spatial index for fast inscription lookup by grid position.
 * Multiple inscriptions can exist at the same grid cell (different normals).
 */
export class InscriptionIndex {
	private map = new Map<string, SurfaceInscription[]>();

	/** Add an inscription to the index. */
	add(ins: SurfaceInscription): void {
		const key = inscriptionKey(ins.x, ins.y, ins.z);
		const list = this.map.get(key);
		if (list) {
			list.push(ins);
		} else {
			this.map.set(key, [ins]);
		}
	}

	/** Get all inscriptions at a grid position. */
	at(x: number, y: number, z: number): ReadonlyArray<SurfaceInscription> {
		return this.map.get(inscriptionKey(x, y, z)) ?? [];
	}

	/** Remove all inscriptions at a grid position. */
	removeAt(x: number, y: number, z: number): void {
		this.map.delete(inscriptionKey(x, y, z));
	}

	/** Total number of inscriptions in the index. */
	get size(): number {
		let count = 0;
		for (const list of this.map.values()) count += list.length;
		return count;
	}

	/** Iterate all inscriptions. */
	*all(): IterableIterator<SurfaceInscription> {
		for (const list of this.map.values()) yield* list;
	}

	/** Clear all inscriptions. */
	clear(): void {
		this.map.clear();
	}
}
