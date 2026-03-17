/**
 * Chunk streaming — loads/unloads voxel chunks around the player.
 * Runs each frame from GameBridge.update() after ECS systems.
 */

import type { World } from "koota";
import { getActiveQuality } from "../ecs/systems/quality-presets.ts";
import { PlayerTag, Position } from "../ecs/traits/index.ts";
import { CHUNK_SIZE, generateChunkTerrain, WORLD_HEIGHT } from "../world/terrain-generator.ts";
import type { VoxelRenderer } from "./voxel-types.ts";

const CHUNKS_PER_FRAME = 2;

/** Loaded chunk keys (e.g., "3,-1"). */
export const loadedChunks = new Set<string>();

/** Authoritative chunk voxel storage: key = "cx,cz", value = Map of "x,y,z" -> blockId. */
export const chunkData = new Map<string, Map<string, number>>();

const chunkLoadQueue: Array<{ cx: number; cz: number }> = [];

export function getChunkKey(cx: number, cz: number): string {
	return `${cx},${cz}`;
}

export function getVoxelKey(x: number, y: number, z: number): string {
	return `${x},${y},${z}`;
}

/** Stream chunks around the player — enqueue, generate, unload distant. */
export function streamChunks(world: World, vr: VoxelRenderer) {
	const renderDist = getActiveQuality().renderDistance;
	const unloadDist = renderDist + 2;

	let px = 0,
		pz = 0;
	world.query(PlayerTag, Position).readEach(([pos]) => {
		px = pos.x;
		pz = pos.z;
	});

	const pCx = Math.floor(px / CHUNK_SIZE);
	const pCz = Math.floor(pz / CHUNK_SIZE);

	enqueueNearbyChunks(pCx, pCz, renderDist);
	sortQueueByDistance(pCx, pCz);
	processQueue(vr);
	unloadDistantChunks(vr, pCx, pCz, unloadDist);
}

function enqueueNearbyChunks(pCx: number, pCz: number, dist: number) {
	for (let dx = -dist; dx <= dist; dx++) {
		for (let dz = -dist; dz <= dist; dz++) {
			const cx = pCx + dx;
			const cz = pCz + dz;
			const key = `${cx},${cz}`;
			if (!loadedChunks.has(key)) {
				loadedChunks.add(key);
				chunkLoadQueue.push({ cx, cz });
			}
		}
	}
}

function sortQueueByDistance(pCx: number, pCz: number) {
	chunkLoadQueue.sort((a, b) => {
		const da = (a.cx - pCx) ** 2 + (a.cz - pCz) ** 2;
		const db = (b.cx - pCx) ** 2 + (b.cz - pCz) ** 2;
		return da - db;
	});
}

function processQueue(vr: VoxelRenderer) {
	let generated = 0;
	while (chunkLoadQueue.length > 0 && generated < CHUNKS_PER_FRAME) {
		const chunk = chunkLoadQueue.shift();
		if (!chunk) break;
		generateChunkTerrain(vr, "Ground", chunk.cx, chunk.cz);

		const chunkKey = getChunkKey(chunk.cx, chunk.cz);
		const deltas = chunkData.get(chunkKey);
		if (deltas) {
			for (const [voxelKey, blockId] of deltas.entries()) {
				const [xStr, yStr, zStr] = voxelKey.split(",");
				const x = parseInt(xStr, 10);
				const y = parseInt(yStr, 10);
				const z = parseInt(zStr, 10);
				if (blockId === 0) {
					vr.removeVoxel("Ground", { position: { x, y, z } });
				} else {
					vr.setVoxel("Ground", { position: { x, y, z }, blockId });
				}
			}
		}
		generated++;
	}
}

function unloadDistantChunks(vr: VoxelRenderer, pCx: number, pCz: number, unloadDist: number) {
	for (const key of loadedChunks) {
		const [cxStr, czStr] = key.split(",");
		const cx = parseInt(cxStr, 10);
		const cz = parseInt(czStr, 10);
		if (Math.abs(cx - pCx) > unloadDist || Math.abs(cz - pCz) > unloadDist) {
			for (let lx = 0; lx < CHUNK_SIZE; lx++) {
				for (let lz = 0; lz < CHUNK_SIZE; lz++) {
					const gx = cx * CHUNK_SIZE + lx;
					const gz = cz * CHUNK_SIZE + lz;
					for (let y = 0; y < WORLD_HEIGHT; y++) {
						vr.removeVoxel("Ground", { position: { x: gx, y, z: gz } });
					}
				}
			}
			loadedChunks.delete(key);
		}
	}
}
