/**
 * Greedy mesher constants — face axis definitions and helpers.
 * Extracted from greedy-mesher.ts to keep it under 200 LOC.
 */

import type { FaceDir } from "./greedy-mesher.ts";

/** Face axis definition: sweep axis, direction, and UV axes. */
export interface FaceAxisDef {
	face: FaceDir;
	/** Which axis is the sweep (normal) axis: 0=x, 1=y, 2=z */
	sweep: number;
	/** Direction along sweep axis: +1 or -1 */
	dir: number;
	/** U axis index for the 2D slice */
	u: number;
	/** V axis index for the 2D slice */
	v: number;
}

/** Six face axis definitions — one per cube face. */
export const FACE_AXES: FaceAxisDef[] = [
	{ face: 0 /* PosX */, sweep: 0, dir: 1, u: 2, v: 1 },
	{ face: 1 /* NegX */, sweep: 0, dir: -1, u: 2, v: 1 },
	{ face: 2 /* PosY */, sweep: 1, dir: 1, u: 0, v: 2 },
	{ face: 3 /* NegY */, sweep: 1, dir: -1, u: 0, v: 2 },
	{ face: 4 /* PosZ */, sweep: 2, dir: 1, u: 0, v: 1 },
	{ face: 5 /* NegZ */, sweep: 2, dir: -1, u: 0, v: 1 },
];

/** Returns the size along a given axis (Y → chunkH, X/Z → chunkW). */
export function dimSize(axis: number, chunkW: number, chunkH: number): number {
	return axis === 1 ? chunkH : chunkW;
}
