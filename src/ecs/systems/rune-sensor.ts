// ─── Rune Sensor System ───
// Detects creatures near Ansuz inscriptions and caches sensor emitters.
// Runs BEFORE wavefront propagation so detection signals feed into next tick.
// No Three.js — uses side-effect callbacks for visual feedback.

import type { World } from "koota";
import { CreatureHealth, CreatureTag, PlayerTag, Position } from "../traits/index.ts";
import { computeAnsuzSignalStrength, countDetectedEntities } from "./ansuz-sense.ts";
import { INTERACTION_TICK_INTERVAL } from "./interaction-rune-data.ts";
import { type FaceIndex, RuneId, unpackFaceKey } from "./rune-data.ts";
import { getRuneIndex } from "./rune-index.ts";
import { SignalType } from "./signal-data.ts";
import type { SignalEmitter } from "./signal-propagation.ts";

const SCAN_RADIUS = 3;
const CHUNK_SIZE = 16;

export interface SensorEffects {
	spawnParticles: (x: number, y: number, z: number, color: number, count: number) => void;
}

/** Ansuz detection particle color. */
const ANSUZ_DETECT_COLOR = 0x7b68ee;

let sensorTickTimer = 0;
let cachedSensorEmitters: SignalEmitter[] = [];

/** Get the current sensor emitter cache (for external reads). */
export function getSensorEmitters(): ReadonlyArray<SignalEmitter> {
	return cachedSensorEmitters;
}

export function resetSensorState(): void {
	sensorTickTimer = 0;
	cachedSensorEmitters = [];
}

interface CreaturePos {
	x: number;
	y: number;
	z: number;
}

/**
 * Scan for Ansuz inscriptions near the player and detect creatures.
 * Caches sensor emitter results for downstream signal propagation.
 *
 * @param world - Koota ECS world.
 * @param dt - Frame delta time in seconds.
 * @param effects - Side-effect callbacks for visual feedback.
 */
export function runeSensorSystem(world: World, dt: number, effects: SensorEffects): void {
	sensorTickTimer += dt;
	if (sensorTickTimer < INTERACTION_TICK_INTERVAL) return;
	sensorTickTimer -= INTERACTION_TICK_INTERVAL;

	let px = 0;
	let pz = 0;
	let hasPlayer = false;
	world.query(PlayerTag, Position).readEach(([pos]) => {
		px = pos.x;
		pz = pos.z;
		hasPlayer = true;
	});
	if (!hasPlayer) {
		cachedSensorEmitters = [];
		return;
	}

	// Collect creatures
	const creatures: CreaturePos[] = [];
	world.query(CreatureTag, Position, CreatureHealth).readEach(([pos, hp]) => {
		if (hp.hp > 0) creatures.push({ x: pos.x, y: pos.y, z: pos.z });
	});

	const index = getRuneIndex();
	const playerCx = Math.floor(px / CHUNK_SIZE);
	const playerCz = Math.floor(pz / CHUNK_SIZE);
	const emitters: SignalEmitter[] = [];

	for (let dx = -SCAN_RADIUS; dx <= SCAN_RADIUS; dx++) {
		for (let dz = -SCAN_RADIUS; dz <= SCAN_RADIUS; dz++) {
			const chunkRunes = index.getChunkRunes(playerCx + dx, playerCz + dz);
			if (!chunkRunes) continue;

			for (const [vk, faces] of chunkRunes) {
				const { x, y, z } = unpackFaceKey(vk);

				for (const [face, runeId] of faces) {
					if (runeId !== RuneId.Ansuz) continue;

					const src = { x: x + 0.5, y: y + 0.5, z: z + 0.5 };
					const count = countDetectedEntities(src, creatures);
					const strength = computeAnsuzSignalStrength(count);

					if (strength > 0) {
						emitters.push({
							x,
							y,
							z,
							face: face as FaceIndex,
							signalType: SignalType.Detection,
							strength,
						});
						effects.spawnParticles(x + 0.5, y + 0.5, z + 0.5, ANSUZ_DETECT_COLOR, 3);
					}
				}
			}
		}
	}

	cachedSensorEmitters = emitters;
}
