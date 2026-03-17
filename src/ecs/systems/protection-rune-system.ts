// ─── Protection Rune System ───
// ECS system: processes Algiz/Mannaz/Berkanan on a throttled tick.
// Caches active zones for creature AI and growth systems to read.
// No Three.js — uses side-effect callbacks for particles.

import type { World } from "koota";
import { PlayerTag, Position } from "../traits/index.ts";
import { computeWardRadius, type WardZone } from "./algiz-ward.ts";
import { computeGrowthMultiplier, computeGrowthRadius, type GrowthZone } from "./berkanan-grow.ts";
import { getSignalMap } from "./emitter-system.ts";
import {
	ALGIZ_WARD_COLOR,
	BERKANAN_GROW_COLOR,
	INTERACTION_TICK_INTERVAL,
	isProtectionRune,
	MANNAZ_CALM_COLOR,
} from "./interaction-rune-data.ts";
import { type CalmZone, computeCalmRadius } from "./mannaz-calm.ts";
import { type FaceIndex, RuneId, unpackFaceKey } from "./rune-data.ts";
import { getRuneIndex } from "./rune-index.ts";

const SCAN_RADIUS = 3;
const CHUNK_SIZE = 16;
/** Particle spawn interval — less frequent than processing tick. */
const PARTICLE_INTERVAL = 1.0;

export interface ProtectionRuneEffects {
	spawnParticles: (x: number, y: number, z: number, color: number, count: number) => void;
}

// ─── Module-level caches ───

let protectionTickTimer = 0;
let particleTimer = 0;
let cachedWardZones: WardZone[] = [];
let cachedCalmZones: CalmZone[] = [];
let cachedGrowthZones: GrowthZone[] = [];

/** Get all active Algiz ward exclusion zones. Read by creature AI. */
export function getActiveWards(): ReadonlyArray<WardZone> {
	return cachedWardZones;
}

/** Get all active Mannaz calm zones. Read by creature AI. */
export function getActiveCalmZones(): ReadonlyArray<CalmZone> {
	return cachedCalmZones;
}

/** Get all active Berkanan growth zones. Read by growth systems. */
export function getActiveGrowthZones(): ReadonlyArray<GrowthZone> {
	return cachedGrowthZones;
}

/** Reset all protection rune state. Called in destroyGame(). */
export function resetProtectionRuneState(): void {
	protectionTickTimer = 0;
	particleTimer = 0;
	cachedWardZones = [];
	cachedCalmZones = [];
	cachedGrowthZones = [];
}

// ─── Rune entry type ───

interface ProtectionRuneEntry {
	x: number;
	y: number;
	z: number;
	face: FaceIndex;
	runeId: number;
}

// ─── Main system ───

export function protectionRuneSystem(world: World, dt: number, effects: ProtectionRuneEffects): void {
	protectionTickTimer += dt;
	if (protectionTickTimer < INTERACTION_TICK_INTERVAL) return;
	protectionTickTimer -= INTERACTION_TICK_INTERVAL;

	let px = 0;
	let pz = 0;
	let hasPlayer = false;
	world.query(PlayerTag, Position).readEach(([pos]) => {
		px = pos.x;
		pz = pos.z;
		hasPlayer = true;
	});
	if (!hasPlayer) return;

	const runes = collectProtectionRunes(Math.floor(px / CHUNK_SIZE), Math.floor(pz / CHUNK_SIZE));
	if (runes.length === 0) {
		cachedWardZones = [];
		cachedCalmZones = [];
		cachedGrowthZones = [];
		return;
	}

	const signalMap = getSignalMap();
	cachedWardZones = processAlgiz(runes, signalMap);
	cachedCalmZones = processMannaz(runes, signalMap);
	cachedGrowthZones = processBerkanan(runes, signalMap);

	// Spawn boundary particles at reduced frequency
	particleTimer += INTERACTION_TICK_INTERVAL;
	if (particleTimer >= PARTICLE_INTERVAL) {
		particleTimer -= PARTICLE_INTERVAL;
		spawnWardParticles(effects);
	}
}

// ─── Chunk scan ───

function collectProtectionRunes(playerCx: number, playerCz: number): ProtectionRuneEntry[] {
	const results: ProtectionRuneEntry[] = [];
	const index = getRuneIndex();
	for (let dx = -SCAN_RADIUS; dx <= SCAN_RADIUS; dx++) {
		for (let dz = -SCAN_RADIUS; dz <= SCAN_RADIUS; dz++) {
			const chunkRunes = index.getChunkRunes(playerCx + dx, playerCz + dz);
			if (!chunkRunes) continue;
			for (const [vk, faces] of chunkRunes) {
				const { x, y, z } = unpackFaceKey(vk);
				for (const [face, runeId] of faces) {
					if (isProtectionRune(runeId)) {
						results.push({ x, y, z, face: face as FaceIndex, runeId });
					}
				}
			}
		}
	}
	return results;
}

// ─── Per-rune processors ───

type SignalMap = Map<string, Map<number, number>>;

function getMaxSignal(x: number, y: number, z: number, signalMap: SignalMap): number {
	const signals = signalMap.get(`${x},${y},${z}`);
	if (!signals) return 0;
	let maxStr = 0;
	for (const s of signals.values()) if (s > maxStr) maxStr = s;
	return maxStr;
}

function processAlgiz(runes: ReadonlyArray<ProtectionRuneEntry>, signalMap: SignalMap): WardZone[] {
	const zones: WardZone[] = [];
	for (const r of runes) {
		if (r.runeId !== RuneId.Algiz) continue;
		const strength = getMaxSignal(r.x, r.y, r.z, signalMap);
		const radius = computeWardRadius(strength);
		zones.push({ x: r.x + 0.5, y: r.y + 0.5, z: r.z + 0.5, radius });
	}
	return zones;
}

function processMannaz(runes: ReadonlyArray<ProtectionRuneEntry>, signalMap: SignalMap): CalmZone[] {
	const zones: CalmZone[] = [];
	for (const r of runes) {
		if (r.runeId !== RuneId.Mannaz) continue;
		const strength = getMaxSignal(r.x, r.y, r.z, signalMap);
		const radius = computeCalmRadius(strength);
		zones.push({ x: r.x + 0.5, y: r.y + 0.5, z: r.z + 0.5, radius });
	}
	return zones;
}

function processBerkanan(runes: ReadonlyArray<ProtectionRuneEntry>, signalMap: SignalMap): GrowthZone[] {
	const zones: GrowthZone[] = [];
	for (const r of runes) {
		if (r.runeId !== RuneId.Berkanan) continue;
		const strength = getMaxSignal(r.x, r.y, r.z, signalMap);
		const radius = computeGrowthRadius(strength);
		const multiplier = computeGrowthMultiplier(strength);
		zones.push({ x: r.x + 0.5, y: r.y + 0.5, z: r.z + 0.5, radius, multiplier });
	}
	return zones;
}

// ─── Ward boundary particles ───

function spawnWardParticles(effects: ProtectionRuneEffects): void {
	for (const w of cachedWardZones) {
		effects.spawnParticles(w.x + w.radius * 0.7, w.y, w.z, ALGIZ_WARD_COLOR, 2);
		effects.spawnParticles(w.x - w.radius * 0.7, w.y, w.z, ALGIZ_WARD_COLOR, 2);
		effects.spawnParticles(w.x, w.y, w.z + w.radius * 0.7, ALGIZ_WARD_COLOR, 2);
		effects.spawnParticles(w.x, w.y, w.z - w.radius * 0.7, ALGIZ_WARD_COLOR, 2);
	}
	for (const c of cachedCalmZones) {
		effects.spawnParticles(c.x, c.y + 1, c.z, MANNAZ_CALM_COLOR, 1);
	}
	for (const g of cachedGrowthZones) {
		effects.spawnParticles(g.x, g.y + 0.5, g.z, BERKANAN_GROW_COLOR, 1);
	}
}
