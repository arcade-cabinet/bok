// ─── World Tick ───
// Orchestrates one tick of the rune world simulation:
// 1. Signal propagation (wavefront)
// 2. Process inscription logic (rune effects)
// 3. World effects in order: Berkanan → Fehu → Jera → Uruz
// No ECS, no Three.js — pure simulation orchestration.

import { RuneId } from "../../ecs/systems/rune-data.ts";
import type { InscriptionIndex, SurfaceInscription } from "./inscription.ts";
import type { ResourceIdValue } from "./resource.ts";
import type { InscriptionState } from "./rune-effects.ts";
import { createInscriptionState, isEmitter, processInscription } from "./rune-effects.ts";
import { applyBerkanan, applyFehu, applyJera, applyUruz, CooldownTracker } from "./rune-world-effects.ts";
import type { GetMaterial, SignalField, WavefrontEmitter } from "./wavefront.ts";
import { getSignalAt, getSourceCount, propagateWavefront } from "./wavefront.ts";
import type { WorldState } from "./world-state.ts";

// ─── Types ───

/** Configuration for Berkanan runes: which resource each one generates. */
export type BerkananConfig = Map<string, ResourceIdValue>;

/** Full tick result for external inspection. */
export interface TickResult {
	field: SignalField;
	tickCount: number;
}

/** Persistent state across ticks. */
export interface TickState {
	insStates: Map<string, InscriptionState>;
	cooldowns: CooldownTracker;
	tickCount: number;
}

/** Create fresh tick state. */
export function createTickState(): TickState {
	return {
		insStates: new Map(),
		cooldowns: new CooldownTracker(),
		tickCount: 0,
	};
}

// ─── Inscription Key ───

function insKey(ins: SurfaceInscription): string {
	return `${ins.x},${ins.y},${ins.z},${ins.glyph}`;
}

// ─── Tick Orchestrator ───

/**
 * Execute one world tick:
 * 1. Process all inscriptions to find emitters
 * 2. Propagate signal wavefronts
 * 3. Apply world effects in order: Berkanan → Fehu → Jera → Uruz
 *
 * @returns Updated signal field.
 */
export function tickWorld(
	insIndex: InscriptionIndex,
	getMaterial: GetMaterial,
	prevField: SignalField,
	world: WorldState,
	state: TickState,
	berkananConfig: BerkananConfig,
): TickResult {
	state.tickCount++;

	// ─── Phase 1: Process inscriptions → find emitters ───
	const emitters: WavefrontEmitter[] = [];
	const berkananList: SurfaceInscription[] = [];
	const fehuList: SurfaceInscription[] = [];
	const jeraList: SurfaceInscription[] = [];
	const uruzList: SurfaceInscription[] = [];

	for (const ins of insIndex.all()) {
		const key = insKey(ins);
		let insState = state.insStates.get(key);
		if (!insState) {
			insState = createInscriptionState();
			state.insStates.set(key, insState);
		}

		const signalStr = getSignalAt(prevField, ins.x, ins.y, ins.z);
		const sourceCnt = getSourceCount(prevField, ins.x, ins.y, ins.z);

		processInscription(ins.glyph, ins.material, insState, signalStr, sourceCnt, ins.strength);

		if (insState.emitting && insState.outputStrength > 0) {
			emitters.push({ x: ins.x, y: ins.y, z: ins.z, strength: insState.outputStrength });
		}

		// Bucket actuators by type (only when powered)
		if (insState.powered || isEmitter(ins.glyph)) {
			switch (ins.glyph) {
				case RuneId.Berkanan:
					if (insState.powered) berkananList.push(ins);
					break;
				case RuneId.Fehu:
					if (insState.powered) fehuList.push(ins);
					break;
				case RuneId.Jera:
					if (insState.powered) jeraList.push(ins);
					break;
				case RuneId.Uruz:
					if (insState.powered) uruzList.push(ins);
					break;
			}
		}
	}

	// ─── Phase 2: Signal propagation ───
	const field = propagateWavefront(emitters, getMaterial);

	// ─── Phase 3: World effects in order ───
	for (const ins of berkananList) {
		const resType = berkananConfig.get(`${ins.x},${ins.y},${ins.z}`);
		if (resType !== undefined) {
			applyBerkanan(ins, world, state.cooldowns, resType);
		}
	}

	for (const ins of fehuList) {
		applyFehu(ins, world);
	}

	for (const ins of jeraList) {
		applyJera(ins, world);
	}

	for (const ins of uruzList) {
		applyUruz(ins, world);
	}

	return { field, tickCount: state.tickCount };
}
