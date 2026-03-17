/**
 * Landmark structure builders for procedurally generated Swedish landmarks.
 *
 * Each function pushes VoxelSetOptions onto an entries array, following the
 * same pattern as tree-generator.ts. No side effects beyond array mutation.
 *
 * Landmark types:
 *   Stenhög (cairn): stone stack on hilltops, 3–5 blocks tall
 *   Runsten (runestone): tall inscribed stone block, readable interaction stub
 *   Fornlämning (ruins): stone foundation 5×5–9×9, partial walls, loot stub
 *   Kolmila (Bokskogen): charcoal kiln mound
 *   Offerkälla (Myren): offering spring — stone ring around water
 *   Sjömärke (Skärgården): tall sea navigation marker
 *   Fjällstuga (Fjällen): small mountain shelter
 */

import type { VoxelSetOptions } from "../engine/voxel-types.ts";
import { BlockId } from "./blocks.ts";

type Entries = VoxelSetOptions[];

function push(e: Entries, x: number, y: number, z: number, blockId: number): void {
	e.push({ position: { x, y, z }, blockId });
}

// ─── Universal Landmarks ───

/** Stenhög (cairn): tapered stone stack, 3–5 blocks tall. */
export function placeStenhog(e: Entries, gx: number, h: number, gz: number, height: number): void {
	const stoneBlock = height > 4 ? BlockId.SmoothStone : BlockId.Stone;
	// Base layer: 3×3
	for (let dx = -1; dx <= 1; dx++) {
		for (let dz = -1; dz <= 1; dz++) {
			push(e, gx + dx, h + 1, gz + dz, stoneBlock);
		}
	}
	// Middle layers: single column
	for (let dy = 2; dy <= height; dy++) {
		push(e, gx, h + dy, gz, stoneBlock);
	}
	// Cap with StoneBricks
	push(e, gx, h + height + 1, gz, BlockId.StoneBricks);
}

/** Runsten (runestone): tall inscribed stone, 3 blocks high. */
export function placeRunsten(e: Entries, gx: number, h: number, gz: number): void {
	push(e, gx, h + 1, gz, BlockId.RuneStone);
	push(e, gx, h + 2, gz, BlockId.RuneStone);
	push(e, gx, h + 3, gz, BlockId.RuneStone);
}

/** Fornlämning (ruins): stone foundation with partial walls. Size 5, 7, or 9. */
export function placeFornlamning(e: Entries, gx: number, h: number, gz: number, size: number): void {
	const half = Math.floor(size / 2);
	// Foundation floor
	for (let dx = -half; dx <= half; dx++) {
		for (let dz = -half; dz <= half; dz++) {
			push(e, gx + dx, h, gz + dz, BlockId.StoneBricks);
		}
	}
	// Partial walls — only corners and every other perimeter block, 1–2 blocks tall
	for (let dx = -half; dx <= half; dx++) {
		for (let dz = -half; dz <= half; dz++) {
			const isEdge = Math.abs(dx) === half || Math.abs(dz) === half;
			if (!isEdge) continue;
			const isCorner = Math.abs(dx) === half && Math.abs(dz) === half;
			// Corners always get walls; edges get every other block
			if (!isCorner && (dx + dz) % 2 !== 0) continue;
			const wallH = isCorner ? 2 : 1;
			for (let dy = 1; dy <= wallH; dy++) {
				push(e, gx + dx, h + dy, gz + dz, BlockId.Stone);
			}
		}
	}
	// Loot container stub: glass block at center (future: replace with chest)
	push(e, gx, h + 1, gz, BlockId.Glass);
}

// ─── Biome-Specific Landmarks ───

/** Kolmila (charcoal kiln): mound of DeadWood capped with Soot. Bokskogen. */
export function placeKolmila(e: Entries, gx: number, h: number, gz: number): void {
	// Dome base: 3×3 DeadWood
	for (let dx = -1; dx <= 1; dx++) {
		for (let dz = -1; dz <= 1; dz++) {
			push(e, gx + dx, h + 1, gz + dz, BlockId.DeadWood);
		}
	}
	// Second layer: cross pattern
	push(e, gx, h + 2, gz, BlockId.DeadWood);
	push(e, gx + 1, h + 2, gz, BlockId.DeadWood);
	push(e, gx - 1, h + 2, gz, BlockId.DeadWood);
	push(e, gx, h + 2, gz + 1, BlockId.DeadWood);
	push(e, gx, h + 2, gz - 1, BlockId.DeadWood);
	// Soot cap
	push(e, gx, h + 3, gz, BlockId.Soot);
}

/** Offerkälla (offering spring): stone ring around a water pool. Myren. */
export function placeOfferkalla(e: Entries, gx: number, h: number, gz: number): void {
	// Stone ring (radius 2, only perimeter)
	for (let dx = -2; dx <= 2; dx++) {
		for (let dz = -2; dz <= 2; dz++) {
			const onRing = Math.abs(dx) === 2 || Math.abs(dz) === 2;
			if (onRing && !(Math.abs(dx) === 2 && Math.abs(dz) === 2)) {
				push(e, gx + dx, h + 1, gz + dz, BlockId.SmoothStone);
			}
		}
	}
	// Water pool in center
	for (let dx = -1; dx <= 1; dx++) {
		for (let dz = -1; dz <= 1; dz++) {
			push(e, gx + dx, h, gz + dz, BlockId.Water);
		}
	}
	// RuneStone marker
	push(e, gx + 2, h + 2, gz, BlockId.RuneStone);
}

/** Sjömärke (sea marker): tall stone pillar with torch. Skärgården. */
export function placeSjomarke(e: Entries, gx: number, h: number, gz: number): void {
	for (let dy = 1; dy <= 5; dy++) {
		push(e, gx, h + dy, gz, BlockId.SmoothStone);
	}
	push(e, gx, h + 6, gz, BlockId.Torch);
}

/** Blothögen ruined stone circle: corrupted ring of CorruptedStone blocks. Blothögen. */
export function placeRuinedStoneCircle(e: Entries, gx: number, h: number, gz: number): void {
	// Outer ring radius 3 — partial (ruined) circle using 8 cardinal + diagonal positions
	const ringPositions: [number, number][] = [
		[3, 0],
		[-3, 0],
		[0, 3],
		[0, -3],
		[2, 2],
		[-2, 2],
		[2, -2],
	];
	for (const [dx, dz] of ringPositions) {
		push(e, gx + dx, h + 1, gz + dz, BlockId.CorruptedStone);
		// Some pillars are 2 blocks tall (ruined variation)
		if (Math.abs(dx) !== Math.abs(dz)) {
			push(e, gx + dx, h + 2, gz + dz, BlockId.CorruptedStone);
		}
	}
	// Soot floor patches inside the circle
	for (let dx = -1; dx <= 1; dx++) {
		for (let dz = -1; dz <= 1; dz++) {
			push(e, gx + dx, h, gz + dz, BlockId.Soot);
		}
	}
	// Central altar: single RuneStone
	push(e, gx, h + 1, gz, BlockId.RuneStone);
}

/** Fjällstuga (mountain shelter): small wood hut. Fjällen. */
export function placeFjallstuga(e: Entries, gx: number, h: number, gz: number): void {
	// Floor: 3×3 Planks
	for (let dx = -1; dx <= 1; dx++) {
		for (let dz = -1; dz <= 1; dz++) {
			push(e, gx + dx, h, gz + dz, BlockId.Planks);
		}
	}
	// Walls: 2-high PineWood corners + door gap
	for (const [dx, dz] of [
		[-1, -1],
		[1, -1],
		[-1, 1],
		[1, 1],
	] as const) {
		push(e, gx + dx, h + 1, gz + dz, BlockId.PineWood);
		push(e, gx + dx, h + 2, gz + dz, BlockId.PineWood);
	}
	// Side walls (with gap at front for door: dz = -1 center)
	push(e, gx - 1, h + 1, gz, BlockId.PineWood);
	push(e, gx + 1, h + 1, gz, BlockId.PineWood);
	push(e, gx, h + 1, gz + 1, BlockId.PineWood);
	push(e, gx - 1, h + 2, gz, BlockId.PineWood);
	push(e, gx + 1, h + 2, gz, BlockId.PineWood);
	push(e, gx, h + 2, gz + 1, BlockId.PineWood);
	// Roof: 3×3 SpruceLeaves
	for (let dx = -1; dx <= 1; dx++) {
		for (let dz = -1; dz <= 1; dz++) {
			push(e, gx + dx, h + 3, gz + dz, BlockId.SpruceLeaves);
		}
	}
	// Torch inside
	push(e, gx, h + 1, gz, BlockId.Torch);
}
