/**
 * GameBridge Behavior — runs each frame via GameLoop.
 * Drives all Koota ECS systems and pushes state to visual renderers.
 */

import type { World } from "koota";
import type * as THREE from "three";
import type { CreatureEffects } from "../ecs/systems/creature.ts";
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
import type { BlockHit, MiningSideEffects } from "../ecs/systems/mining.ts";
import type { FaceHit, RuneInscriptionEffects } from "../ecs/systems/rune-inscription.ts";
import { seasonEffectsSystem } from "../ecs/systems/season-effects.ts";
import { isGamePaused } from "../ecs/systems/session-pause.ts";
import { COMBAT_DRAIN_COOLDOWN, drainDurability } from "../ecs/systems/tool-durability.ts";
import {
	CameraTransition,
	CreatureHealth,
	CreatureTag,
	Hotbar,
	MiningState,
	PlayerState,
	PlayerTag,
	Position,
	ToolSwing,
} from "../ecs/traits/index.ts";
import { cosmeticRng } from "../world/noise.ts";
import { getVoxelAt, isBlockSolid, setVoxelAt } from "../world/voxel-helpers.ts";
import { Behavior } from "./behavior.ts";
import { streamChunks } from "./chunk-streaming.ts";
import { tickDevBridge } from "./dev-bridge.ts";
import {
	runComputationalRuneSystem,
	runEmitterSystem,
	runInteractionRuneSystem,
	runNetworkRuneSystem,
	runProtectionRuneSystem,
	runRaidoSystem,
	runRuneDiscoverySystem,
	runRuneSensorSystem,
	runSelfModifySystem,
	runSettlementSystem,
	runTerritorySystem,
	runWorldEventSystem,
} from "./game-effects.ts";
import {
	getBlockHighlightRenderer,
	getCreatureRenderer,
	spawnParticles,
	syncCreatureRendererPositions,
	syncEnvironmentState,
	syncPlayerToCamera,
	syncViewModelState,
	updateRenderers,
} from "./renderer-manager.ts";
import { getRuneIndex, tickRuneWorld } from "./rune-bridge.ts";
import type { VoxelRenderer } from "./voxel-types.ts";

const spawn = (x: number, y: number, z: number, color: number | string, count: number) =>
	spawnParticles(x, y, z, color, count);

let combatDrainTimer = 0;

export function resetCombatDrainTimer(): void {
	combatDrainTimer = 0;
}

export class GameBridge extends Behavior {
	private readonly world: World;
	private readonly getCamera: () => THREE.PerspectiveCamera | null;
	private readonly getVoxelRenderer: () => VoxelRenderer | null;
	private readonly getAmbientLight: () => THREE.AmbientLight | null;

	constructor(
		world: World,
		getCamera: () => THREE.PerspectiveCamera | null,
		getVoxelRenderer: () => VoxelRenderer | null,
		getAmbientLight: () => THREE.AmbientLight | null,
	) {
		super();
		this.world = world;
		this.getCamera = getCamera;
		this.getVoxelRenderer = getVoxelRenderer;
		this.getAmbientLight = getAmbientLight;
	}

	awake() {
		this.needUpdate = true;
	}

	update(dt: number) {
		if (dt <= 0 || dt > 0.1) return;
		if (isGamePaused()) return;

		// Dev diagnostics FPS tick
		tickDevBridge();

		const world = this.world;

		// Core ECS systems
		movementSystem(world, dt);
		physicsSystem(world, dt);
		survivalSystem(world, dt);
		eatingSystem(world, dt);
		cookingSystem(world, dt);
		questSystem(world, dt);
		timeSystem(world, dt);
		seasonSystem(world, dt);
		seasonEffectsSystem(world, dt);
		workstationProximitySystem(world, dt, (x, y, z) => getVoxelAt(x, y, z));
		structureSystem(world, dt, (x, y, z) => getVoxelAt(x, y, z), isBlockSolid);
		lightSystem(world, dt, (x, y, z) => getVoxelAt(x, y, z));

		// Rune + settlement systems
		runRuneSensorSystem(world, dt, spawn);
		runEmitterSystem(world, dt, spawn);
		runInteractionRuneSystem(world, dt, spawn);
		runProtectionRuneSystem(world, dt, spawn);
		runNetworkRuneSystem(world, dt, spawn);
		runComputationalRuneSystem(world, dt, spawn);
		runSelfModifySystem(world, dt, spawn);
		runSettlementSystem(world, dt, spawn);
		runTerritorySystem(world, dt, spawn);
		runRaidoSystem(world, dt, spawn);
		explorationSystem(world, dt);
		this.runCreatureSystem(dt);
		codexSystem(world, dt);
		sagaSystem(world, dt);
		runRuneDiscoverySystem(world, dt, spawn);
		runWorldEventSystem(world, dt, spawn, this.getAmbientLight());

		// Rune world simulation tick
		tickRuneWorld(world, dt, spawn);

		// Advance camera transition
		world.query(PlayerTag, CameraTransition).updateEach(([ct]) => {
			if (ct.active && ct.progress < 1) {
				ct.progress = Math.min(1, ct.progress + dt / ct.duration);
			}
		});

		// Sync ECS → Three.js
		const cam = this.getCamera();
		if (cam) syncPlayerToCamera(world, cam);
		syncViewModelState(world);
		syncEnvironmentState(world);
		syncCreatureRendererPositions(world);
		this.runRuneInscriptionSystem(dt);
		this.runMiningSystem(dt);
		const vr = this.getVoxelRenderer();
		if (vr) streamChunks(world, vr);

		updateRenderers(dt);
	}

	private runCreatureSystem(dt: number) {
		const creatureRenderer = getCreatureRenderer();
		const effects: CreatureEffects = {
			spawnParticles: spawn,
			onCreatureSpawned: (entityId, species, variant) => creatureRenderer?.assignMesh(entityId, species, variant),
			onCreatureDied: (entityId) => creatureRenderer?.releaseMesh(entityId),
		};
		creatureSystem(this.world, dt, effects);
	}

	private runRuneInscriptionSystem(dt: number) {
		const bhr = getBlockHighlightRenderer();
		const hit = bhr?.lastHit ?? null;
		const prev = bhr?.lastPrev ?? null;
		const faceHit: FaceHit | null =
			hit && prev ? { blockX: hit.x, blockY: hit.y, blockZ: hit.z, prevX: prev.x, prevY: prev.y, prevZ: prev.z } : null;
		const effects: RuneInscriptionEffects = { spawnParticles: spawn };
		runeInscriptionSystem(this.world, dt, faceHit, effects);
	}

	private runMiningSystem(dt: number) {
		const hit: BlockHit | null = getBlockHighlightRenderer()?.lastHit ?? null;
		const effects: MiningSideEffects = {
			removeBlock: (x, y, z) => {
				setVoxelAt("Ground", x, y, z, 0);
				getRuneIndex().removeBlock(x, y, z);
				this.world.query(PlayerTag, PlayerState).updateEach(([state]) => {
					state.shakeX = (cosmeticRng() - 0.5) * 0.06;
					state.shakeY = (cosmeticRng() - 0.5) * 0.04;
				});
			},
			spawnParticles: spawn,
		};
		miningSystem(this.world, dt, hit, effects);
		this.checkEnemyCombat(dt);
	}

	private checkEnemyCombat(dt: number) {
		let px = 0,
			py = 0,
			pz = 0;
		let isMining = false;
		let toolPower = 2;
		this.world
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
		this.world.query(CreatureTag, CreatureHealth, Position).updateEach(([hp, pos]) => {
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
				this.world.query(PlayerTag, Hotbar).updateEach(([hotbar]) => {
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
