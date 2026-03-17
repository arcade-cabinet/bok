// ─── Face Selection ───
// Pure math: compute which face of a block was hit from ray march data,
// detect internal faces, and face normal utilities.
// No ECS, no Three.js — just geometry functions.

import { FACE_COUNT, Face, type FaceIndex } from "./rune-data.ts";

/**
 * Compute the face index from the ray march hit and previous positions.
 * The previous position is the last empty block before the hit.
 * Returns the face that was "entered" — the outward-facing side toward the camera.
 *
 * Returns -1 if the positions are the same (shouldn't happen in practice).
 */
export function computeFaceIndex(
	hitX: number,
	hitY: number,
	hitZ: number,
	prevX: number,
	prevY: number,
	prevZ: number,
): FaceIndex | -1 {
	const dx = prevX - hitX;
	const dy = prevY - hitY;
	const dz = prevZ - hitZ;

	// The largest absolute component determines the face axis
	const ax = Math.abs(dx);
	const ay = Math.abs(dy);
	const az = Math.abs(dz);

	// All zero — same position, no face
	if (ax === 0 && ay === 0 && az === 0) return -1;

	if (ax >= ay && ax >= az) {
		return dx > 0 ? Face.PosX : Face.NegX;
	}
	if (ay >= ax && ay >= az) {
		return dy > 0 ? Face.PosY : Face.NegY;
	}
	return dz > 0 ? Face.PosZ : Face.NegZ;
}

/** Face normal vectors (outward-pointing). Index matches FaceIndex. */
export const FACE_NORMALS: ReadonlyArray<readonly [number, number, number]> = [
	[1, 0, 0], // PosX
	[-1, 0, 0], // NegX
	[0, 1, 0], // PosY
	[0, -1, 0], // NegY
	[0, 0, 1], // PosZ
	[0, 0, -1], // NegZ
];

/**
 * Check if a face is internal (hidden between two adjacent solid blocks).
 * A face is internal when the neighbor block on that side is solid.
 */
export function isInternalFace(
	blockX: number,
	blockY: number,
	blockZ: number,
	faceIndex: FaceIndex,
	isSolid: (x: number, y: number, z: number) => boolean,
): boolean {
	const [nx, ny, nz] = FACE_NORMALS[faceIndex];
	return isSolid(blockX + nx, blockY + ny, blockZ + nz);
}

/**
 * Get all visible (external) face indices for a block.
 * Faces adjacent to solid blocks are excluded.
 */
export function getVisibleFaces(
	blockX: number,
	blockY: number,
	blockZ: number,
	isSolid: (x: number, y: number, z: number) => boolean,
): FaceIndex[] {
	const visible: FaceIndex[] = [];
	for (let i = 0; i < FACE_COUNT; i++) {
		if (!isInternalFace(blockX, blockY, blockZ, i as FaceIndex, isSolid)) {
			visible.push(i as FaceIndex);
		}
	}
	return visible;
}

/**
 * Get all internal (hidden) face indices for a block.
 * These are faces between two adjacent solid blocks — only visible in x-ray mode.
 */
export function getInternalFaces(
	blockX: number,
	blockY: number,
	blockZ: number,
	isSolid: (x: number, y: number, z: number) => boolean,
): FaceIndex[] {
	const internal: FaceIndex[] = [];
	for (let i = 0; i < FACE_COUNT; i++) {
		if (isInternalFace(blockX, blockY, blockZ, i as FaceIndex, isSolid)) {
			internal.push(i as FaceIndex);
		}
	}
	return internal;
}

/** Get the face index name for debug/display purposes. */
export function faceName(faceIndex: FaceIndex): string {
	const names = ["+X", "-X", "+Y", "-Y", "+Z", "-Z"];
	return names[faceIndex] ?? "?";
}
