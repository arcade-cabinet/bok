/**
 * Renderer Manager — lifecycle for all standalone visual renderers.
 *
 * Manages: BlockHighlightRenderer, CelestialRenderer, ViewModelRenderer,
 * ParticlesRenderer, AmbientParticlesRenderer, CreatureRenderer.
 *
 * Exported API:
 *   createRenderers(scene, camera, ambientLight, sunLight, quality) — allocate + setup
 *   updateRenderers(dt) — tick all renderers
 *   disposeRenderers() — teardown + null all references
 *   syncPlayerToCamera(world, camera) — push ECS position → Three.js camera
 *   syncViewModelState(world) — push hotbar slot → view model
 *   syncEnvironmentState(world) — push time/position → celestial + ambient particles
 */

import type { World } from "koota";
import type * as THREE from "three";
import { getActiveQuality } from "../ecs/systems/quality-presets.ts";
import type { AnimStateId } from "../ecs/traits/index.ts";
import {
	CameraTransition,
	CreatureAnimation,
	CreatureTag,
	Hotbar,
	MoveInput,
	PhysicsBody,
	PlayerState,
	PlayerTag,
	Position,
	Rotation,
	ToolSwing,
	WorldTime,
} from "../ecs/traits/index.ts";
import { cosmeticRng } from "../world/noise.ts";
import { getVoxelAt } from "../world/voxel-helpers.ts";
import { AmbientParticlesRenderer } from "./ambient-particles-renderer.ts";
import { BlockHighlightRenderer } from "./block-highlight-renderer.ts";
import { CelestialRenderer } from "./celestial-renderer.ts";
import { CreatureRenderer } from "./creature-renderer.ts";
import { ParticlesRenderer } from "./particles-renderer.ts";
import { RuneVisualRenderer } from "./rune-visual-renderer.ts";
import { ViewModelRenderer } from "./viewmodel-renderer.ts";

// Module-level renderer references
let blockHighlightRenderer: BlockHighlightRenderer | null = null;
let celestialRenderer: CelestialRenderer | null = null;
let viewModelRenderer: ViewModelRenderer | null = null;
let particlesRenderer: ParticlesRenderer | null = null;
let ambientParticlesRenderer: AmbientParticlesRenderer | null = null;
let creatureRenderer: CreatureRenderer | null = null;
let runeVisualRenderer: RuneVisualRenderer | null = null;

export function createRenderers(
	scene: THREE.Scene,
	camera: THREE.PerspectiveCamera,
	ambientLight: THREE.AmbientLight,
	sunLight: THREE.DirectionalLight,
): void {
	const quality = getActiveQuality();

	celestialRenderer = new CelestialRenderer(scene, ambientLight, sunLight);
	ambientParticlesRenderer = new AmbientParticlesRenderer();
	ambientParticlesRenderer.setup(scene, quality.ambientParticles);
	particlesRenderer = new ParticlesRenderer();
	particlesRenderer.setup(scene, quality.particleBudget);
	creatureRenderer = new CreatureRenderer();
	creatureRenderer.setup(scene);
	blockHighlightRenderer = new BlockHighlightRenderer();
	blockHighlightRenderer.setup(scene, camera, (x, y, z) => getVoxelAt(x, y, z));
	viewModelRenderer = new ViewModelRenderer(camera);
	runeVisualRenderer = new RuneVisualRenderer();
	runeVisualRenderer.setup(scene);
}

export function updateRenderers(dt: number): void {
	blockHighlightRenderer?.update(dt);
	celestialRenderer?.update(dt);
	viewModelRenderer?.update(dt);
	particlesRenderer?.update(dt);
	ambientParticlesRenderer?.update(dt);
	creatureRenderer?.update(dt);
	runeVisualRenderer?.update(dt);
}

export function disposeRenderers(): void {
	blockHighlightRenderer?.dispose();
	blockHighlightRenderer = null;
	celestialRenderer?.dispose();
	celestialRenderer = null;
	viewModelRenderer = null;
	particlesRenderer?.dispose();
	particlesRenderer = null;
	ambientParticlesRenderer?.dispose();
	ambientParticlesRenderer = null;
	creatureRenderer?.dispose();
	creatureRenderer = null;
	runeVisualRenderer?.dispose();
	runeVisualRenderer = null;
}

// ─── Renderer accessors (for game.ts internal use) ───

export function getBlockHighlightRenderer() {
	return blockHighlightRenderer;
}
export function getParticlesRenderer() {
	return particlesRenderer;
}
export function getCreatureRenderer() {
	return creatureRenderer;
}

/** Shorthand particle spawn via the particles renderer. */
export function spawnParticles(x: number, y: number, z: number, color: number | string, count: number): void {
	particlesRenderer?.spawn(x, y, z, color as number, count);
}

// ─── Sync helpers (read ECS, push to Three.js) ───

export function syncPlayerToCamera(world: World, cam: THREE.PerspectiveCamera): void {
	let transitionActive = false;
	world.query(PlayerTag, CameraTransition).readEach(([ct]) => {
		if (ct.active) {
			transitionActive = true;
			const t = Math.min(ct.progress, 1);
			const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
			cam.position.set(
				ct.startX + (ct.targetX - ct.startX) * ease,
				ct.startY + (ct.targetY - ct.startY) * ease,
				ct.startZ + (ct.targetZ - ct.startZ) * ease,
			);
			cam.lookAt(ct.lookAtX, ct.lookAtY, ct.lookAtZ);
		}
	});
	if (transitionActive) return;

	world
		.query(PlayerTag, Position, Rotation, MoveInput, PhysicsBody, ToolSwing, PlayerState)
		.readEach(([pos, rot, input, body, toolSwing, state]) => {
			cam.position.set(pos.x + state.shakeX, pos.y + state.shakeY, pos.z);
			cam.rotation.order = "YXZ";
			cam.rotation.set(rot.pitch, rot.yaw, 0);
			creatureRenderer?.setCameraPosition(pos.x, pos.y, pos.z);
			if (viewModelRenderer) {
				viewModelRenderer.isMoving = (input.forward || input.backward || input.left || input.right) && body.onGround;
				viewModelRenderer.isSprinting = input.sprint;
				viewModelRenderer.swingProgress = toolSwing.progress;
				viewModelRenderer.swayX = toolSwing.swayX;
				viewModelRenderer.swayY = toolSwing.swayY;
			}
			if (input.sprint && body.onGround && (input.forward || input.backward || input.left || input.right)) {
				if (cosmeticRng() < 0.3) particlesRenderer?.spawn(pos.x, pos.y - 1.6, pos.z, 0x8b7355, 1);
			}
		});
}

export function syncViewModelState(world: World): void {
	world.query(PlayerTag, Hotbar).readEach(([hotbar]) => {
		if (viewModelRenderer) viewModelRenderer.slotData = hotbar.slots[hotbar.activeSlot];
	});
}

export function syncEnvironmentState(world: World): void {
	let timeOfDay = 0.25;
	let px = 0,
		py = 0,
		pz = 0;
	world.query(WorldTime).readEach(([time]) => {
		timeOfDay = time.timeOfDay;
	});
	world.query(PlayerTag, Position).readEach(([pos]) => {
		px = pos.x;
		py = pos.y;
		pz = pos.z;
	});
	if (celestialRenderer) {
		celestialRenderer.timeOfDay = timeOfDay;
		celestialRenderer.playerX = px;
		celestialRenderer.playerZ = pz;
	}
	if (ambientParticlesRenderer) {
		ambientParticlesRenderer.timeOfDay = timeOfDay;
		ambientParticlesRenderer.playerX = px;
		ambientParticlesRenderer.playerY = py;
		ambientParticlesRenderer.playerZ = pz;
	}
}

export function syncCreatureRendererPositions(world: World): void {
	let timeOfDay = 0.25;
	world.query(WorldTime).readEach(([time]) => {
		timeOfDay = time.timeOfDay;
	});
	const isDaytime = timeOfDay > 0 && timeOfDay < 0.5;
	world.query(CreatureTag, CreatureAnimation, Position).readEach(([anim, pos], entity) => {
		creatureRenderer?.updatePosition(entity.id(), pos.x, pos.y, pos.z, anim.animState as AnimStateId, isDaytime);
	});
}
