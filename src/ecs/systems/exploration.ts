/**
 * Exploration tracking system — records which chunks the player has visited.
 *
 * Runs every frame but only writes when the player enters a new chunk.
 * Also detects landmarks in newly visited chunks via an injected resolver.
 */

import { ExploredChunks, PlayerTag, Position } from "../traits/index.ts";
import type { LandmarkMarker, LandmarkType } from "./map-data.ts";
import { packChunk, worldToChunk } from "./map-data.ts";

/** Module-level state for landmark tracking. */
let discoveredLandmarks: LandmarkMarker[] = [];
let landmarkResolver: ((cx: number, cz: number) => LandmarkType | null) | null = null;

/** Register a function that resolves landmark type for a chunk. */
export function registerLandmarkResolver(resolver: (cx: number, cz: number) => LandmarkType | null): void {
	landmarkResolver = resolver;
}

/** Get all discovered landmarks (read by UI). */
export function getDiscoveredLandmarks(): readonly LandmarkMarker[] {
	return discoveredLandmarks;
}

/** Reset module state (for game restart). */
export function resetExplorationState(): void {
	discoveredLandmarks = [];
}

/** Previous chunk coords to detect transitions. */
let prevCx = Number.NaN;
let prevCz = Number.NaN;

/**
 * Exploration system — checks player chunk each frame.
 * Only updates the ExploredChunks set when the player crosses a chunk boundary.
 */
export function explorationSystem(world: import("koota").World, _dt: number): void {
	world.query(PlayerTag, Position, ExploredChunks).updateEach(([pos, explored]) => {
		const [cx, cz] = worldToChunk(pos.x, pos.z);

		if (cx === prevCx && cz === prevCz) return;
		prevCx = cx;
		prevCz = cz;

		const key = packChunk(cx, cz);
		if (explored.visited.has(key)) return;
		explored.visited.add(key);

		// Check for landmark in newly explored chunk
		if (landmarkResolver) {
			const type = landmarkResolver(cx, cz);
			if (type) {
				discoveredLandmarks.push({ cx, cz, type });
			}
		}
	});
}
