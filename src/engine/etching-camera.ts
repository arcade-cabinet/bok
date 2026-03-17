// ─── Etching Camera ───
// Computes camera target position/lookAt for face-on etching view.
// Pure math — no Three.js types. Uses {x,y,z} tuples.

/** Simple 3D vector. */
export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

/** Camera target for etching a specific block face. */
export interface EtchingCameraTarget {
	/** Camera position facing the block face. */
	position: Vec3;
	/** Point the camera looks at (block face center). */
	lookAt: Vec3;
}

/** Distance from block center to camera when etching. */
const ETCHING_CAMERA_DIST = 1.8;

/** Face normals indexed by Face enum (PosX=0, NegX=1, PosY=2, NegY=3, PosZ=4, NegZ=5). */
const FACE_NORMALS: Vec3[] = [
	{ x: 1, y: 0, z: 0 }, // PosX
	{ x: -1, y: 0, z: 0 }, // NegX
	{ x: 0, y: 1, z: 0 }, // PosY
	{ x: 0, y: -1, z: 0 }, // NegY
	{ x: 0, y: 0, z: 1 }, // PosZ
	{ x: 0, y: 0, z: -1 }, // NegZ
];

/**
 * Compute the camera target position and lookAt for etching a block face.
 * Camera positions itself along the face normal, looking at block center.
 *
 * @param blockX - Block X coordinate.
 * @param blockY - Block Y coordinate.
 * @param blockZ - Block Z coordinate.
 * @param faceIndex - Face index (0-5, matching Face enum).
 */
export function computeEtchingTarget(
	blockX: number,
	blockY: number,
	blockZ: number,
	faceIndex: number,
): EtchingCameraTarget {
	const center: Vec3 = {
		x: blockX + 0.5,
		y: blockY + 0.5,
		z: blockZ + 0.5,
	};

	const normal = FACE_NORMALS[faceIndex] ?? FACE_NORMALS[0];

	return {
		position: {
			x: center.x + normal.x * ETCHING_CAMERA_DIST,
			y: center.y + normal.y * ETCHING_CAMERA_DIST,
			z: center.z + normal.z * ETCHING_CAMERA_DIST,
		},
		lookAt: { ...center },
	};
}

/**
 * Linearly interpolate between two Vec3 positions.
 * t is clamped to [0, 1].
 */
export function lerpCameraState(start: Vec3, end: Vec3, t: number): Vec3 {
	const ct = Math.max(0, Math.min(1, t));
	return {
		x: start.x + (end.x - start.x) * ct,
		y: start.y + (end.y - start.y) * ct,
		z: start.z + (end.z - start.z) * ct,
	};
}
