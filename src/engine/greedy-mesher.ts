/**
 * Greedy voxel mesher — produces merged quads for chunk rendering.
 *
 * Algorithm: for each of 6 face directions, sweep through 2D slices
 * perpendicular to the face normal. In each slice, greedily merge
 * adjacent same-block faces into larger rectangles.
 *
 * Rune-aware: faces in the runeFaces set are never merged (kept as 1×1 quads).
 */

import { FACE_AXES, dimSize } from "./greedy-mesher-data.ts";

/** Face direction enum — the 6 cube faces. */
export const FaceDir = {
	PosX: 0,
	NegX: 1,
	PosY: 2,
	NegY: 3,
	PosZ: 4,
	NegZ: 5,
} as const;
export type FaceDir = (typeof FaceDir)[keyof typeof FaceDir];

/** Accessor: returns blockId at (x,y,z). Returns 0 for air/out-of-bounds. */
export type ChunkAccessor = (x: number, y: number, z: number) => number;

/** Output quad from the greedy mesher. */
export interface MesherQuad {
	/** Face direction. */
	face: FaceDir;
	/** Origin x (chunk-local). */
	x: number;
	/** Origin y (chunk-local). */
	y: number;
	/** Origin z (chunk-local). */
	z: number;
	/** Width along the U axis of this face. */
	w: number;
	/** Height along the V axis of this face. */
	h: number;
	/** Block ID for texture lookup. */
	blockId: number;
}

/** Rune face key: "x,y,z,faceDir" */
type RuneFaceSet = Set<string>;

const DIMS = [0, 0, 0]; // reusable coord array

/**
 * Run greedy meshing on a chunk.
 * @param data Flat voxel array: x + z*W + y*W*W
 * @param chunkW Chunk width/depth (typically 16)
 * @param chunkH Chunk height (typically 32)
 * @param neighbor Accessor for neighbor lookups (handles chunk edges)
 * @param runeFaces Optional set of "x,y,z,faceDir" keys that must stay 1×1
 */
export function greedyMesh(
	data: Uint16Array,
	chunkW: number,
	chunkH: number,
	neighbor: ChunkAccessor,
	runeFaces?: RuneFaceSet,
): MesherQuad[] {
	const quads: MesherQuad[] = [];

	for (const axis of FACE_AXES) {
		const sweepSize = dimSize(axis.sweep, chunkW, chunkH);
		const uSize = dimSize(axis.u, chunkW, chunkH);
		const vSize = dimSize(axis.v, chunkW, chunkH);
		const mask = new Int32Array(uSize * vSize); // 0=no face, >0=blockId

		for (let d = 0; d < sweepSize; d++) {
			buildSliceMask(mask, data, neighbor, axis, d, chunkW, uSize, vSize);
			mergeSlice(quads, mask, axis, d, uSize, vSize, runeFaces);
		}
	}

	return quads;
}

/** Build a 2D mask of exposed faces for one slice along the sweep axis. */
function buildSliceMask(
	mask: Int32Array,
	data: Uint16Array,
	neighbor: ChunkAccessor,
	axis: (typeof FACE_AXES)[number],
	d: number,
	chunkW: number,
	uSize: number,
	vSize: number,
): void {
	for (let v = 0; v < vSize; v++) {
		for (let u = 0; u < uSize; u++) {
			DIMS[axis.sweep] = d;
			DIMS[axis.u] = u;
			DIMS[axis.v] = v;
			const x = DIMS[0];
			const y = DIMS[1];
			const z = DIMS[2];

			const blockId = data[x + z * chunkW + y * chunkW * chunkW];
			if (blockId === 0) {
				mask[u + v * uSize] = 0;
				continue;
			}

			const nx = x + (axis.sweep === 0 ? axis.dir : 0);
			const ny = y + (axis.sweep === 1 ? axis.dir : 0);
			const nz = z + (axis.sweep === 2 ? axis.dir : 0);
			mask[u + v * uSize] = neighbor(nx, ny, nz) === 0 ? blockId : 0;
		}
	}
}

/** Greedy merge a 2D mask into rectangular quads. */
function mergeSlice(
	quads: MesherQuad[],
	mask: Int32Array,
	axis: (typeof FACE_AXES)[number],
	d: number,
	uSize: number,
	vSize: number,
	runeFaces?: RuneFaceSet,
): void {
	for (let v = 0; v < vSize; v++) {
		for (let u = 0; u < uSize; ) {
			const blockId = mask[u + v * uSize];
			if (blockId === 0) {
				u++;
				continue;
			}

			DIMS[axis.sweep] = d;
			DIMS[axis.u] = u;
			DIMS[axis.v] = v;
			const isRune = runeFaces?.has(`${DIMS[0]},${DIMS[1]},${DIMS[2]},${axis.face}`);

			if (isRune) {
				quads.push({ face: axis.face, x: DIMS[0], y: DIMS[1], z: DIMS[2], w: 1, h: 1, blockId });
				mask[u + v * uSize] = 0;
				u++;
				continue;
			}

			let w = 1;
			while (u + w < uSize && mask[u + w + v * uSize] === blockId) {
				if (runeFaces !== undefined) {
					DIMS[axis.u] = u + w;
					if (runeFaces.has(`${DIMS[0]},${DIMS[1]},${DIMS[2]},${axis.face}`)) break;
				}
				w++;
			}

			let h = 1;
			outer: while (v + h < vSize) {
				for (let du = 0; du < w; du++) {
					if (mask[u + du + (v + h) * uSize] !== blockId) break outer;
					if (runeFaces !== undefined) {
						DIMS[axis.sweep] = d;
						DIMS[axis.u] = u + du;
						DIMS[axis.v] = v + h;
						if (runeFaces.has(`${DIMS[0]},${DIMS[1]},${DIMS[2]},${axis.face}`)) break outer;
					}
				}
				h++;
			}

			DIMS[axis.sweep] = d;
			DIMS[axis.u] = u;
			DIMS[axis.v] = v;
			quads.push({ face: axis.face, x: DIMS[0], y: DIMS[1], z: DIMS[2], w, h, blockId });

			for (let dv = 0; dv < h; dv++) for (let du = 0; du < w; du++) mask[u + du + (v + dv) * uSize] = 0;

			u += w;
		}
	}
}
