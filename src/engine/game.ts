/**
 * Core game engine — thin orchestrator bridging GameLoop (rendering) with Koota (ECS).
 *
 * Visual renderers:   renderer-manager.ts
 * Frame update loop:  game-bridge.ts (GameBridge Behavior)
 * Rune simulation:    rune-bridge.ts
 * World setup:        game-world-setup.ts
 * Save/load:          game-save.ts
 * Side effects:       game-effects.ts
 */

import { createWorld as createKootaWorld } from "koota";
import * as THREE from "three";
import { registerBiomeResolver } from "../ecs/systems/creature-spawner.ts";
import { registerLandmarkResolver, resetExplorationState } from "../ecs/systems/exploration.ts";
import { resetLightState } from "../ecs/systems/light.ts";
import { getActiveQuality, resetQualityState, setRenderDistanceOverride } from "../ecs/systems/quality-presets.ts";
import { executeFastTravel, getActiveAnchors, resetRaidoState } from "../ecs/systems/raido-system.ts";
import type { TravelAnchor } from "../ecs/systems/raido-travel.ts";
import { registerDiscoveryBiomeResolver, resetDiscoveryState } from "../ecs/systems/rune-discovery-system.ts";
import { registerSagaBiomeResolver, resetSagaState } from "../ecs/systems/saga.ts";
import { resetSeasonState } from "../ecs/systems/season.ts";
import { resetSeasonEffectsState } from "../ecs/systems/season-effects.ts";
import { resetPauseState } from "../ecs/systems/session-pause.ts";
import { resetSettlementState } from "../ecs/systems/settlement-system.ts";
import { resetTerritoryState } from "../ecs/systems/territory.ts";
import { resetVehiclePool } from "../ecs/systems/yuka-bridge.ts";
import { resetYukaCreatureSystem } from "../ecs/systems/yuka-creature-system.ts";
import { resetFsmContexts } from "../ecs/systems/yuka-states-shared.ts";
import {
	Hotbar,
	InscriptionLevel,
	Inventory,
	NorrskenEvent,
	PlayerTag,
	Position,
	SeasonState,
	ToolSwing,
	WorldSeed,
	WorldTime,
} from "../ecs/traits/index.ts";
import { biomeAt, detectLandmarkType } from "../world/landmark-generator.ts";
import { initNoise } from "../world/noise.ts";
import { CHUNK_SIZE } from "../world/terrain-generator.ts";
import { setVoxelAt, setVoxelDeltaListener } from "../world/voxel-helpers.ts";
import { InputBehavior } from "./behaviors/InputBehavior.ts";
import { chunkData, loadedChunks } from "./chunk-streaming.ts";
import { initAutopilot } from "./dev-autopilot.ts";
import { initDevBridge, setDevRendererStats } from "./dev-bridge.ts";
import { GameBridge, resetCombatDrainTimer } from "./game-bridge.ts";
import { GameLoop } from "./game-loop.ts";
import { createVoxelRenderer, generateSpawnArea, registerWorld, spawnPlayerEntity } from "./game-world-setup.ts";
import { InputSystem } from "./input-system.ts";
import { bindRenderer, registerPerfShortcut, stopMonitor } from "./perf-monitor.ts";
import {
	createRenderers,
	disposeRenderers,
	getBlockHighlightRenderer,
	getParticlesRenderer,
	spawnParticles,
} from "./renderer-manager.ts";
import { initRuneWorld, resetRuneWorld } from "./rune-bridge.ts";
import type { VoxelRenderer } from "./voxel-types.ts";

export const kootaWorld = createKootaWorld();

let gameLoop: GameLoop | null = null;
let inputSystem: InputSystem | null = null;
let voxelRenderer: VoxelRenderer | null = null;
let threeScene: THREE.Scene | null = null;
let threeCamera: THREE.PerspectiveCamera | null = null;
let ambientLight: THREE.AmbientLight | null = null;
let sunLight: THREE.DirectionalLight | null = null;
let resizeHandler: (() => void) | null = null;

const spawn = (x: number, y: number, z: number, color: number | string, count: number) =>
	spawnParticles(x, y, z, color, count);

function resolveLandmarkForChunk(cx: number, cz: number): import("../ecs/systems/map-data.ts").LandmarkType | null {
	const type = detectLandmarkType(cx, cz);
	return type ? (type as import("../ecs/systems/map-data.ts").LandmarkType) : null;
}

// ─── Public API ───

export async function initGame(canvas: HTMLCanvasElement, seed: string): Promise<void> {
	if (gameLoop) {
		gameLoop.stop();
		gameLoop = null;
	}

	initNoise(seed);
	registerBiomeResolver(biomeAt);
	registerLandmarkResolver((cx, cz) => resolveLandmarkForChunk(cx, cz));
	registerSagaBiomeResolver(biomeAt);
	registerDiscoveryBiomeResolver(biomeAt);

	gameLoop = new GameLoop(canvas);
	const quality = getActiveQuality();

	threeScene = gameLoop.scene;
	threeScene.background = new THREE.Color(0x87ceeb);
	threeScene.fog = new THREE.Fog(0x87ceeb, quality.fogNear, quality.renderDistance * CHUNK_SIZE * quality.fogFar);

	threeCamera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
	gameLoop.setCamera(threeCamera);

	ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
	threeScene.add(ambientLight);
	sunLight = new THREE.DirectionalLight(0xffffee, 1.2);
	sunLight.castShadow = true;
	sunLight.shadow.camera.near = 0.5;
	sunLight.shadow.camera.far = 150;
	sunLight.shadow.camera.left = -40;
	sunLight.shadow.camera.right = 40;
	sunLight.shadow.camera.top = 40;
	sunLight.shadow.camera.bottom = -40;
	sunLight.shadow.mapSize.width = quality.shadowMapSize;
	sunLight.shadow.mapSize.height = quality.shadowMapSize;
	threeScene.add(sunLight.target);

	inputSystem = new InputSystem(canvas);
	gameLoop.setInputSystem(inputSystem);

	createRenderers(threeScene, threeCamera, ambientLight, sunLight);

	voxelRenderer = await createVoxelRenderer(threeScene);
	registerWorld(voxelRenderer);
	const surfaceY = generateSpawnArea(voxelRenderer);

	spawnPlayerEntity(kootaWorld, surfaceY);
	initRuneWorld();
	kootaWorld.spawn(WorldTime({ timeOfDay: 0.25, dayDuration: 900, dayCount: 1 }), WorldSeed({ seed }), SeasonState());
	kootaWorld.spawn(NorrskenEvent());

	gameLoop.addBehavior(new InputBehavior(inputSystem));
	const capturedCamera = threeCamera;
	const capturedAmbient = ambientLight;
	gameLoop.addBehavior(
		new GameBridge(
			kootaWorld,
			() => capturedCamera,
			() => voxelRenderer,
			() => capturedAmbient,
		),
	);

	initDevBridge(kootaWorld);
	initAutopilot();

	threeCamera.position.set(8.5, surfaceY + 2, 8.5);
	threeCamera.updateProjectionMatrix();
	resizeHandler = () => {
		if (!threeCamera) return;
		threeCamera.aspect = canvas.clientWidth / canvas.clientHeight;
		threeCamera.updateProjectionMatrix();
	};
	window.addEventListener("resize", resizeHandler);

	bindRenderer(gameLoop.renderer);
	registerPerfShortcut();
	gameLoop.start();

	// Wire dev bridge renderer stats
	if (import.meta.env.DEV && gameLoop) {
		const gl = gameLoop;
		setInterval(() => {
			setDevRendererStats(gl.lastDrawCalls, gl.lastTriangles);
		}, 500);
	}
}

// ─── Getters ───

export function getKootaWorld() {
	return kootaWorld;
}
export function getVoxelRenderer() {
	return voxelRenderer;
}
export function getBlockHighlight() {
	return getBlockHighlightRenderer();
}
export function getParticlesBehavior() {
	return getParticlesRenderer();
}
export function releasePointerLock() {
	inputSystem?.unlockMouse();
}
export function requestPointerLock() {
	inputSystem?.lockMouse();
}

// ─── Block placement ───

export function placeBlock() {
	const bhr = getBlockHighlightRenderer();
	if (!bhr) return;
	const prev = bhr.lastPrev;
	if (!prev) return;
	kootaWorld
		.query(PlayerTag, Hotbar, Inventory, Position, ToolSwing, InscriptionLevel)
		.updateEach(([hotbar, inv, pos, toolSwing, inscription]) => {
			const slot = hotbar.slots[hotbar.activeSlot];
			if (!slot || slot.type !== "block") return;
			const count = inv.items[slot.id] ?? 0;
			if (count <= 0) return;
			if (
				prev.x === Math.floor(pos.x) &&
				prev.z === Math.floor(pos.z) &&
				(prev.y === Math.floor(pos.y) || prev.y === Math.floor(pos.y - 1))
			)
				return;
			inv.items[slot.id] = count - 1;
			if (inv.items[slot.id] === 0) delete inv.items[slot.id];
			setVoxelAt("Ground", prev.x, prev.y, prev.z, slot.id);
			inscription.totalBlocksPlaced++;
			toolSwing.progress = 1.0;
		});
}

// ─── Save/load re-exports (delegates to game-save.ts) ───

import {
	applyRuneEntries as _applyRunes,
	readPlayerStateForSave as _readSave,
	restorePlayerState as _restore,
	getRuneIndexEntries,
} from "./game-save.ts";
export function readPlayerStateForSave() {
	return _readSave(kootaWorld);
}
export function restorePlayerState(data: import("../persistence/db.ts").PlayerSaveData) {
	_restore(kootaWorld, data);
}
export function applyVoxelDeltas(deltas: Array<{ x: number; y: number; z: number; blockId: number }>) {
	for (const d of deltas) setVoxelAt("Ground", d.x, d.y, d.z, d.blockId);
}
export function getAllVoxelDeltas() {
	const result: Array<{ x: number; y: number; z: number; blockId: number }> = [];
	for (const [, deltas] of chunkData.entries())
		for (const [vk, bid] of deltas.entries()) {
			const [x, y, z] = vk.split(",").map(Number);
			result.push({ x, y, z, blockId: bid });
		}
	return result;
}
export { getRuneIndexEntries };
export function applyRuneEntries(entries: Array<{ x: number; y: number; z: number; face: number; runeId: number }>) {
	_applyRunes(kootaWorld, entries);
}
export function enableVoxelDeltaTracking(listener: (x: number, y: number, z: number, blockId: number) => void) {
	setVoxelDeltaListener(listener);
}
export function disableVoxelDeltaTracking() {
	setVoxelDeltaListener(null);
}
export function getTravelAnchors(): readonly TravelAnchor[] {
	return getActiveAnchors();
}
export function travelToAnchor(target: TravelAnchor, cost: number): boolean {
	const success = executeFastTravel(kootaWorld, target, cost);
	if (success) spawn(target.x + 0.5, target.y + 2, target.z + 0.5, 0x6a5acd, 20);
	return success;
}
export { setGamePaused } from "../ecs/systems/session-pause.ts";
export function applyRenderDistance(distance: number) {
	setRenderDistanceOverride(distance);
	if (threeScene?.fog instanceof THREE.Fog) {
		const q = getActiveQuality();
		threeScene.fog.near = q.fogNear;
		threeScene.fog.far = q.renderDistance * CHUNK_SIZE * q.fogFar;
	}
}

// ─── Cleanup ───

export function destroyGame(): void {
	if (resizeHandler) {
		window.removeEventListener("resize", resizeHandler);
		resizeHandler = null;
	}
	setVoxelDeltaListener(null);
	stopMonitor();
	gameLoop?.stop();
	gameLoop = null;
	inputSystem?.dispose();
	inputSystem = null;
	threeScene = null;
	threeCamera = null;
	voxelRenderer = null;
	ambientLight = null;
	sunLight = null;
	loadedChunks.clear();
	chunkData.clear();
	resetCombatDrainTimer();
	disposeRenderers();
	resetRuneWorld();
	resetSettlementState();
	resetTerritoryState();
	resetLightState();
	resetExplorationState();
	resetRaidoState();
	resetSagaState();
	resetDiscoveryState();
	resetSeasonState();
	resetSeasonEffectsState();
	resetQualityState();
	resetPauseState();
	resetVehiclePool();
	resetFsmContexts();
	resetYukaCreatureSystem();
	kootaWorld.reset();
}
