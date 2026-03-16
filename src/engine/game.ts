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
import type { CreatureEffects } from "../ecs/systems/creature.ts";
import {
	creatureSystem,
	miningSystem,
	movementSystem,
	physicsSystem,
	questSystem,
	survivalSystem,
	timeSystem,
} from "../ecs/systems/index.ts";
import type { BlockHit, MiningSideEffects } from "../ecs/systems/mining.ts";
import type { AnimStateId, HotbarSlot } from "../ecs/traits/index.ts";
import {
	CreatureAnimation,
	CreatureHealth,
	CreatureTag,
	Health,
	Hotbar,
	Hunger,
	Inventory,
	MiningState,
	MoveInput,
	PhysicsBody,
	PlayerState,
	PlayerTag,
	Position,
	QuestProgress,
	Rotation,
	Stamina,
	ToolSwing,
	Velocity,
	WorldSeed,
	WorldTime,
} from "../ecs/traits/index.ts";

import { createBlockDefinitions } from "../world/block-definitions.ts";
import { BlockId } from "../world/blocks.ts";
import { cosmeticRng, initNoise } from "../world/noise.ts";
import {
	CHUNK_SIZE,
	findSurfaceY,
	generateChunkTerrain,
	generateSpawnShrine,
	WORLD_HEIGHT,
} from "../world/terrain-generator.ts";
import { COLS, generateTilesetDataURL, ROWS, TILE_SIZE } from "../world/tileset-generator.ts";
import { getVoxelAt, registerVoxelAccessors, setVoxelAt, setVoxelDeltaListener } from "../world/voxel-helpers.ts";
import { AmbientParticlesBehavior } from "./behaviors/AmbientParticlesBehavior.ts";
import { BlockHighlightBehavior } from "./behaviors/BlockHighlightBehavior.ts";
import { CelestialBehavior } from "./behaviors/CelestialBehavior.ts";
import { CreatureRendererBehavior } from "./behaviors/CreatureRendererBehavior.ts";
import { ParticlesBehavior } from "./behaviors/ParticlesBehavior.ts";
import { ViewModelBehavior } from "./behaviors/ViewModelBehavior.ts";

export const kootaWorld = createKootaWorld();

const loadedChunks = new Set<string>();
const RENDER_DISTANCE = 3;

// Authoritative chunk voxel storage: key = "cx,cz", value = Map of "x,y,z" -> blockId
const chunkData = new Map<string, Map<string, number>>();

function getChunkKey(cx: number, cz: number): string {
	return `${cx},${cz}`;
}

function getVoxelKey(x: number, y: number, z: number): string {
	return `${x},${y},${z}`;
}

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

// Shared references for the bridge
let ambientLight: THREE.AmbientLight | null = null;
let sunLight: THREE.DirectionalLight | null = null;
let resizeHandler: (() => void) | null = null;

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

		// Run ECS systems
		movementSystem(kootaWorld, dt);
		physicsSystem(kootaWorld, dt);
		survivalSystem(kootaWorld, dt);
		questSystem(kootaWorld, dt);
		timeSystem(kootaWorld, dt);
		this.runCreatureSystem(dt);

		// Sync Koota player state -> Three.js camera + Behaviors
		this.syncPlayerToCamera(dt);
		this.syncViewModelState();
		this.syncEnvironmentState();
		this.runMiningSystem(dt);
		streamChunks();
	}

	private syncPlayerToCamera(_dt: number) {
		const cam = threeCamera;
		if (!cam) return;

		kootaWorld
			.query(PlayerTag, Position, Rotation, MoveInput, PhysicsBody, ToolSwing, PlayerState)
			.readEach(([pos, rot, input, body, toolSwing, state]) => {
				cam.position.set(pos.x + state.shakeX, pos.y + state.shakeY, pos.z);
				cam.rotation.order = "YXZ";
				cam.rotation.set(rot.pitch, rot.yaw, 0);

				// Push to view model behavior
				if (viewModelBehavior) {
					const isMoving = (input.forward || input.backward || input.left || input.right) && body.onGround;
					viewModelBehavior.isMoving = isMoving;
					viewModelBehavior.isSprinting = input.sprint;
					viewModelBehavior.swingProgress = toolSwing.progress;
					viewModelBehavior.swayX = toolSwing.swayX;
					viewModelBehavior.swayY = toolSwing.swayY;
				}

				// Sprint particles — kick up dust at player's feet
				if (input.sprint && body.onGround && (input.forward || input.backward || input.left || input.right)) {
					if (cosmeticRng() < 0.3 && particlesBehavior) {
						particlesBehavior.spawn(pos.x, pos.y - 1.6, pos.z, 0x8b7355, 1);
					}
				}
			});
	}

	private syncViewModelState() {
		kootaWorld.query(PlayerTag, Hotbar).readEach(([hotbar]) => {
			if (viewModelBehavior) {
				viewModelBehavior.slotData = hotbar.slots[hotbar.activeSlot];
			}
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
			spawnParticles: (x, y, z, color, count) => particlesBehavior?.spawn(x, y, z, color, count),
			onCreatureSpawned: (entityId) => creatureRendererBehavior?.assignMesh(entityId),
			onCreatureDied: (entityId) => creatureRendererBehavior?.releaseMesh(entityId),
		};
		creatureSystem(kootaWorld, dt, effects);

		// Sync creature positions to renderer
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

	private runMiningSystem(dt: number) {
		const hit: BlockHit | null = blockHighlightBehavior?.lastHit ?? null;
		const effects: MiningSideEffects = {
			removeBlock: (x, y, z) => {
				setVoxelAt("Ground", x, y, z, 0);
				// Screen shake on block break
				kootaWorld.query(PlayerTag, PlayerState).updateEach(([state]) => {
					state.shakeX = (cosmeticRng() - 0.5) * 0.06;
					state.shakeY = (cosmeticRng() - 0.5) * 0.04;
				});
			},
			spawnParticles: (x, y, z, color, count) => particlesBehavior?.spawn(x, y, z, color, count),
		};
		miningSystem(kootaWorld, dt, hit, effects);

		// Player-to-enemy combat: when mining is active, check nearby enemies
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
				// Swing animation acts as attack
				if (toolSwing.progress > 0.5) {
					const slot = hotbar.slots[hotbar.activeSlot];
					if (slot && slot.type === "item") {
						toolPower = 4; // Tool equipped = more damage
					}
				}
			});

		if (!isMining) return;

		// Check all creatures within 3 blocks
		kootaWorld.query(CreatureTag, CreatureHealth, Position).updateEach(([hp, pos]) => {
			const dx = pos.x - px;
			const dy = pos.y - py;
			const dz = pos.z - pz;
			const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
			if (dist < 3) {
				hp.hp -= toolPower * 0.03 * dt;
				particlesBehavior?.spawn(pos.x, pos.y + 0.9, pos.z, 0xff0000, 2);
			}
		});
	}
}

const UNLOAD_DISTANCE = RENDER_DISTANCE + 2;
const CHUNKS_PER_FRAME = 2;
const chunkLoadQueue: Array<{ cx: number; cz: number }> = [];

function streamChunks() {
	if (!voxelRenderer) return;

	let px = 0,
		pz = 0;
	kootaWorld.query(PlayerTag, Position).readEach(([pos]) => {
		px = pos.x;
		pz = pos.z;
	});

	const pCx = Math.floor(px / CHUNK_SIZE);
	const pCz = Math.floor(pz / CHUNK_SIZE);

	// Enqueue nearby chunks that aren't loaded
	for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
		for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
			const cx = pCx + dx;
			const cz = pCz + dz;
			const key = `${cx},${cz}`;
			if (!loadedChunks.has(key)) {
				loadedChunks.add(key); // Mark as pending to avoid re-enqueue
				chunkLoadQueue.push({ cx, cz });
			}
		}
	}

	// Sort queue by distance to player (closest first)
	chunkLoadQueue.sort((a, b) => {
		const da = (a.cx - pCx) ** 2 + (a.cz - pCz) ** 2;
		const db = (b.cx - pCx) ** 2 + (b.cz - pCz) ** 2;
		return da - db;
	});

	// Process up to CHUNKS_PER_FRAME from the queue
	let generated = 0;
	while (chunkLoadQueue.length > 0 && generated < CHUNKS_PER_FRAME) {
		const chunk = chunkLoadQueue.shift();
		if (!chunk) break;
		generateChunkTerrain(voxelRenderer, "Ground", chunk.cx, chunk.cz);

		// Reapply stored deltas from chunkData after terrain generation
		const chunkKey = getChunkKey(chunk.cx, chunk.cz);
		const deltas = chunkData.get(chunkKey);
		if (deltas) {
			for (const [voxelKey, blockId] of deltas.entries()) {
				const [xStr, yStr, zStr] = voxelKey.split(",");
				const x = parseInt(xStr, 10);
				const y = parseInt(yStr, 10);
				const z = parseInt(zStr, 10);
				if (blockId === 0) {
					voxelRenderer.removeVoxel("Ground", { position: { x, y, z } });
				} else {
					voxelRenderer.setVoxel("Ground", { position: { x, y, z }, blockId });
				}
			}
		}

		generated++;
	}

	// Unload distant chunks (remove from renderer but preserve chunkData)
	for (const key of loadedChunks) {
		const [cxStr, czStr] = key.split(",");
		const cx = parseInt(cxStr, 10);
		const cz = parseInt(czStr, 10);
		if (Math.abs(cx - pCx) > UNLOAD_DISTANCE || Math.abs(cz - pCz) > UNLOAD_DISTANCE) {
			for (let lx = 0; lx < CHUNK_SIZE; lx++) {
				for (let lz = 0; lz < CHUNK_SIZE; lz++) {
					const gx = cx * CHUNK_SIZE + lx;
					const gz = cz * CHUNK_SIZE + lz;
					for (let y = 0; y < WORLD_HEIGHT; y++) {
						voxelRenderer.removeVoxel("Ground", { position: { x: gx, y, z: gz } });
					}
				}
			}
			loadedChunks.delete(key);
			// Note: chunkData persists — not deleted here
		}
	}
}

export async function initGame(canvas: HTMLCanvasElement, seed: string): Promise<void> {
	if (jpRuntime) {
		jpRuntime.stop();
		jpRuntime = null;
	}

	initNoise(seed);

	jpRuntime = new Runtime(canvas, {
		includePerformanceStats: false,
	});
	const jpWorld = jpRuntime.world;

	// ─── Scene ───
	threeScene = jpWorld.sceneManager.default;
	threeScene.background = new THREE.Color(0x87ceeb);
	threeScene.fog = new THREE.Fog(0x87ceeb, 15, RENDER_DISTANCE * CHUNK_SIZE - 5);

	// ─── Camera ───
	threeCamera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
	jpWorld.renderer.addRenderComponent(threeCamera);

	// ─── Lighting ───
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
	sunLight.shadow.mapSize.width = 1024;
	sunLight.shadow.mapSize.height = 1024;
	threeScene.add(sunLight.target);

	// ─── Celestial Actor ───
	const celestialActor = jpWorld.createActor("Celestial");
	celestialBehavior = celestialActor.addComponentAndGet(CelestialBehavior);
	celestialBehavior.setup(threeScene, ambientLight, sunLight);

	// ─── Ambient Particles Actor ───
	const ambientParticlesActor = jpWorld.createActor("AmbientParticles");
	ambientParticlesBehavior = ambientParticlesActor.addComponentAndGet(AmbientParticlesBehavior);
	ambientParticlesBehavior.setup(threeScene);

	// ─── Particle System Actor ───
	const particlesActor = jpWorld.createActor("Particles");
	particlesBehavior = particlesActor.addComponentAndGet(ParticlesBehavior);
	particlesBehavior.setup(threeScene);

	// ─── Creature Renderer Actor ───
	const creatureActor = jpWorld.createActor("CreatureRenderer");
	creatureRendererBehavior = creatureActor.addComponentAndGet(CreatureRendererBehavior);
	creatureRendererBehavior.setup(threeScene);

	// ─── Block Highlight Actor ───
	const highlightActor = jpWorld.createActor("BlockHighlight");
	blockHighlightBehavior = highlightActor.addComponentAndGet(BlockHighlightBehavior);
	blockHighlightBehavior.setup(threeScene, threeCamera, (x, y, z) => getVoxelAt(x, y, z));

	// ─── View Model Actor ───
	const viewModelActor = jpWorld.createActor("ViewModel");
	viewModelBehavior = viewModelActor.addComponentAndGet(ViewModelBehavior);
	viewModelBehavior.setCamera(threeCamera);

	// ─── Voxel Map Actor ───
	const mapActor = jpWorld.createActor("VoxelMap");
	voxelRenderer = mapActor.addComponentAndGet(VoxelRenderer, {
		chunkSize: CHUNK_SIZE,
		layers: ["Ground"],
		blocks: createBlockDefinitions(),
		material: "lambert",
		alphaTest: 0.1,
	});

	const tilesetDataURL = generateTilesetDataURL();
	await voxelRenderer.loadTileset({
		id: "default",
		src: tilesetDataURL,
		tileSize: TILE_SIZE,
		cols: COLS,
		rows: ROWS,
	});

	registerVoxelAccessors(
		(x, y, z) => {
			if (y < 0 || y >= WORLD_HEIGHT) return 0;
			const entry = voxelRenderer?.getVoxel({ x, y, z });
			return entry ? entry.blockId : 0;
		},
		(layerName, x, y, z, blockId) => {
			// Update authoritative chunk data storage
			const cx = Math.floor(x / CHUNK_SIZE);
			const cz = Math.floor(z / CHUNK_SIZE);
			const chunkKey = getChunkKey(cx, cz);
			const voxelKey = getVoxelKey(x, y, z);

			let deltas = chunkData.get(chunkKey);
			if (!deltas) {
				deltas = new Map();
				chunkData.set(chunkKey, deltas);
			}

			if (blockId === 0) {
				deltas.set(voxelKey, 0);
				voxelRenderer?.removeVoxel(layerName, { position: { x, y, z } });
			} else {
				deltas.set(voxelKey, blockId);
				voxelRenderer?.setVoxel(layerName, { position: { x, y, z }, blockId });
			}
		},
	);

	// ─── Generate Spawn ───
	generateChunkTerrain(voxelRenderer, "Ground", 0, 0);
	loadedChunks.add("0,0");

	const surfaceY = findSurfaceY(voxelRenderer, 8, 8);
	generateSpawnShrine(voxelRenderer, "Ground", surfaceY);

	// Store spawn shrine blocks in authoritative chunkData manually
	// (generateSpawnShrine uses voxelRenderer directly, not setVoxelAt)
	const spawnChunkKey = getChunkKey(0, 0);
	let spawnDeltas = chunkData.get(spawnChunkKey);
	if (!spawnDeltas) {
		spawnDeltas = new Map();
		chunkData.set(spawnChunkKey, spawnDeltas);
	}

	// Stone brick floor
	for (let x = 6; x <= 10; x++) {
		for (let z = 6; z <= 10; z++) {
			spawnDeltas.set(getVoxelKey(x, surfaceY, z), BlockId.StoneBricks);
			// Clear space above
			for (let y = surfaceY + 1; y <= surfaceY + 4; y++) {
				spawnDeltas.set(getVoxelKey(x, y, z), 0);
			}
		}
	}

	// Torches and glass
	spawnDeltas.set(getVoxelKey(6, surfaceY + 1, 6), BlockId.Torch);
	spawnDeltas.set(getVoxelKey(10, surfaceY + 1, 6), BlockId.Torch);
	spawnDeltas.set(getVoxelKey(6, surfaceY + 1, 10), BlockId.Torch);
	spawnDeltas.set(getVoxelKey(10, surfaceY + 1, 10), BlockId.Torch);
	spawnDeltas.set(getVoxelKey(8, surfaceY, 8), BlockId.Glass);

	const spawnY = surfaceY + 2.5;

	// ─── ECS Entities ───
	kootaWorld.spawn(
		PlayerTag,
		Position({ x: 8.5, y: spawnY, z: 8.5 }),
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
	);

	kootaWorld.spawn(WorldTime({ timeOfDay: 0.25, dayDuration: 240, dayCount: 1 }), WorldSeed({ seed }));

	// ─── Game Bridge Actor ───
	const bridgeActor = jpWorld.createActor("GameBridge");
	bridgeActor.addComponent(GameBridge);

	threeCamera.position.set(8.5, spawnY, 8.5);
	threeCamera.updateProjectionMatrix();

	// Handle resize
	resizeHandler = () => {
		if (!threeCamera) return;
		threeCamera.aspect = canvas.clientWidth / canvas.clientHeight;
		threeCamera.updateProjectionMatrix();
	};
	window.addEventListener("resize", resizeHandler);

	await loadRuntime(jpRuntime, { loadingDelay: 300 });
}

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

export function placeBlock() {
	if (!blockHighlightBehavior) return;
	const prev = blockHighlightBehavior.lastPrev;
	if (!prev) return;

	kootaWorld.query(PlayerTag, Hotbar, Inventory, Position, ToolSwing).updateEach(([hotbar, inv, pos, toolSwing]) => {
		const slot = hotbar.slots[hotbar.activeSlot];
		if (!slot || slot.type !== "block") return;

		// Check inventory for the block
		const count = inv.items[slot.id] ?? 0;
		if (count <= 0) return;

		// Don't place inside player
		const pX = prev.x,
			pY = prev.y,
			pZ = prev.z;
		if (
			pX === Math.floor(pos.x) &&
			pZ === Math.floor(pos.z) &&
			(pY === Math.floor(pos.y) || pY === Math.floor(pos.y - 1))
		)
			return;

		// Decrement inventory
		inv.items[slot.id] = count - 1;
		if (inv.items[slot.id] === 0) {
			delete inv.items[slot.id];
		}

		setVoxelAt("Ground", pX, pY, pZ, slot.id);
		toolSwing.progress = 1.0;
	});
}

import type { PlayerSaveData } from "../persistence/db.ts";

/** Read current ECS state for persistence. */
export function readPlayerStateForSave(): PlayerSaveData | null {
	let result: PlayerSaveData | null = null;

	kootaWorld
		.query(PlayerTag, Position, Health, Hunger, Stamina, Inventory, Hotbar, QuestProgress)
		.readEach(([pos, health, hunger, stamina, inv, hotbar, quest]) => {
			let timeOfDay = 0.25;
			let dayCount = 1;
			kootaWorld.query(WorldTime).readEach(([time]) => {
				timeOfDay = time.timeOfDay;
				dayCount = time.dayCount;
			});

			result = {
				posX: pos.x,
				posY: pos.y,
				posZ: pos.z,
				health: health.current,
				hunger: hunger.current,
				stamina: stamina.current,
				questStep: quest.step,
				questProgress: quest.progress,
				timeOfDay,
				dayCount,
				hotbar: [...hotbar.slots],
				inventory: { items: { ...inv.items }, capacity: inv.capacity },
			};
		});

	return result;
}

/** Restore player ECS state from save data. */
export function restorePlayerState(data: PlayerSaveData): void {
	kootaWorld
		.query(PlayerTag, Position, Health, Hunger, Stamina, Inventory, Hotbar, QuestProgress)
		.updateEach(([pos, health, hunger, stamina, inv, hotbar, quest]) => {
			pos.x = data.posX;
			pos.y = data.posY;
			pos.z = data.posZ;
			health.current = data.health;
			hunger.current = data.hunger;
			stamina.current = data.stamina;
			quest.step = data.questStep;
			quest.progress = data.questProgress;

			const savedHotbar = data.hotbar as (HotbarSlot | null)[];
			for (let i = 0; i < hotbar.slots.length; i++) {
				hotbar.slots[i] = savedHotbar[i] ?? null;
			}

			const savedInv = data.inventory;
			inv.items = { ...savedInv.items };
			inv.capacity = savedInv.capacity;
		});

	kootaWorld.query(WorldTime).updateEach(([time]) => {
		time.timeOfDay = data.timeOfDay;
		time.dayCount = data.dayCount;
	});
}

/** Apply voxel deltas from the database onto the live world and authoritative storage. */
export function applyVoxelDeltas(deltas: Array<{ x: number; y: number; z: number; blockId: number }>): void {
	for (const d of deltas) {
		setVoxelAt("Ground", d.x, d.y, d.z, d.blockId);
	}
}

/** Get all voxel deltas from authoritative chunk storage for persistence. */
export function getAllVoxelDeltas(): Array<{ x: number; y: number; z: number; blockId: number }> {
	const result: Array<{ x: number; y: number; z: number; blockId: number }> = [];
	for (const [_chunkKey, deltas] of chunkData.entries()) {
		for (const [voxelKey, blockId] of deltas.entries()) {
			const [xStr, yStr, zStr] = voxelKey.split(",");
			result.push({
				x: parseInt(xStr, 10),
				y: parseInt(yStr, 10),
				z: parseInt(zStr, 10),
				blockId,
			});
		}
	}
	return result;
}

/** Enable voxel delta tracking — calls listener on every setVoxelAt. */
export function enableVoxelDeltaTracking(listener: (x: number, y: number, z: number, blockId: number) => void): void {
	setVoxelDeltaListener(listener);
}

/** Disable voxel delta tracking. */
export function disableVoxelDeltaTracking(): void {
	setVoxelDeltaListener(null);
}

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
	kootaWorld.reset();
}
