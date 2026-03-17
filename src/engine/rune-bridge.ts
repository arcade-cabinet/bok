/**
 * Rune Bridge — rune world simulation state and tick orchestration.
 *
 * Owns:
 *   - RuneWorldState: voxel-level signal field
 *   - TickState: per-tick rune simulation bookkeeping
 *
 * Exported API:
 *   initRuneWorld() — allocate state
 *   tickRuneWorld(world, dt, spawnParticles) — run one simulation tick
 *   resetRuneWorld() — teardown + null state (call on destroyGame)
 */

import type { World } from "koota";
import { resetComputationalRuneState } from "../ecs/systems/computational-rune-system.ts";
import { resetEmitterState } from "../ecs/systems/emitter-system.ts";
import { resetInteractionRuneState } from "../ecs/systems/interaction-rune-system.ts";
import { resetNetworkRuneState } from "../ecs/systems/network-rune-system.ts";
import { resetProtectionRuneState } from "../ecs/systems/protection-rune-system.ts";
import { resetCombatEffectsState } from "../ecs/systems/rune-combat-effects.ts";
import type { RuneIdValue } from "../ecs/systems/rune-data.ts";
import { getRuneIndex, resetRuneIndex } from "../ecs/systems/rune-index.ts";
import { resetRuneResourcePickupState, runeResourcePickupSystem } from "../ecs/systems/rune-resource-pickup.ts";
import { resetSensorState } from "../ecs/systems/rune-sensor.ts";
import { getLastSignalField, resetRuneWorldTickState, runeWorldTickSystem } from "../ecs/systems/rune-world-tick.ts";
import { resetSelfModifyState } from "../ecs/systems/self-modify-system.ts";
import { PlayerTag, RuneFaces } from "../ecs/traits/index.ts";
import { runRuneCombatEffectsSystem } from "./game-effects.ts";
import { InscriptionIndex as SimInscriptionIndex } from "./runes/inscription.ts";
import { MaterialId } from "./runes/material.ts";
import { WorldState as RuneWorldState } from "./runes/world-state.ts";
import { createTickState, type TickState } from "./runes/world-tick.ts";

let runeWorldState: RuneWorldState | null = null;
let runeTickState: TickState | null = null;

export function initRuneWorld(): void {
	runeWorldState = new RuneWorldState();
	runeTickState = createTickState();
}

export function tickRuneWorld(
	world: World,
	dt: number,
	spawnFn: (x: number, y: number, z: number, color: number | string, count: number) => void,
): void {
	if (!runeWorldState || !runeTickState) return;

	const simIndex = new SimInscriptionIndex();
	world.query(PlayerTag, RuneFaces).readEach(([rf]) => {
		for (const [key, faces] of Object.entries(rf.faces)) {
			const [bx, by, bz] = key.split(",").map(Number);
			for (let fi = 0; fi < faces.length; fi++) {
				if (faces[fi] !== 0) {
					const normals: [number, number, number][] = [
						[1, 0, 0],
						[-1, 0, 0],
						[0, 1, 0],
						[0, -1, 0],
						[0, 0, 1],
						[0, 0, -1],
					];
					const [nx, ny, nz] = normals[fi];
					simIndex.add({
						x: bx,
						y: by,
						z: bz,
						nx,
						ny,
						nz,
						glyph: faces[fi] as RuneIdValue,
						material: MaterialId.Stone,
						strength: 10,
					});
				}
			}
		}
	});
	runeWorldTickSystem(simIndex, () => MaterialId.Stone, runeWorldState, runeTickState, new Map());

	runeResourcePickupSystem(world, runeWorldState, { spawnParticles: spawnFn });
	runRuneCombatEffectsSystem(world, dt, spawnFn, getLastSignalField());
}

export function getRuneWorldState(): RuneWorldState | null {
	return runeWorldState;
}

export function resetRuneWorld(): void {
	resetRuneIndex();
	resetRuneWorldTickState();
	runeWorldState = null;
	runeTickState = null;
	resetRuneResourcePickupState();
	resetCombatEffectsState();
	resetSensorState();
	resetEmitterState();
	resetInteractionRuneState();
	resetProtectionRuneState();
	resetNetworkRuneState();
	resetComputationalRuneState();
	resetSelfModifyState();
}

export { getRuneIndex };
