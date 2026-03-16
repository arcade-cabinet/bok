// ─── Network Rune System ───
// ECS system: processes Uruz (push) and Tiwaz (buff) on a throttled tick.
// Caches active buff zones and applies push forces to creatures.
// No Three.js — uses side-effect callbacks for particles and entity pushing.

import type { World } from "koota";
import { CreatureHealth, CreatureTag, PlayerTag, Position } from "../traits/index.ts";
import { getSignalMap } from "./emitter-system.ts";
import { INTERACTION_TICK_INTERVAL } from "./interaction-rune-data.ts";
import { isNetworkRune, TIWAZ_BUFF_COLOR, URUZ_PUSH_COLOR } from "./network-rune-data.ts";
import { type FaceIndex, RuneId, unpackFaceKey } from "./rune-data.ts";
import { getRuneIndex } from "./rune-index.ts";
import type { BuffZone } from "./tiwaz-buff.ts";
import { computeBuffMultiplier, computeBuffRadius } from "./tiwaz-buff.ts";
import { computePushVelocity, findEntitiesInPushRadius, type PushableEntity } from "./uruz-force.ts";

const SCAN_RADIUS = 3;
const CHUNK_SIZE = 16;
/** Particle spawn interval — less frequent than processing tick. */
const PARTICLE_INTERVAL = 1.0;

export interface NetworkRuneEffects {
	spawnParticles: (x: number, y: number, z: number, color: number, count: number) => void;
	pushCreature: (entityId: number, vx: number, vy: number, vz: number) => void;
}

// ─── Module-level caches ───

let networkTickTimer = 0;
let particleTimer = 0;
let cachedBuffZones: BuffZone[] = [];

/** Get all active Tiwaz buff zones. Read by creature combat. */
export function getActiveBuffZones(): ReadonlyArray<BuffZone> {
	return cachedBuffZones;
}

/** Reset module state. Called in destroyGame(). */
export function resetNetworkRuneState(): void {
	networkTickTimer = 0;
	particleTimer = 0;
	cachedBuffZones = [];
}

// ─── Rune entry type ───

interface NetworkRuneEntry {
	x: number;
	y: number;
	z: number;
	face: FaceIndex;
	runeId: number;
}

// ─── Main system ───

export function networkRuneSystem(world: World, dt: number, effects: NetworkRuneEffects): void {
	networkTickTimer += dt;
	if (networkTickTimer < INTERACTION_TICK_INTERVAL) return;
	networkTickTimer -= INTERACTION_TICK_INTERVAL;

	let px = 0;
	let pz = 0;
	let hasPlayer = false;
	world.query(PlayerTag, Position).readEach(([pos]) => {
		px = pos.x;
		pz = pos.z;
		hasPlayer = true;
	});
	if (!hasPlayer) return;

	const runes = collectNetworkRunes(Math.floor(px / CHUNK_SIZE), Math.floor(pz / CHUNK_SIZE));
	if (runes.length === 0) {
		cachedBuffZones = [];
		return;
	}

	const signalMap = getSignalMap();

	// Process Tiwaz buff zones
	cachedBuffZones = processTiwaz(runes, signalMap);

	// Process Uruz push forces
	const creatures = collectCreaturePositions(world);
	processUruz(runes, signalMap, creatures, effects);

	// Spawn particles at reduced frequency
	particleTimer += INTERACTION_TICK_INTERVAL;
	if (particleTimer >= PARTICLE_INTERVAL) {
		particleTimer -= PARTICLE_INTERVAL;
		spawnNetworkParticles(runes, effects);
	}
}

// ─── Chunk scan ───

function collectNetworkRunes(playerCx: number, playerCz: number): NetworkRuneEntry[] {
	const results: NetworkRuneEntry[] = [];
	const index = getRuneIndex();
	for (let dx = -SCAN_RADIUS; dx <= SCAN_RADIUS; dx++) {
		for (let dz = -SCAN_RADIUS; dz <= SCAN_RADIUS; dz++) {
			const chunkRunes = index.getChunkRunes(playerCx + dx, playerCz + dz);
			if (!chunkRunes) continue;
			for (const [vk, faces] of chunkRunes) {
				const { x, y, z } = unpackFaceKey(vk);
				for (const [face, runeId] of faces) {
					if (isNetworkRune(runeId)) {
						results.push({ x, y, z, face: face as FaceIndex, runeId });
					}
				}
			}
		}
	}
	return results;
}

// ─── Signal helper ───

type SignalMap = Map<string, Map<number, number>>;

function getMaxSignal(x: number, y: number, z: number, signalMap: SignalMap): number {
	const signals = signalMap.get(`${x},${y},${z}`);
	if (!signals) return 0;
	let maxStr = 0;
	for (const s of signals.values()) if (s > maxStr) maxStr = s;
	return maxStr;
}

// ─── Creature collection ───

interface CreatureWithId extends PushableEntity {
	entityId: number;
}

function collectCreaturePositions(world: World): CreatureWithId[] {
	const creatures: CreatureWithId[] = [];
	world.query(CreatureTag, Position, CreatureHealth).readEach(([pos, health], entity) => {
		if (health.hp > 0) {
			creatures.push({ x: pos.x, y: pos.y, z: pos.z, entityId: entity.id() });
		}
	});
	return creatures;
}

// ─── Per-rune processors ───

function processTiwaz(runes: ReadonlyArray<NetworkRuneEntry>, signalMap: SignalMap): BuffZone[] {
	const zones: BuffZone[] = [];
	for (const r of runes) {
		if (r.runeId !== RuneId.Tiwaz) continue;
		const strength = getMaxSignal(r.x, r.y, r.z, signalMap);
		const radius = computeBuffRadius(strength);
		const multiplier = computeBuffMultiplier(strength);
		zones.push({ x: r.x + 0.5, y: r.y + 0.5, z: r.z + 0.5, radius, multiplier });
	}
	return zones;
}

function processUruz(
	runes: ReadonlyArray<NetworkRuneEntry>,
	signalMap: SignalMap,
	creatures: ReadonlyArray<CreatureWithId>,
	effects: NetworkRuneEffects,
): void {
	for (const r of runes) {
		if (r.runeId !== RuneId.Uruz) continue;
		const strength = getMaxSignal(r.x, r.y, r.z, signalMap);
		const [vx, vy, vz] = computePushVelocity(r.face, strength);
		if (vx === 0 && vy === 0 && vz === 0) continue;

		const sourceX = r.x + 0.5;
		const sourceY = r.y + 0.5;
		const sourceZ = r.z + 0.5;
		const indices = findEntitiesInPushRadius(sourceX, sourceY, sourceZ, creatures);
		for (const idx of indices) {
			effects.pushCreature(creatures[idx].entityId, vx, vy, vz);
		}
	}
}

// ─── Particles ───

function spawnNetworkParticles(runes: ReadonlyArray<NetworkRuneEntry>, effects: NetworkRuneEffects): void {
	for (const r of runes) {
		if (r.runeId === RuneId.Uruz) {
			effects.spawnParticles(r.x + 0.5, r.y + 0.5, r.z + 0.5, URUZ_PUSH_COLOR, 1);
		} else if (r.runeId === RuneId.Tiwaz) {
			effects.spawnParticles(r.x + 0.5, r.y + 1, r.z + 0.5, TIWAZ_BUFF_COLOR, 1);
		}
	}
}
