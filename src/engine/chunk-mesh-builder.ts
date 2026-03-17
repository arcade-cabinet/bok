/**
 * Chunk mesh builder — converts greedy mesher quads into Three.js geometry.
 *
 * Each MesherQuad becomes 4 vertices + 2 triangles (6 indices).
 * UVs are computed from the block face atlas tile coordinates.
 */

import * as THREE from "three";
import { getBlockTile } from "./block-face-atlas.ts";
import { FaceDir, type MesherQuad } from "./greedy-mesher.ts";

// Face normals for each direction
const NORMALS: Record<FaceDir, [number, number, number]> = {
	[FaceDir.PosX]: [1, 0, 0],
	[FaceDir.NegX]: [-1, 0, 0],
	[FaceDir.PosY]: [0, 1, 0],
	[FaceDir.NegY]: [0, -1, 0],
	[FaceDir.PosZ]: [0, 0, 1],
	[FaceDir.NegZ]: [0, 0, -1],
};

/**
 * Build a Three.js BufferGeometry from an array of mesher quads.
 * @param quads Output from greedyMesh()
 * @param offsetX World X offset (cx * chunkSize)
 * @param offsetZ World Z offset (cz * chunkSize)
 * @param tilesetCols Number of columns in tileset
 * @param tilesetRows Number of rows in tileset
 */
export function buildChunkGeometry(
	quads: MesherQuad[],
	offsetX: number,
	offsetZ: number,
	tilesetCols: number,
	tilesetRows: number,
): THREE.BufferGeometry {
	const vertCount = quads.length * 4;
	const idxCount = quads.length * 6;

	const positions = new Float32Array(vertCount * 3);
	const normals = new Float32Array(vertCount * 3);
	const uvs = new Float32Array(vertCount * 2);
	const indices = new Uint32Array(idxCount);

	let vi = 0; // vertex index
	let ii = 0; // index index

	for (const q of quads) {
		const [nx, ny, nz] = NORMALS[q.face];
		const wx = q.x + offsetX; // world x
		const wz = q.z + offsetZ; // world z
		const tile = getBlockTile(q.blockId, q.face);

		// UV tile bounds (tiling for merged quads)
		const u0 = tile.col / tilesetCols;
		const v0 = 1 - (tile.row + 1) / tilesetRows; // flip V for WebGL
		const u1 = (tile.col + 1) / tilesetCols;
		const v1 = 1 - tile.row / tilesetRows;
		// Scale UVs by quad dimensions so texture tiles across merged faces
		const uSpan = (u1 - u0) * q.w;
		const vSpan = (v1 - v0) * q.h;

		// Compute 4 corner vertices based on face direction
		const corners = quadCorners(q, wx, wz);

		for (let c = 0; c < 4; c++) {
			positions[vi * 3] = corners[c][0];
			positions[vi * 3 + 1] = corners[c][1];
			positions[vi * 3 + 2] = corners[c][2];
			normals[vi * 3] = nx;
			normals[vi * 3 + 1] = ny;
			normals[vi * 3 + 2] = nz;
			vi++;
		}
		// UVs: 0,0 → w,0 → w,h → 0,h (tiling)
		const uvBase = (vi - 4) * 2;
		uvs[uvBase] = u0;
		uvs[uvBase + 1] = v0;
		uvs[uvBase + 2] = u0 + uSpan;
		uvs[uvBase + 3] = v0;
		uvs[uvBase + 4] = u0 + uSpan;
		uvs[uvBase + 5] = v0 + vSpan;
		uvs[uvBase + 6] = u0;
		uvs[uvBase + 7] = v0 + vSpan;

		// Two triangles: 0-1-2, 0-2-3
		const base = vi - 4;
		indices[ii++] = base;
		indices[ii++] = base + 1;
		indices[ii++] = base + 2;
		indices[ii++] = base;
		indices[ii++] = base + 2;
		indices[ii++] = base + 3;
	}

	const geom = new THREE.BufferGeometry();
	geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
	geom.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
	geom.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
	geom.setIndex(new THREE.BufferAttribute(indices, 1));
	return geom;
}

/** Compute 4 corner vertices for a quad based on face direction. */
function quadCorners(
	q: MesherQuad,
	wx: number,
	wz: number,
): [[number, number, number], [number, number, number], [number, number, number], [number, number, number]] {
	const { y, w, h, face } = q;
	switch (face) {
		case FaceDir.PosY: // top face: XZ plane at y+1
			return [
				[wx, y + 1, wz],
				[wx + w, y + 1, wz],
				[wx + w, y + 1, wz + h],
				[wx, y + 1, wz + h],
			];
		case FaceDir.NegY: // bottom face: XZ plane at y
			return [
				[wx, y, wz + h],
				[wx + w, y, wz + h],
				[wx + w, y, wz],
				[wx, y, wz],
			];
		case FaceDir.PosX: // +X face: ZY plane at x+1
			return [
				[wx + 1, y, wz],
				[wx + 1, y, wz + w],
				[wx + 1, y + h, wz + w],
				[wx + 1, y + h, wz],
			];
		case FaceDir.NegX: // -X face: ZY plane at x
			return [
				[wx, y, wz + w],
				[wx, y, wz],
				[wx, y + h, wz],
				[wx, y + h, wz + w],
			];
		case FaceDir.PosZ: // +Z face: XY plane at z+1
			return [
				[wx + w, y, wz + 1],
				[wx, y, wz + 1],
				[wx, y + h, wz + 1],
				[wx + w, y + h, wz + 1],
			];
		case FaceDir.NegZ: // -Z face: XY plane at z
			return [
				[wx, y, wz],
				[wx + w, y, wz],
				[wx + w, y + h, wz],
				[wx, y + h, wz],
			];
	}
}
