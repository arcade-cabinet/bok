// ─── Settlement System ───
// ECS system: detects functional archetypes from rune builds, recognizes settlements,
// generates names, records saga entries, exposes cache for creature AI.
// No Three.js — uses side-effect callbacks for particles.

import type { World } from "koota";
import { PlayerTag, Position, SagaLog, ShelterState, WorldTime } from "../traits/index.ts";
import { CHUNK_SIZE } from "./archetype-data.ts";
import { detectAllArchetypes, type RuneBlock } from "./archetype-detect.ts";
import { isEmitterRune } from "./emitter-runes.ts";
import { getSignalMap } from "./emitter-system.ts";
import { isInteractionRune, isProtectionRune } from "./interaction-rune-data.ts";
import { isNetworkRune } from "./network-rune-data.ts";
import { unpackFaceKey } from "./rune-data.ts";
import { getRuneIndex } from "./rune-index.ts";
import { LEVEL_NAMES, settlementFoundedProse, settlementGrewProse } from "./settlement-data.ts";
import { detectSettlements, diffSettlements, type Settlement } from "./settlement-detect.ts";

/** How often to re-scan for settlements (seconds). Settlements change rarely. */
const SCAN_INTERVAL = 2.0;

/** Chunk scan radius around the player (in chunks). */
const SCAN_RADIUS = 3;

export interface SettlementEffects {
	spawnParticles: (x: number, y: number, z: number, color: number, count: number) => void;
}

// ─── Module-level state ───

let scanTimer = 0;
let cachedSettlements: Settlement[] = [];

/** Get all currently detected settlements. Read by creature AI and map. */
export function getActiveSettlements(): ReadonlyArray<Settlement> {
	return cachedSettlements;
}

/** Reset module state. Called in destroyGame(). */
export function resetSettlementState(): void {
	scanTimer = 0;
	cachedSettlements = [];
}

// ─── Rune Collection ───

/** Collect all inscribed rune blocks near the player for archetype detection. */
function collectAllRunes(playerCx: number, playerCz: number): RuneBlock[] {
	const results: RuneBlock[] = [];
	const index = getRuneIndex();
	for (let dx = -SCAN_RADIUS; dx <= SCAN_RADIUS; dx++) {
		for (let dz = -SCAN_RADIUS; dz <= SCAN_RADIUS; dz++) {
			const chunkRunes = index.getChunkRunes(playerCx + dx, playerCz + dz);
			if (!chunkRunes) continue;
			for (const [vk, faces] of chunkRunes) {
				const { x, y, z } = unpackFaceKey(vk);
				for (const [_face, runeId] of faces) {
					if (isEmitterRune(runeId) || isInteractionRune(runeId) || isProtectionRune(runeId) || isNetworkRune(runeId)) {
						results.push({ x, y, z, runeId });
						break; // one entry per block (use first rune found)
					}
				}
			}
		}
	}
	return results;
}

/** Build a set of position keys for blocks inside enclosed structures. */
function buildEnclosedSet(inShelter: boolean, px: number, py: number, pz: number): Set<string> {
	const set = new Set<string>();
	if (!inShelter) return set;
	// Mark positions near the player as enclosed when player is in shelter.
	// In a real full implementation, this would use the BFS enclosure result.
	// For archetype detection, we approximate: the player's shelter extends
	// to all blocks within a small radius of the player position.
	const radius = 8;
	const bx = Math.floor(px);
	const by = Math.floor(py);
	const bz = Math.floor(pz);
	for (let dx = -radius; dx <= radius; dx++) {
		for (let dz = -radius; dz <= radius; dz++) {
			for (let dy = -4; dy <= 4; dy++) {
				set.add(`${bx + dx},${by + dy},${bz + dz}`);
			}
		}
	}
	return set;
}

// ─── Main System ───

/**
 * Settlement system — throttled archetype detection + settlement recognition.
 * Runs after emitter and protection rune systems so signal data is current.
 */
export function settlementSystem(
	world: World,
	dt: number,
	getVoxel: (x: number, y: number, z: number) => number,
	effects: SettlementEffects,
): void {
	scanTimer += dt;
	if (scanTimer < SCAN_INTERVAL) return;
	scanTimer -= SCAN_INTERVAL;

	let px = 0;
	let py = 0;
	let pz = 0;
	let hasPlayer = false;
	let inShelter = false;

	world.query(PlayerTag, Position, ShelterState).readEach(([pos, shelter]) => {
		px = pos.x;
		py = pos.y;
		pz = pos.z;
		inShelter = shelter.inShelter;
		hasPlayer = true;
	});

	if (!hasPlayer) return;

	const playerCx = Math.floor(px / CHUNK_SIZE);
	const playerCz = Math.floor(pz / CHUNK_SIZE);

	// Collect runes and detect archetypes
	const runes = collectAllRunes(playerCx, playerCz);
	if (runes.length === 0) {
		cachedSettlements = [];
		return;
	}

	const signalMap = getSignalMap();
	const enclosedSet = buildEnclosedSet(inShelter, px, py, pz);
	const archetypes = detectAllArchetypes(runes, signalMap, enclosedSet, getVoxel);

	// Detect settlements from archetypes
	const prev = cachedSettlements;
	const next = detectSettlements(archetypes);
	cachedSettlements = next;

	// Diff for saga entries
	const { founded, grew } = diffSettlements(prev, next);
	if (founded.length === 0 && grew.length === 0) return;

	// Record saga entries for new and grown settlements
	let dayCount = 1;
	world.query(WorldTime).readEach(([time]) => {
		dayCount = time.dayCount;
	});

	world.query(PlayerTag, SagaLog).updateEach(([saga]) => {
		for (const s of founded) {
			const text = settlementFoundedProse(s.name);
			saga.entries.push({ milestoneId: `settlement_founded_${s.cx}_${s.cz}`, day: dayCount, text });
			// Spawn celebration particles at settlement center
			const wx = s.cx * CHUNK_SIZE + CHUNK_SIZE / 2;
			const wz = s.cz * CHUNK_SIZE + CHUNK_SIZE / 2;
			effects.spawnParticles(wx, py + 2, wz, 0xffd700, 20);
		}
		for (const s of grew) {
			const levelName = LEVEL_NAMES[s.level];
			const text = settlementGrewProse(s.name, levelName);
			saga.entries.push({ milestoneId: `settlement_grew_${s.cx}_${s.cz}_${s.level}`, day: dayCount, text });
			effects.spawnParticles(s.cx * CHUNK_SIZE + 8, py + 2, s.cz * CHUNK_SIZE + 8, 0xffd700, 10);
		}
	});
}
