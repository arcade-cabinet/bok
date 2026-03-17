/**
 * Greedy voxel mesher — merges same-type adjacent faces into larger quads.
 * Pure function: takes chunk data + neighbor callback, returns MeshQuad[].
 */

import { BlockId } from "./blocks.ts";

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 32;

export interface MeshQuad {
	positions: number[]; // 4 verts × 3 floats = 12
	normal: [number, number, number];
	uvs: number[]; // 4 verts × 2 floats = 8
	blockType: number;
}

type NeighborGetter = (face: number, a: number, b: number, c: number) => number;

function idx(x: number, y: number, z: number): number {
	return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
}

const DIMS = [CHUNK_SIZE, CHUNK_HEIGHT, CHUNK_SIZE];

const FACES: Array<{ axis: number; sign: number; normal: [number, number, number]; fi: number }> = [
	{ axis: 0, sign: -1, normal: [-1, 0, 0], fi: 0 },
	{ axis: 0, sign: 1, normal: [1, 0, 0], fi: 1 },
	{ axis: 1, sign: -1, normal: [0, -1, 0], fi: 2 },
	{ axis: 1, sign: 1, normal: [0, 1, 0], fi: 3 },
	{ axis: 2, sign: -1, normal: [0, 0, -1], fi: 4 },
	{ axis: 2, sign: 1, normal: [0, 0, 1], fi: 5 },
];

function toXYZ(axis: number, d: number, a: number, b: number): [number, number, number] {
	if (axis === 0) return [d, a, b];
	if (axis === 1) return [a, d, b];
	return [a, b, d];
}

function buildQuad(
	axis: number,
	sign: number,
	slice: number,
	a0: number,
	b0: number,
	w: number,
	h: number,
): { positions: number[]; uvs: number[] } {
	const d = sign > 0 ? slice + 1 : slice;
	const a1 = a0 + w;
	const b1 = b0 + h;
	const c = [toXYZ(axis, d, a0, b0), toXYZ(axis, d, a1, b0), toXYZ(axis, d, a1, b1), toXYZ(axis, d, a0, b1)];
	const uv = [
		[0, 0],
		[w, 0],
		[w, h],
		[0, h],
	];
	const ord = sign > 0 ? [0, 1, 2, 3] : [0, 3, 2, 1];
	const positions: number[] = [];
	const uvs: number[] = [];
	for (const i of ord) {
		positions.push(c[i][0], c[i][1], c[i][2]);
		uvs.push(uv[i][0], uv[i][1]);
	}
	return { positions, uvs };
}

function getBlock(chunk: Uint8Array, x: number, y: number, z: number): number {
	if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
		return BlockId.Air;
	}
	return chunk[idx(x, y, z)];
}

function sampleNeighbor(
	chunk: Uint8Array,
	x: number,
	y: number,
	z: number,
	fi: number,
	getNeighbor: NeighborGetter,
): number {
	if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
		return getNeighbor(fi, x, y, z);
	}
	return chunk[idx(x, y, z)];
}

/**
 * Generate merged quads for a chunk using greedy meshing.
 * @param chunk - Flat Uint8Array [CHUNK_SIZE × CHUNK_HEIGHT × CHUNK_SIZE]
 * @param getNeighbor - Cross-chunk boundary lookup (face, x, y, z) => blockId
 */
export function greedyMesh(chunk: Uint8Array, getNeighbor: NeighborGetter): MeshQuad[] {
	const quads: MeshQuad[] = [];

	for (const { axis, sign, normal, fi } of FACES) {
		const aAxis = axis === 0 ? 1 : 0;
		const bAxis = axis === 2 ? 1 : 2;
		const aSize = DIMS[aAxis];
		const bSize = DIMS[bAxis];
		const mask = new Int32Array(aSize * bSize);

		for (let slice = 0; slice < DIMS[axis]; slice++) {
			// Build mask: blockType if face exposed, 0 otherwise
			for (let b = 0; b < bSize; b++) {
				for (let a = 0; a < aSize; a++) {
					const [x, y, z] = toXYZ(axis, slice, a, b);
					const block = getBlock(chunk, x, y, z);
					if (block === BlockId.Air) {
						mask[a + b * aSize] = 0;
						continue;
					}
					const [nx, ny, nz] = toXYZ(axis, slice + sign, a, b);
					const nbr = sampleNeighbor(chunk, nx, ny, nz, fi, getNeighbor);
					mask[a + b * aSize] = nbr === BlockId.Air || nbr !== block ? block : 0;
				}
			}

			// Greedy expansion
			for (let b = 0; b < bSize; b++) {
				for (let a = 0; a < aSize; ) {
					const bt = mask[a + b * aSize];
					if (bt === 0) {
						a++;
						continue;
					}

					let w = 1;
					while (a + w < aSize && mask[a + w + b * aSize] === bt) w++;

					let h = 1;
					let ok = true;
					while (b + h < bSize && ok) {
						for (let k = 0; k < w; k++) {
							if (mask[a + k + (b + h) * aSize] !== bt) {
								ok = false;
								break;
							}
						}
						if (ok) h++;
					}

					const { positions, uvs } = buildQuad(axis, sign, slice, a, b, w, h);
					quads.push({ positions, normal, uvs, blockType: bt });

					for (let db = 0; db < h; db++) for (let da = 0; da < w; da++) mask[a + da + (b + db) * aSize] = 0;

					a += w;
				}
			}
		}
	}
	return quads;
}
