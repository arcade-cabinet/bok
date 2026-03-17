/**
 * World setup helpers for initGame:
 *   - createVoxelRenderer: allocate + tileset load
 *   - registerWorld: wire voxel accessors to the renderer
 *   - generateSpawnArea: terrain, shrine, delta recording
 *   - spawnPlayerEntity: ECS entity + tutorial runes
 */

import type { World } from "koota";
import type * as THREE from "three";
import { grantTutorialRunes } from "../ecs/systems/rune-discovery-system.ts";
import {
	CameraTransition,
	ChiselState,
	Codex,
	CookingState,
	EtchingState,
	ExploredChunks,
	Health,
	Hotbar,
	Hunger,
	InscriptionLevel,
	Inventory,
	MiningState,
	MoveInput,
	PhysicsBody,
	PlayerState,
	PlayerTag,
	Position,
	QuestProgress,
	Rotation,
	RuneDiscovery,
	RuneFaces,
	SagaLog,
	ShelterState,
	Stamina,
	TerritoryState,
	ToolSwing,
	Velocity,
	WorkstationProximity,
} from "../ecs/traits/index.ts";
import { createBlockDefinitions } from "../world/block-definitions.ts";
import { BlockId } from "../world/blocks.ts";
import { CHUNK_SIZE, generateChunkTerrain, WORLD_HEIGHT } from "../world/terrain-generator.ts";
import { COLS, generateTilesetDataURL, ROWS, TILE_SIZE } from "../world/tileset-generator.ts";
import { registerVoxelAccessors } from "../world/voxel-helpers.ts";
import { findSurfaceY, generateSpawnShrine } from "../world/world-utils.ts";
import { chunkData, getChunkKey, getVoxelKey, loadedChunks } from "./chunk-streaming.ts";
import type { VoxelRenderer } from "./voxel-types.ts";
import { VoxelWorld } from "./voxel-world.ts";

export async function createVoxelRenderer(scene: THREE.Scene): Promise<VoxelRenderer> {
	const renderer = new VoxelWorld(scene, {
		chunkSize: CHUNK_SIZE,
		worldHeight: WORLD_HEIGHT,
		blockDefs: createBlockDefinitions(),
	});
	await renderer.loadTileset({
		id: "default",
		src: generateTilesetDataURL(),
		tileSize: TILE_SIZE,
		cols: COLS,
		rows: ROWS,
	});
	return renderer;
}

export function registerWorld(renderer: VoxelRenderer): void {
	registerVoxelAccessors(
		(x, y, z) => {
			if (y < 0 || y >= WORLD_HEIGHT) return 0;
			const e = renderer.getVoxel({ x, y, z });
			return e ? e.blockId : 0;
		},
		(layerName, x, y, z, blockId) => {
			const cx = Math.floor(x / CHUNK_SIZE);
			const cz = Math.floor(z / CHUNK_SIZE);
			let deltas = chunkData.get(getChunkKey(cx, cz));
			if (!deltas) {
				deltas = new Map();
				chunkData.set(getChunkKey(cx, cz), deltas);
			}
			deltas.set(getVoxelKey(x, y, z), blockId);
			if (blockId === 0) renderer.removeVoxel(layerName, { position: { x, y, z } });
			else renderer.setVoxel(layerName, { position: { x, y, z }, blockId });
		},
	);
}

export function generateSpawnArea(renderer: VoxelRenderer): number {
	generateChunkTerrain(renderer, "Ground", 0, 0);
	loadedChunks.add("0,0");
	const surfaceY = findSurfaceY(renderer, 8, 8);
	generateSpawnShrine(renderer, "Ground", surfaceY);
	recordSpawnShrineDeltas(surfaceY);
	// Flush dirty chunks so the greedy mesher generates visible geometry
	if ("flushDirtyChunks" in renderer) {
		(renderer as { flushDirtyChunks: () => void }).flushDirtyChunks();
	}
	return surfaceY;
}

function recordSpawnShrineDeltas(surfaceY: number): void {
	let deltas = chunkData.get(getChunkKey(0, 0));
	if (!deltas) {
		deltas = new Map();
		chunkData.set(getChunkKey(0, 0), deltas);
	}
	for (let x = 6; x <= 10; x++)
		for (let z = 6; z <= 10; z++) {
			deltas.set(getVoxelKey(x, surfaceY, z), BlockId.StoneBricks);
			for (let y = surfaceY + 1; y <= surfaceY + 5; y++) deltas.set(getVoxelKey(x, y, z), 0);
		}
	for (let dx = -1; dx <= 1; dx++)
		for (let dz = -1; dz <= 1; dz++) deltas.set(getVoxelKey(8 + dx, surfaceY + 1, 8 + dz), BlockId.Stone);
	deltas.set(getVoxelKey(8, surfaceY + 2, 8), BlockId.Stone);
	deltas.set(getVoxelKey(8, surfaceY + 3, 8), BlockId.Stone);
	deltas.set(getVoxelKey(8, surfaceY + 4, 8), BlockId.StoneBricks);
	deltas.set(getVoxelKey(10, surfaceY + 1, 8), BlockId.RuneStone);
	deltas.set(getVoxelKey(10, surfaceY + 2, 8), BlockId.RuneStone);
	deltas.set(getVoxelKey(10, surfaceY + 3, 8), BlockId.RuneStone);
	for (const [cx, cz] of [
		[6, 6],
		[10, 6],
		[6, 10],
		[10, 10],
	] as const)
		deltas.set(getVoxelKey(cx, surfaceY + 1, cz), BlockId.Torch);
}

export function spawnPlayerEntity(world: World, surfaceY: number): void {
	world.spawn(
		PlayerTag,
		Position({ x: 8.5, y: surfaceY + 2.5, z: 8.5 }),
		Velocity,
		Rotation,
		Health,
		Hunger,
		Stamina,
		PhysicsBody,
		MoveInput,
		PlayerState({ isRunning: true, isDead: false, damageFlash: 0 }),
		Inventory,
		Hotbar,
		MiningState,
		QuestProgress,
		ToolSwing,
		CookingState,
		WorkstationProximity,
		InscriptionLevel,
		ShelterState,
		TerritoryState,
		ExploredChunks,
		Codex,
		SagaLog,
		RuneFaces,
		RuneDiscovery,
		ChiselState(),
		EtchingState(),
		CameraTransition(),
	);
	world.query(PlayerTag, RuneDiscovery).updateEach(([disc]) => {
		grantTutorialRunes(disc.discovered);
	});
}
