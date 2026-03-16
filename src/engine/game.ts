/**
 * Core game engine — bridges Jolly Pixel (rendering + Actors) with Koota (ECS state).
 *
 * All 3D scene objects are managed as Jolly Pixel Actors with Behaviors:
 *  - GameBridge: runs Koota systems, syncs state to camera + behaviors
 *  - CelestialBehavior: sun/moon orbit, sky color, stars
 *  - ViewModelBehavior: first-person held item with sway/bob/swing
 *  - BlockHighlightBehavior: wireframe on targeted block + raycasting
 *  - ParticlesBehavior: instanced mesh particles for mining/combat/sprint
 *  - AmbientParticlesBehavior: floating atmospheric particles
 */

import { Behavior } from "@jolly-pixel/engine";
import { loadRuntime, Runtime } from "@jolly-pixel/runtime";
import { VoxelRenderer } from "@jolly-pixel/voxel.renderer";
import { createWorld as createKootaWorld } from "koota";
import * as THREE from "three";
import { resetComputationalRuneState } from "../ecs/systems/computational-rune-system.ts";
import type { CreatureEffects } from "../ecs/systems/creature.ts";
import { registerBiomeResolver } from "../ecs/systems/creature-spawner.ts";
import { resetEmitterState } from "../ecs/systems/emitter-system.ts";
import { registerLandmarkResolver, resetExplorationState } from "../ecs/systems/exploration.ts";
import {
	codexSystem,
	cookingSystem,
	creatureSystem,
	eatingSystem,
	explorationSystem,
	lightSystem,
	miningSystem,
	movementSystem,
	physicsSystem,
	questSystem,
	runeInscriptionSystem,
	sagaSystem,
	seasonSystem,
	structureSystem,
	survivalSystem,
	timeSystem,
	workstationProximitySystem,
} from "../ecs/systems/index.ts";
import { resetInteractionRuneState } from "../ecs/systems/interaction-rune-system.ts";
import { resetLightState } from "../ecs/systems/light.ts";
import type { BlockHit, MiningSideEffects } from "../ecs/systems/mining.ts";
import { resetNetworkRuneState } from "../ecs/systems/network-rune-system.ts";
import { resetProtectionRuneState } from "../ecs/systems/protection-rune-system.ts";
import { getActiveQuality, resetQualityState, setRenderDistanceOverride } from "../ecs/systems/quality-presets.ts";
import { executeFastTravel, getActiveAnchors, resetRaidoState } from "../ecs/systems/raido-system.ts";
import type { TravelAnchor } from "../ecs/systems/raido-travel.ts";
import {
	grantTutorialRunes,
	registerDiscoveryBiomeResolver,
	resetDiscoveryState,
} from "../ecs/systems/rune-discovery-system.ts";
import { getRuneIndex, resetRuneIndex } from "../ecs/systems/rune-index.ts";
import type { FaceHit, RuneInscriptionEffects } from "../ecs/systems/rune-inscription.ts";
import { registerSagaBiomeResolver, resetSagaState } from "../ecs/systems/saga.ts";
import { resetSeasonState } from "../ecs/systems/season.ts";
import { resetSelfModifyState } from "../ecs/systems/self-modify-system.ts";
import { resetSettlementState } from "../ecs/systems/settlement-system.ts";
import { resetTerritoryState } from "../ecs/systems/territory.ts";
import { COMBAT_DRAIN_COOLDOWN, drainDurability } from "../ecs/systems/tool-durability.ts";
import type { AnimStateId } from "../ecs/traits/index.ts";
import {
	ChiselState,
	Codex,
	CookingState,
	CreatureAnimation,
	CreatureHealth,
	CreatureTag,
	ExploredChunks,
	Health,
	Hotbar,
	Hunger,
	InscriptionLevel,
	Inventory,
	MiningState,
	MoveInput,
	NorrskenEvent,
	PhysicsBody,
	PlayerState,
	PlayerTag,
	Position,
	QuestProgress,
	Rotation,
	RuneDiscovery,
	RuneFaces,
	SagaLog,
	SeasonState,
	ShelterState,
	Stamina,
	TerritoryState,
	ToolSwing,
	Velocity,
	WorkstationProximity,
	WorldSeed,
	WorldTime,
} from "../ecs/traits/index.ts";
import { createBlockDefinitions } from "../world/block-definitions.ts";
import { BlockId } from "../world/blocks.ts";
import { biomeAt, detectLandmarkType } from "../world/landmark-generator.ts";
import { cosmeticRng, initNoise } from "../world/noise.ts";
import { CHUNK_SIZE, generateChunkTerrain, WORLD_HEIGHT } from "../world/terrain-generator.ts";
import { COLS, generateTilesetDataURL, ROWS, TILE_SIZE } from "../world/tileset-generator.ts";
import {
	getVoxelAt,
	isBlockSolid,
	registerVoxelAccessors,
	setVoxelAt,
	setVoxelDeltaListener,
} from "../world/voxel-helpers.ts";
import { findSurfaceY, generateSpawnShrine } from "../world/world-utils.ts";
import { AmbientParticlesBehavior } from "./behaviors/AmbientParticlesBehavior.ts";
import { BlockHighlightBehavior } from "./behaviors/BlockHighlightBehavior.ts";
import { CelestialBehavior } from "./behaviors/CelestialBehavior.ts";
import { CreatureRendererBehavior } from "./behaviors/CreatureRendererBehavior.ts";
import { InputBehavior, resetJoystickState } from "./behaviors/InputBehavior.ts";
import { ParticlesBehavior } from "./behaviors/ParticlesBehavior.ts";
import { ViewModelBehavior } from "./behaviors/ViewModelBehavior.ts";
import { chunkData, getChunkKey, getVoxelKey, loadedChunks, streamChunks } from "./chunk-streaming.ts";
import {
	runComputationalRuneSystem,
	runEmitterSystem,
	runInteractionRuneSystem,
	runNetworkRuneSystem,
	runProtectionRuneSystem,
	runRaidoSystem,
	runRuneDiscoverySystem,
	runSelfModifySystem,
	runSettlementSystem,
	runTerritorySystem,
	runWorldEventSystem,
} from "./game-effects.ts";

export const kootaWorld = createKootaWorld();

let jpRuntime: Runtime | null = null;
let voxelRenderer: VoxelRenderer | null = null;

let threeScene: THREE.Scene | null = null;
let threeCamera: THREE.PerspectiveCamera | null = null;

// Jolly Pixel Actor-managed behaviors
let viewModelBehavior: ViewModelBehavior | null = null;
let celestialBehavior: CelestialBehavior | null = null;
let blockHighlightBehavior: BlockHighlightBehavior | null = null;
let particlesBehavior: ParticlesBehavior | null = null;
let ambientParticlesBehavior: AmbientParticlesBehavior | null = null;
let creatureRendererBehavior: CreatureRendererBehavior | null = null;

let ambientLight: THREE.AmbientLight | null = null;
let sunLight: THREE.DirectionalLight | null = null;
let resizeHandler: (() => void) | null = null;
let combatDrainTimer = 0;

function resolveLandmarkForChunk(cx: number, cz: number): import("../ecs/systems/map-data.ts").LandmarkType | null {
	const type = detectLandmarkType(cx, cz);
	return type ? (type as import("../ecs/systems/map-data.ts").LandmarkType) : null;
}

/** Shared particle spawn shorthand. */
const spawn = (x: number, y: number, z: number, color: number | string, count: number) =>
	particlesBehavior?.spawn(x, y, z, color as number, count);

/**
 * GameBridge Behavior — runs on a Jolly Pixel Actor each frame.
 * Drives all Koota ECS systems and pushes state to the visual Behaviors.
 */
class GameBridge extends Behavior {
	awake() {
		this.needUpdate = true;
	}

	update(dt: number) {
		if (dt <= 0 || dt > 0.1) return;

		// Core ECS systems
		movementSystem(kootaWorld, dt);
		physicsSystem(kootaWorld, dt);
		survivalSystem(kootaWorld, dt);
		eatingSystem(kootaWorld, dt);
		cookingSystem(kootaWorld, dt);
		questSystem(kootaWorld, dt);
		timeSystem(kootaWorld, dt);
		seasonSystem(kootaWorld, dt);
		workstationProximitySystem(kootaWorld, dt, (x, y, z) => getVoxelAt(x, y, z));
		structureSystem(kootaWorld, dt, (x, y, z) => getVoxelAt(x, y, z), isBlockSolid);
		lightSystem(kootaWorld, dt, (x, y, z) => getVoxelAt(x, y, z));

		// Rune + settlement systems (side-effects wired in game-effects.ts)
		runEmitterSystem(kootaWorld, dt, spawn);
		runInteractionRuneSystem(kootaWorld, dt, spawn);
		runProtectionRuneSystem(kootaWorld, dt, spawn);
		runNetworkRuneSystem(kootaWorld, dt, spawn);
		runComputationalRuneSystem(kootaWorld, dt, spawn);
		runSelfModifySystem(kootaWorld, dt, spawn);
		runSettlementSystem(kootaWorld, dt, spawn);
		runTerritorySystem(kootaWorld, dt, spawn);
		runRaidoSystem(kootaWorld, dt, spawn);
		explorationSystem(kootaWorld, dt);
		this.runCreatureSystem(dt);
		codexSystem(kootaWorld, dt);
		sagaSystem(kootaWorld, dt);
		runRuneDiscoverySystem(kootaWorld, dt, spawn);
		runWorldEventSystem(kootaWorld, dt, spawn, ambientLight);

		// Sync Koota → Three.js camera + Behaviors
		this.syncPlayerToCamera();
		this.syncViewModelState();
		this.syncEnvironmentState();
		this.runRuneInscriptionSystem(dt);
		this.runMiningSystem(dt);
		if (voxelRenderer) streamChunks(kootaWorld, voxelRenderer);
	}

	private syncPlayerToCamera() {
		const cam = threeCamera;
		if (!cam) return;
		kootaWorld
			.query(PlayerTag, Position, Rotation, MoveInput, PhysicsBody, ToolSwing, PlayerState)
			.readEach(([pos, rot, input, body, toolSwing, state]) => {
				cam.position.set(pos.x + state.shakeX, pos.y + state.shakeY, pos.z);
				cam.rotation.order = "YXZ";
				cam.rotation.set(rot.pitch, rot.yaw, 0);
				creatureRendererBehavior?.setCameraPosition(pos.x, pos.y, pos.z);
				if (viewModelBehavior) {
					viewModelBehavior.isMoving = (input.forward || input.backward || input.left || input.right) && body.onGround;
					viewModelBehavior.isSprinting = input.sprint;
					viewModelBehavior.swingProgress = toolSwing.progress;
					viewModelBehavior.swayX = toolSwing.swayX;
					viewModelBehavior.swayY = toolSwing.swayY;
				}
				if (input.sprint && body.onGround && (input.forward || input.backward || input.left || input.right)) {
					if (cosmeticRng() < 0.3) spawn(pos.x, pos.y - 1.6, pos.z, 0x8b7355, 1);
				}
			});
	}

	private syncViewModelState() {
		kootaWorld.query(PlayerTag, Hotbar).readEach(([hotbar]) => {
			if (viewModelBehavior) viewModelBehavior.slotData = hotbar.slots[hotbar.activeSlot];
		});
	}

	private syncEnvironmentState() {
		let timeOfDay = 0.25;
		let px = 0,
			py = 0,
			pz = 0;
		kootaWorld.query(WorldTime).readEach(([time]) => {
			timeOfDay = time.timeOfDay;
		});
		kootaWorld.query(PlayerTag, Position).readEach(([pos]) => {
			px = pos.x;
			py = pos.y;
			pz = pos.z;
		});
		if (celestialBehavior) {
			celestialBehavior.timeOfDay = timeOfDay;
			celestialBehavior.playerX = px;
			celestialBehavior.playerZ = pz;
		}
		if (ambientParticlesBehavior) {
			ambientParticlesBehavior.timeOfDay = timeOfDay;
			ambientParticlesBehavior.playerX = px;
			ambientParticlesBehavior.playerY = py;
			ambientParticlesBehavior.playerZ = pz;
		}
	}

	private runCreatureSystem(dt: number) {
		const effects: CreatureEffects = {
			spawnParticles: spawn,
			onCreatureSpawned: (entityId, species, variant) =>
				creatureRendererBehavior?.assignMesh(entityId, species, variant),
			onCreatureDied: (entityId) => creatureRendererBehavior?.releaseMesh(entityId),
		};
		creatureSystem(kootaWorld, dt, effects);
		let timeOfDay = 0.25;
		kootaWorld.query(WorldTime).readEach(([time]) => {
			timeOfDay = time.timeOfDay;
		});
		const isDaytime = timeOfDay > 0 && timeOfDay < 0.5;
		kootaWorld.query(CreatureTag, CreatureAnimation, Position).readEach(([anim, pos], entity) => {
			creatureRendererBehavior?.updatePosition(
				entity.id(),
				pos.x,
				pos.y,
				pos.z,
				anim.animState as AnimStateId,
				isDaytime,
			);
		});
	}

	private runRuneInscriptionSystem(dt: number) {
		const hit = blockHighlightBehavior?.lastHit ?? null;
		const prev = blockHighlightBehavior?.lastPrev ?? null;
		const faceHit: FaceHit | null =
			hit && prev ? { blockX: hit.x, blockY: hit.y, blockZ: hit.z, prevX: prev.x, prevY: prev.y, prevZ: prev.z } : null;
		const effects: RuneInscriptionEffects = { spawnParticles: spawn };
		runeInscriptionSystem(kootaWorld, dt, faceHit, effects);
	}

	private runMiningSystem(dt: number) {
		const hit: BlockHit | null = blockHighlightBehavior?.lastHit ?? null;
		const effects: MiningSideEffects = {
			removeBlock: (x, y, z) => {
				setVoxelAt("Ground", x, y, z, 0);
				getRuneIndex().removeBlock(x, y, z);
				kootaWorld.query(PlayerTag, PlayerState).updateEach(([state]) => {
					state.shakeX = (cosmeticRng() - 0.5) * 0.06;
					state.shakeY = (cosmeticRng() - 0.5) * 0.04;
				});
			},
			spawnParticles: spawn,
		};
		miningSystem(kootaWorld, dt, hit, effects);
		this.checkEnemyCombat(dt);
	}

	private checkEnemyCombat(dt: number) {
		let px = 0,
			py = 0,
			pz = 0;
		let isMining = false;
		let toolPower = 2;
		kootaWorld
			.query(PlayerTag, Position, MiningState, Hotbar, ToolSwing)
			.readEach(([pos, mining, hotbar, toolSwing]) => {
				px = pos.x;
				py = pos.y;
				pz = pos.z;
				isMining = mining.active;
				if (toolSwing.progress > 0.5 && hotbar.slots[hotbar.activeSlot]?.type === "item") toolPower = 4;
			});
		if (!isMining) {
			combatDrainTimer = 0;
			return;
		}
		let hitAny = false;
		kootaWorld.query(CreatureTag, CreatureHealth, Position).updateEach(([hp, pos]) => {
			const dist = Math.sqrt((pos.x - px) ** 2 + (pos.y - py) ** 2 + (pos.z - pz) ** 2);
			if (dist < 3) {
				hp.hp -= toolPower * 0.03 * dt;
				spawn(pos.x, pos.y + 0.9, pos.z, 0xff0000, 2);
				hitAny = true;
			}
		});
		if (hitAny) {
			combatDrainTimer += dt;
			if (combatDrainTimer >= COMBAT_DRAIN_COOLDOWN) {
				combatDrainTimer -= COMBAT_DRAIN_COOLDOWN;
				kootaWorld.query(PlayerTag, Hotbar).updateEach(([hotbar]) => {
					const slot = hotbar.slots[hotbar.activeSlot];
					if (slot?.type === "item" && drainDurability(slot)) {
						hotbar.slots[hotbar.activeSlot] = null;
						spawn(px, py, pz, 0xaaaaaa, 20);
					}
				});
			}
		}
	}
}

// ─── Public API ───

export async function initGame(canvas: HTMLCanvasElement, seed: string): Promise<void> {
	if (jpRuntime) {
		jpRuntime.stop();
		jpRuntime = null;
	}

	initNoise(seed);
	registerBiomeResolver(biomeAt);
	registerLandmarkResolver((cx, cz) => resolveLandmarkForChunk(cx, cz));
	registerSagaBiomeResolver(biomeAt);
	registerDiscoveryBiomeResolver(biomeAt);

	jpRuntime = new Runtime(canvas, { includePerformanceStats: false });
	const jpWorld = jpRuntime.world;

	threeScene = jpWorld.sceneManager.default;
	threeScene.background = new THREE.Color(0x87ceeb);
	const quality = getActiveQuality();
	threeScene.fog = new THREE.Fog(0x87ceeb, quality.fogNear, quality.renderDistance * CHUNK_SIZE * quality.fogFar);

	threeCamera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
	jpWorld.renderer.addRenderComponent(threeCamera);

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

	// Actor setup
	celestialBehavior = jpWorld.createActor("Celestial").addComponentAndGet(CelestialBehavior);
	celestialBehavior.setup(threeScene, ambientLight, sunLight);
	ambientParticlesBehavior = jpWorld.createActor("AmbientParticles").addComponentAndGet(AmbientParticlesBehavior);
	ambientParticlesBehavior.setup(threeScene, quality.ambientParticles);
	particlesBehavior = jpWorld.createActor("Particles").addComponentAndGet(ParticlesBehavior);
	particlesBehavior.setup(threeScene, quality.particleBudget);
	creatureRendererBehavior = jpWorld.createActor("CreatureRenderer").addComponentAndGet(CreatureRendererBehavior);
	creatureRendererBehavior.setup(threeScene);
	blockHighlightBehavior = jpWorld.createActor("BlockHighlight").addComponentAndGet(BlockHighlightBehavior);
	blockHighlightBehavior.setup(threeScene, threeCamera, (x, y, z) => getVoxelAt(x, y, z));
	viewModelBehavior = jpWorld.createActor("ViewModel").addComponentAndGet(ViewModelBehavior);
	viewModelBehavior.setCamera(threeCamera);

	// Voxel renderer
	voxelRenderer = jpWorld.createActor("VoxelMap").addComponentAndGet(VoxelRenderer, {
		chunkSize: CHUNK_SIZE,
		layers: ["Ground"],
		blocks: createBlockDefinitions(),
		material: "lambert",
		alphaTest: 0.1,
	});
	await voxelRenderer.loadTileset({
		id: "default",
		src: generateTilesetDataURL(),
		tileSize: TILE_SIZE,
		cols: COLS,
		rows: ROWS,
	});

	registerVoxelAccessors(
		(x, y, z) => {
			if (y < 0 || y >= WORLD_HEIGHT) return 0;
			const e = voxelRenderer?.getVoxel({ x, y, z });
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
			if (blockId === 0) voxelRenderer?.removeVoxel(layerName, { position: { x, y, z } });
			else voxelRenderer?.setVoxel(layerName, { position: { x, y, z }, blockId });
		},
	);

	// Spawn
	generateChunkTerrain(voxelRenderer, "Ground", 0, 0);
	loadedChunks.add("0,0");
	const surfaceY = findSurfaceY(voxelRenderer, 8, 8);
	generateSpawnShrine(voxelRenderer, "Ground", surfaceY);
	recordSpawnShrineDeltas(surfaceY);

	// ECS entities
	kootaWorld.spawn(
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
	);
	kootaWorld.query(PlayerTag, RuneDiscovery).updateEach(([disc]) => {
		grantTutorialRunes(disc.discovered);
	});
	kootaWorld.spawn(WorldTime({ timeOfDay: 0.25, dayDuration: 900, dayCount: 1 }), WorldSeed({ seed }), SeasonState());
	kootaWorld.spawn(NorrskenEvent());

	jpWorld.createActor("InputPoller").addComponent(InputBehavior);
	jpWorld.createActor("GameBridge").addComponent(GameBridge);

	threeCamera.position.set(8.5, surfaceY + 2.5, 8.5);
	threeCamera.updateProjectionMatrix();
	resizeHandler = () => {
		if (!threeCamera) return;
		threeCamera.aspect = canvas.clientWidth / canvas.clientHeight;
		threeCamera.updateProjectionMatrix();
	};
	window.addEventListener("resize", resizeHandler);
	await loadRuntime(jpRuntime, { loadingDelay: 300 });
}

function recordSpawnShrineDeltas(surfaceY: number) {
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

// ─── Getters ───

export function getKootaWorld() {
	return kootaWorld;
}
export function getVoxelRenderer() {
	return voxelRenderer;
}
export function getBlockHighlight() {
	return blockHighlightBehavior;
}
export function getParticlesBehavior() {
	return particlesBehavior;
}

// ─── Block placement ───

export function placeBlock() {
	if (!blockHighlightBehavior) return;
	const prev = blockHighlightBehavior.lastPrev;
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
	jpRuntime?.stop();
	jpRuntime = null;
	threeScene = null;
	threeCamera = null;
	voxelRenderer = null;
	viewModelBehavior = null;
	celestialBehavior = null;
	blockHighlightBehavior = null;
	particlesBehavior = null;
	ambientParticlesBehavior = null;
	creatureRendererBehavior = null;
	ambientLight = null;
	sunLight = null;
	loadedChunks.clear();
	chunkData.clear();
	combatDrainTimer = 0;
	resetRuneIndex();
	resetEmitterState();
	resetInteractionRuneState();
	resetProtectionRuneState();
	resetNetworkRuneState();
	resetComputationalRuneState();
	resetSelfModifyState();
	resetSettlementState();
	resetTerritoryState();
	resetLightState();
	resetExplorationState();
	resetRaidoState();
	resetSagaState();
	resetDiscoveryState();
	resetSeasonState();
	resetJoystickState();
	resetQualityState();
	kootaWorld.reset();
}
