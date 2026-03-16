// ─── Computational Rune System ───
// ECS system: processes Naudiz (NOT), Isa (DELAY), and Hagalaz (AND) gates.
// Evaluates after signal propagation, produces emitters for the next tick.
// No Three.js — uses side-effect callbacks for visual feedback.

import type { World } from "koota";
import { BlockId } from "../../world/blocks.ts";
import { PlayerTag, Position } from "../traits/index.ts";
import {
	HAGALAZ_ACTIVE_COLOR,
	ISA_ACTIVE_COLOR,
	isComputationalRune,
	NAUDIZ_ACTIVE_COLOR,
} from "./computational-rune-data.ts";
import { getSignalMap } from "./emitter-system.ts";
import { evaluateHagalaz } from "./hagalaz-gate.ts";
import { INTERACTION_TICK_INTERVAL } from "./interaction-rune-data.ts";
import { evaluateIsa, resetIsaState } from "./isa-delay.ts";
import { evaluateNaudiz } from "./naudiz-not.ts";
import { type FaceIndex, RuneId, unpackFaceKey } from "./rune-data.ts";
import { getRuneIndex } from "./rune-index.ts";
import { FACE_OFFSETS } from "./signal-data.ts";
import type { SignalEmitter } from "./signal-propagation.ts";

const SCAN_RADIUS = 3;
const CHUNK_SIZE = 16;

/** Side-effect callbacks for visual particle feedback. */
export interface ComputationalRuneEffects {
	spawnParticles: (x: number, y: number, z: number, color: number, count: number) => void;
}

// ─── Module-level state ───

let computationalTickTimer = 0;
let currentTick = 0;
let cachedComputationalEmitters: SignalEmitter[] = [];

/** Get the current list of computational rune emitters (for next propagation tick). */
export function getComputationalEmitters(): ReadonlyArray<SignalEmitter> {
	return cachedComputationalEmitters;
}

/** Reset module state (call on game destroy). */
export function resetComputationalRuneState(): void {
	computationalTickTimer = 0;
	currentTick = 0;
	cachedComputationalEmitters = [];
	resetIsaState();
}

interface RuneEntry {
	x: number;
	y: number;
	z: number;
	face: FaceIndex;
	runeId: number;
}

/** Collect computational runes from chunks near the player. */
function collectComputationalRunes(playerCx: number, playerCz: number): RuneEntry[] {
	const results: RuneEntry[] = [];
	const index = getRuneIndex();
	for (let dx = -SCAN_RADIUS; dx <= SCAN_RADIUS; dx++) {
		for (let dz = -SCAN_RADIUS; dz <= SCAN_RADIUS; dz++) {
			const chunkRunes = index.getChunkRunes(playerCx + dx, playerCz + dz);
			if (!chunkRunes) continue;
			for (const [vk, faces] of chunkRunes) {
				const { x, y, z } = unpackFaceKey(vk);
				for (const [face, runeId] of faces) {
					if (isComputationalRune(runeId)) {
						results.push({ x, y, z, face: face as FaceIndex, runeId });
					}
				}
			}
		}
	}
	return results;
}

/**
 * Computational rune system — evaluates logic gates against the signal map
 * and produces emitters for the next propagation tick.
 */
export function computationalRuneSystem(
	world: World,
	dt: number,
	getBlock: (x: number, y: number, z: number) => number,
	effects: ComputationalRuneEffects,
): void {
	computationalTickTimer += dt;
	if (computationalTickTimer < INTERACTION_TICK_INTERVAL) return;
	computationalTickTimer -= INTERACTION_TICK_INTERVAL;
	currentTick++;

	let px = 0;
	let pz = 0;
	let hasPlayer = false;
	world.query(PlayerTag, Position).readEach(([pos]) => {
		px = pos.x;
		pz = pos.z;
		hasPlayer = true;
	});

	if (!hasPlayer) {
		cachedComputationalEmitters = [];
		return;
	}

	const runes = collectComputationalRunes(Math.floor(px / CHUNK_SIZE), Math.floor(pz / CHUNK_SIZE));
	if (runes.length === 0) {
		cachedComputationalEmitters = [];
		return;
	}

	const signalMap = getSignalMap();
	const emitters: SignalEmitter[] = [];

	for (const r of runes) {
		let result: SignalEmitter | null = null;
		let particleColor = 0;

		switch (r.runeId) {
			case RuneId.Naudiz: {
				result = evaluateNaudiz(r.x, r.y, r.z, r.face, signalMap);
				particleColor = NAUDIZ_ACTIVE_COLOR;
				break;
			}
			case RuneId.Isa: {
				const blockId = getBlock(r.x, r.y, r.z);
				const isCrystal = blockId === BlockId.Crystal;
				result = evaluateIsa(r.x, r.y, r.z, r.face, signalMap, isCrystal, currentTick);
				particleColor = ISA_ACTIVE_COLOR;
				break;
			}
			case RuneId.Hagalaz: {
				result = evaluateHagalaz(r.x, r.y, r.z, r.face, signalMap);
				particleColor = HAGALAZ_ACTIVE_COLOR;
				break;
			}
		}

		if (result) {
			emitters.push(result);
			const [dx, dy, dz] = FACE_OFFSETS[r.face];
			effects.spawnParticles(r.x + 0.5 + dx * 0.5, r.y + 0.5 + dy * 0.5, r.z + 0.5 + dz * 0.5, particleColor, 2);
		}
	}

	cachedComputationalEmitters = emitters;
}
