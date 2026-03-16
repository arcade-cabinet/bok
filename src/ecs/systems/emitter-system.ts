// ─── Emitter System ───
// ECS system: collects emitter runes from RuneIndex, runs signal propagation
// on a throttled tick, exposes the signal map and spawns particle trails.
// No Three.js — uses side-effect callbacks for visual feedback.

import type { World } from "koota";
import { PlayerTag, Position } from "../traits/index.ts";
import { getEmitterConfig, hexToNumber } from "./emitter-runes.ts";
import { type FaceIndex, unpackFaceKey } from "./rune-data.ts";
import { getRuneIndex } from "./rune-index.ts";
import { FACE_OFFSETS, SIGNAL_TICK_INTERVAL } from "./signal-data.ts";
import { propagateSignals, type SignalEmitter, type SignalMap } from "./signal-propagation.ts";

/** Chunk scan radius around the player (in chunks). */
const SCAN_RADIUS = 3;

/** Chunk size must match terrain-generator. */
const CHUNK_SIZE = 16;

/** Side-effect callbacks for visual particle feedback. */
export interface EmitterEffects {
	spawnParticles: (x: number, y: number, z: number, color: number, count: number) => void;
}

/** Internal type pairing an emitter with its glow color for particles. */
interface EmitterWithGlow {
	emitter: SignalEmitter;
	glowColorNum: number;
}

// ─── Module-level state ───

let signalTickTimer = 0;
let cachedSignalMap: SignalMap = new Map();
let cachedEmitters: ReadonlyArray<SignalEmitter> = [];

/** Get the current signal map (computed each propagation tick). */
export function getSignalMap(): SignalMap {
	return cachedSignalMap;
}

/** Get the current list of active emitters (for external reads). */
export function getActiveEmitters(): ReadonlyArray<SignalEmitter> {
	return cachedEmitters;
}

/** Reset module state (call on game destroy). */
export function resetEmitterState(): void {
	signalTickTimer = 0;
	cachedSignalMap = new Map();
	cachedEmitters = [];
}

/**
 * Collect all emitter runes from chunks near the player.
 * Returns both the SignalEmitter array (for propagation) and glow data (for particles).
 */
export function collectEmitters(playerCx: number, playerCz: number): EmitterWithGlow[] {
	const results: EmitterWithGlow[] = [];
	const index = getRuneIndex();

	for (let dx = -SCAN_RADIUS; dx <= SCAN_RADIUS; dx++) {
		for (let dz = -SCAN_RADIUS; dz <= SCAN_RADIUS; dz++) {
			const cx = playerCx + dx;
			const cz = playerCz + dz;
			const chunkRunes = index.getChunkRunes(cx, cz);
			if (!chunkRunes) continue;

			for (const [voxelKey, faces] of chunkRunes) {
				const { x, y, z } = unpackFaceKey(voxelKey);
				for (const [face, runeId] of faces) {
					const config = getEmitterConfig(runeId);
					if (!config || !config.continuous) continue;

					results.push({
						emitter: {
							x,
							y,
							z,
							face: face as FaceIndex,
							signalType: config.signalType,
							strength: config.strength,
						},
						glowColorNum: hexToNumber(config.glowColor),
					});
				}
			}
		}
	}

	return results;
}

/**
 * Spawn particles at emitter face exit points for visual feedback.
 * Shows a trail at the signal emission direction on each tick.
 */
function spawnEmitterParticles(collected: ReadonlyArray<EmitterWithGlow>, effects: EmitterEffects): void {
	for (const { emitter, glowColorNum } of collected) {
		const [dx, dy, dz] = FACE_OFFSETS[emitter.face];
		effects.spawnParticles(
			emitter.x + 0.5 + dx * 0.5,
			emitter.y + 0.5 + dy * 0.5,
			emitter.z + 0.5 + dz * 0.5,
			glowColorNum,
			2,
		);
	}
}

/**
 * Emitter system — collects emitter runes, runs signal propagation,
 * and spawns particle trail effects on each tick.
 *
 * @param world - Koota ECS world.
 * @param dt - Frame delta time in seconds.
 * @param getBlock - Returns block ID at a world position.
 * @param effects - Side-effect callbacks for visual feedback.
 */
export function emitterSystem(
	world: World,
	dt: number,
	getBlock: (x: number, y: number, z: number) => number,
	effects: EmitterEffects,
): void {
	signalTickTimer += dt;
	if (signalTickTimer < SIGNAL_TICK_INTERVAL) return;
	signalTickTimer -= SIGNAL_TICK_INTERVAL;

	// Get player chunk position
	let px = 0;
	let pz = 0;
	let hasPlayer = false;

	world.query(PlayerTag, Position).readEach(([pos]) => {
		px = pos.x;
		pz = pos.z;
		hasPlayer = true;
	});

	if (!hasPlayer) {
		cachedSignalMap = new Map();
		cachedEmitters = [];
		return;
	}

	const playerCx = Math.floor(px / CHUNK_SIZE);
	const playerCz = Math.floor(pz / CHUNK_SIZE);

	// Collect emitters from nearby chunks
	const collected = collectEmitters(playerCx, playerCz);
	const emitters = collected.map((c) => c.emitter);
	cachedEmitters = emitters;

	if (emitters.length === 0) {
		cachedSignalMap = new Map();
		return;
	}

	// Run signal propagation
	cachedSignalMap = propagateSignals(emitters, getBlock);

	// Spawn particle effects at emitter faces
	spawnEmitterParticles(collected, effects);
}
