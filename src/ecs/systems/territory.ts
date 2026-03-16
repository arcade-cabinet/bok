// ─── Territory System ───
// ECS system: computes territory density from player-placed blocks,
// manages structure decay (moss accumulation), exposes territory zones.
// No Three.js — uses side-effect callbacks for block mutations.

import type { World } from "koota";
import { BlockId } from "../../world/blocks.ts";
import { PlayerTag, Position, TerritoryState, WorldTime } from "../traits/index.ts";
import { CHUNK_SIZE } from "./archetype-data.ts";
import {
	computeTerritoryDensity,
	computeTerritoryRadius,
	DECAY_CHECK_INTERVAL,
	hostileSpawnMultiplier,
	passiveSpawnBonus,
	TERRITORY_SCAN_HEIGHT,
	TERRITORY_SCAN_INTERVAL,
	TERRITORY_SCAN_RADIUS,
	type TerritoryZone,
} from "./territory-data.ts";
import {
	computeDecayCount,
	countTerritoryBlocks,
	isDecayEligible,
	isSealNearby,
	selectDecayTargets,
} from "./territory-decay.ts";

export interface TerritoryEffects {
	placeBlock: (x: number, y: number, z: number, blockId: number) => void;
	spawnParticles: (x: number, y: number, z: number, color: number, count: number) => void;
}

// ─── Module-level State ───

let densityScanTimer = 0;
let decayCheckTimer = 0;
let cachedZones: TerritoryZone[] = [];

/**
 * Track last-visited day per chunk. Key: packed chunk coords.
 * Updated when the player enters a chunk with territory.
 */
const lastVisitedDay = new Map<number, number>();

/** Pack chunk coords into a single number. */
function packChunk(cx: number, cz: number): number {
	return ((cx + 32768) << 16) | ((cz + 32768) & 0xffff);
}

/** Get all active territory zones. Read by creature AI and spawners. */
export function getActiveTerritoryZones(): ReadonlyArray<TerritoryZone> {
	return cachedZones;
}

/** Reset module state. Called in destroyGame(). */
export function resetTerritoryState(): void {
	densityScanTimer = 0;
	decayCheckTimer = 0;
	cachedZones = [];
	lastVisitedDay.clear();
}

// ─── Main System ───

/**
 * Territory system — throttled density scan + decay processing.
 * Runs after structure and settlement systems.
 */
export function territorySystem(
	world: World,
	dt: number,
	getVoxel: (x: number, y: number, z: number) => number,
	effects: TerritoryEffects,
): void {
	runDensityScan(world, dt, getVoxel);
	runDecayCheck(world, dt, getVoxel, effects);
}

// ─── Density Scan ───

function runDensityScan(world: World, dt: number, getVoxel: (x: number, y: number, z: number) => number): void {
	densityScanTimer += dt;
	if (densityScanTimer < TERRITORY_SCAN_INTERVAL) return;
	densityScanTimer -= TERRITORY_SCAN_INTERVAL;

	world.query(PlayerTag, Position, TerritoryState).updateEach(([pos, territory]) => {
		const blockCount = countTerritoryBlocks(
			pos.x,
			pos.y,
			pos.z,
			TERRITORY_SCAN_RADIUS,
			TERRITORY_SCAN_HEIGHT,
			getVoxel,
		);

		const density = computeTerritoryDensity(blockCount);
		const radius = computeTerritoryRadius(density);
		const sealActive = density > 0 && isSealNearby(pos.x, pos.y, pos.z, getVoxel);

		territory.density = density;
		territory.radius = radius;
		territory.sealActive = sealActive;
		territory.hostileSpawnMult = hostileSpawnMultiplier(density);
		territory.passiveBonus = passiveSpawnBonus(density);

		// Update zone cache
		if (radius > 0) {
			const cx = Math.floor(pos.x / CHUNK_SIZE);
			const cz = Math.floor(pos.z / CHUNK_SIZE);
			updateZoneCache(cx, cz, density, radius, sealActive, pos.x, pos.z);

			// Mark chunk as visited
			let dayCount = 1;
			world.query(WorldTime).readEach(([time]) => {
				dayCount = time.dayCount;
			});
			lastVisitedDay.set(packChunk(cx, cz), dayCount);
		} else {
			cachedZones = [];
		}
	});
}

/** Update the zone cache centered on the player's chunk. */
function updateZoneCache(
	cx: number,
	cz: number,
	density: number,
	radius: number,
	sealActive: boolean,
	px: number,
	pz: number,
): void {
	// For now, single zone centered on player's territory
	cachedZones = [
		{
			cx,
			cz,
			density,
			radius,
			sealActive,
			centerX: px,
			centerZ: pz,
		},
	];
}

// ─── Decay Check ───

function runDecayCheck(
	world: World,
	dt: number,
	getVoxel: (x: number, y: number, z: number) => number,
	effects: TerritoryEffects,
): void {
	decayCheckTimer += dt;
	if (decayCheckTimer < DECAY_CHECK_INTERVAL) return;
	decayCheckTimer -= DECAY_CHECK_INTERVAL;

	let dayCount = 1;
	world.query(WorldTime).readEach(([time]) => {
		dayCount = time.dayCount;
	});

	let py = 0;
	let hasPlayer = false;
	world.query(PlayerTag, Position).readEach(([pos]) => {
		py = pos.y;
		hasPlayer = true;
	});
	if (!hasPlayer) return;

	// Check all tracked zones for decay
	for (const zone of cachedZones) {
		const key = packChunk(zone.cx, zone.cz);
		const lastDay = lastVisitedDay.get(key) ?? dayCount;
		const daysSinceVisit = dayCount - lastDay;

		if (!isDecayEligible(daysSinceVisit, zone.sealActive)) continue;

		const count = computeDecayCount(daysSinceVisit);
		const targets = selectDecayTargets(zone.centerX, py, zone.centerZ, zone.radius, count, dayCount, getVoxel);

		for (const t of targets) {
			effects.placeBlock(t.x, t.y, t.z, BlockId.Moss);
			effects.spawnParticles(t.x + 0.5, t.y + 0.5, t.z + 0.5, 0x3a5a40, 3);
		}
	}
}
