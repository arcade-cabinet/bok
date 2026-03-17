// ─── Rune Face Renderer ───
// Converts glyph stroke paths to world-space coordinates on block faces.
// Used for rendering inscribed runes as decals on voxel block faces.
// Pure math — no Three.js. Outputs world-space 3D points.

import type { RuneIdValue } from "../ecs/systems/rune-data.ts";
import type { Stroke, StrokePoint } from "./runes/glyph-strokes.ts";
import { getGlyph } from "./runes/glyph-strokes.ts";

/** UV rectangle for a block face. */
export interface FaceUV {
	u0: number;
	v0: number;
	u1: number;
	v1: number;
	centerX: number;
	centerY: number;
	centerZ: number;
}

/** 3D point in world space. */
export interface WorldPoint {
	x: number;
	y: number;
	z: number;
}

/** Glyph rendering data mapped to a block face in world space. */
export interface FaceGlyphData {
	runeId: RuneIdValue;
	strokes: WorldPoint[][];
	faceIndex: number;
}

/** Slight offset from face to prevent z-fighting. */
const DECAL_OFFSET = 0.01;
/** Glyph is inset from face edges by this margin. */
const GLYPH_MARGIN = 0.1;
/** Glyph drawing area on the face (1 - 2*margin). */
const GLYPH_SIZE = 1 - GLYPH_MARGIN * 2;

/**
 * Compute a UV rect for a block face in world space.
 * Used for texture mapping and glyph placement.
 */
export function computeFaceUV(
	blockX: number,
	blockY: number,
	blockZ: number,
	faceIndex: number,
): FaceUV {
	const cx = blockX + 0.5;
	const cy = blockY + 0.5;
	const cz = blockZ + 0.5;

	return {
		u0: 0,
		v0: 0,
		u1: 1,
		v1: 1,
		centerX: cx + FACE_NORMAL_X[faceIndex] * 0.5,
		centerY: cy + FACE_NORMAL_Y[faceIndex] * 0.5,
		centerZ: cz + FACE_NORMAL_Z[faceIndex] * 0.5,
	};
}

// Face normal components (indexed by faceIndex 0-5)
const FACE_NORMAL_X = [1, -1, 0, 0, 0, 0];
const FACE_NORMAL_Y = [0, 0, 1, -1, 0, 0];
const FACE_NORMAL_Z = [0, 0, 0, 0, 1, -1];

// Tangent (U-axis) for each face
const FACE_TAN_X = [0, 0, 1, 1, 1, -1];
const FACE_TAN_Y = [0, 0, 0, 0, 0, 0];
const FACE_TAN_Z = [1, -1, 0, 0, 0, 0];

// Bitangent (V-axis) for each face
const FACE_BITAN_X = [0, 0, 0, 0, 0, 0];
const FACE_BITAN_Y = [-1, -1, 0, 0, -1, -1];
const FACE_BITAN_Z = [0, 0, -1, 1, 0, 0];

/**
 * Convert glyph strokes from [0,1]² space to world coordinates on a block face.
 * Returns null if runeId is 0 (None) or glyph not found.
 */
export function glyphToFaceCoords(
	runeId: number,
	faceIndex: number,
	blockX: number,
	blockY: number,
	blockZ: number,
): FaceGlyphData | null {
	if (runeId === 0) return null;
	const glyph = getGlyph(runeId as RuneIdValue);
	if (!glyph) return null;

	const cx = blockX + 0.5;
	const cy = blockY + 0.5;
	const cz = blockZ + 0.5;

	const nx = FACE_NORMAL_X[faceIndex];
	const ny = FACE_NORMAL_Y[faceIndex];
	const nz = FACE_NORMAL_Z[faceIndex];
	const tx = FACE_TAN_X[faceIndex];
	const ty = FACE_TAN_Y[faceIndex];
	const tz = FACE_TAN_Z[faceIndex];
	const bx = FACE_BITAN_X[faceIndex];
	const by = FACE_BITAN_Y[faceIndex];
	const bz = FACE_BITAN_Z[faceIndex];

	const worldStrokes = glyph.strokes.map((stroke: Stroke) =>
		stroke.map((pt: StrokePoint): WorldPoint => {
			// Map [0,1]² glyph coords to [-0.5+margin, 0.5-margin] face coords
			const u = (pt.x - 0.5) * GLYPH_SIZE;
			const v = (pt.y - 0.5) * GLYPH_SIZE;

			return {
				x: cx + nx * (0.5 + DECAL_OFFSET) + tx * u + bx * v,
				y: cy + ny * (0.5 + DECAL_OFFSET) + ty * u + by * v,
				z: cz + nz * (0.5 + DECAL_OFFSET) + tz * u + bz * v,
			};
		}),
	);

	return {
		runeId: runeId as RuneIdValue,
		strokes: worldStrokes,
		faceIndex,
	};
}
