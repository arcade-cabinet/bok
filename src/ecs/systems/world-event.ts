/**
 * World event system — manages Norrsken (Northern Lights) and future world events.
 * Reads WorldTime, triggers events, pacifies creatures, surfaces resources.
 * Runs AFTER creatureSystem so pacification overrides creature AI each frame.
 */

import type { World } from "koota";
import { BlockId } from "../../world/blocks.ts";
import { getVoxelAt, isBlockSolid, setVoxelAt } from "../../world/voxel-helpers.ts";
import {
	AnimState,
	BehaviorState,
	CreatureAI,
	CreatureAnimation,
	CreatureTag,
	NorrskenEvent,
	PlayerTag,
	Position,
	WorldTime,
} from "../traits/index.ts";
import {
	auroraColor,
	auroraTintIntensity,
	EVENT_DURATION,
	generateResourcePositions,
	isNightTime,
	packColor,
	RESOURCE_COUNT,
	shouldTrigger,
} from "./norrsken-event.ts";

// ─── Side Effects ───

export interface WorldEventEffects {
	spawnParticles: (x: number, y: number, z: number, color: number, count: number) => void;
	setAmbientTint: (color: number, intensity: number) => void;
}

// ─── Resource Tracking ───

/** Track placed resource positions so we can clean them up. */
const surfacedResources: Array<{ x: number; y: number; z: number }> = [];

/** Exported for testing — returns the current surfaced resource list. */
export function getSurfacedResources(): ReadonlyArray<{ x: number; y: number; z: number }> {
	return surfacedResources;
}

/** Clear resource tracking state (for tests). */
export function resetWorldEventState(): void {
	surfacedResources.length = 0;
}

// ─── Surface Y Lookup ───

function findSurface(x: number, z: number): number {
	for (let y = 60; y >= 0; y--) {
		const v = getVoxelAt(x, y, z);
		if (v > 0 && isBlockSolid(v)) return y;
	}
	return -1;
}

// ─── Main System ───

export function worldEventSystem(world: World, dt: number, rng: () => number, effects?: WorldEventEffects): void {
	let timeOfDay = 0.25;
	let dayCount = 1;
	world.query(WorldTime).readEach(([time]) => {
		timeOfDay = time.timeOfDay;
		dayCount = time.dayCount;
	});

	let px = 0;
	let pz = 0;
	world.query(PlayerTag, Position).readEach(([pos]) => {
		px = pos.x;
		pz = pos.z;
	});

	const isNight = isNightTime(timeOfDay);

	world.query(NorrskenEvent).updateEach(([ev]) => {
		// ─── Trigger on night-edge ───
		if (isNight && !ev.wasNight && ev.dayTriggered !== dayCount) {
			if (shouldTrigger(rng())) {
				ev.active = true;
				ev.timer = EVENT_DURATION;
				ev.dayTriggered = dayCount;
				surfaceResources(px, pz, dayCount);
			}
		}
		ev.wasNight = isNight;

		// ─── End event when night ends or timer expires ───
		if (ev.active) {
			ev.timer -= dt;
			if (ev.timer <= 0 || !isNight) {
				endEvent(ev);
				effects?.setAmbientTint(0x000000, 0);
				return;
			}

			// ─── Active event: aurora visuals ───
			const elapsed = EVENT_DURATION - ev.timer;
			const color = auroraColor(elapsed);
			const intensity = auroraTintIntensity(ev.timer);
			const packed = packColor(color.r, color.g, color.b);
			effects?.setAmbientTint(packed, intensity * 0.3);

			// Spawn aurora particles near player
			if (effects && Math.floor(elapsed * 4) !== Math.floor((elapsed - dt) * 4)) {
				effects.spawnParticles(px + (rng() - 0.5) * 20, 60, pz + (rng() - 0.5) * 20, packed, 3);
			}

			// ─── Pacify all creatures (mesmerized by aurora) ───
			pacifyCreatures(world);
		}
	});
}

// ─── Pacification ───

function pacifyCreatures(world: World): void {
	world.query(CreatureTag, CreatureAI, CreatureAnimation).updateEach(([ai, anim]) => {
		ai.behaviorState = BehaviorState.Idle;
		ai.attackCooldown = 1;
		anim.animState = AnimState.Idle;
	});
}

// ─── Resource Surfacing ───

function surfaceResources(px: number, pz: number, seed: number): void {
	const positions = generateResourcePositions(px, pz, seed, RESOURCE_COUNT);
	for (const { x, z } of positions) {
		const surfaceY = findSurface(x, z);
		if (surfaceY < 0) continue;
		const placeY = surfaceY + 1;
		const existing = getVoxelAt(x, placeY, z);
		if (existing !== 0) continue;
		setVoxelAt("Ground", x, placeY, z, BlockId.Crystal);
		surfacedResources.push({ x, y: placeY, z });
	}
}

function removeResources(): void {
	for (const { x, y, z } of surfacedResources) {
		const current = getVoxelAt(x, y, z);
		if (current === BlockId.Crystal) {
			setVoxelAt("Ground", x, y, z, BlockId.Air);
		}
	}
	surfacedResources.length = 0;
}

// ─── Event End ───

function endEvent(ev: { active: boolean; timer: number }): void {
	ev.active = false;
	ev.timer = 0;
	removeResources();
}
