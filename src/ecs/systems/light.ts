/**
 * Light system — scans nearby light-emitting blocks and player hotbar
 * to build a list of active light sources each frame.
 *
 * The light source list is consumed by:
 * - Creature spawner (spawn avoidance)
 * - Mörker AI (flee/damage)
 * - Future: rendering (point lights, shadow volumes)
 *
 * Throttled scan: block sources are re-scanned every SCAN_INTERVAL seconds.
 * Player hotbar light updates every frame (position changes constantly).
 */

import type { World } from "koota";
import { BLOCKS } from "../../world/blocks.ts";
import { Hotbar, PlayerTag, Position } from "../traits/index.ts";
import { getBlockLightRadius, getItemLightRadius, type LightSource } from "./light-sources.ts";

/** Scan interval for block-based light sources (seconds). */
const SCAN_INTERVAL = 0.5;

/** Scan radius around the player for light-emitting blocks. */
const SCAN_RADIUS = 24;

/** Vertical scan range (blocks above and below player). */
const SCAN_HEIGHT = 8;

// ─── Module State ───

let blockSources: LightSource[] = [];
let scanTimer = 0;

/** Combined light sources (blocks + player hotbar). Updated each frame. */
let activeSources: LightSource[] = [];

/**
 * Run the light system. Call once per frame from game bridge.
 * getVoxel: injected voxel accessor (side-effect pattern).
 */
export function lightSystem(world: World, dt: number, getVoxel: (x: number, y: number, z: number) => number): void {
	let px = 0;
	let py = 0;
	let pz = 0;
	world.query(PlayerTag, Position).readEach(([pos]) => {
		px = pos.x;
		py = pos.y;
		pz = pos.z;
	});

	// Throttled block scan
	scanTimer += dt;
	if (scanTimer >= SCAN_INTERVAL) {
		scanTimer -= SCAN_INTERVAL;
		blockSources = scanBlockLightSources(px, py, pz, getVoxel);
	}

	// Player hotbar light (updated every frame — player moves)
	const playerLight = getPlayerHotbarLight(world, px, py, pz);

	if (playerLight) {
		activeSources = [...blockSources, playerLight];
	} else {
		activeSources = blockSources;
	}
}

/** Get current active light sources (read by creature systems). */
export function getActiveLightSources(): LightSource[] {
	return activeSources;
}

/** Reset module state (for tests and game restart). */
export function resetLightState(): void {
	blockSources = [];
	activeSources = [];
	scanTimer = 0;
}

// ─── Block Scanning ───

function scanBlockLightSources(
	px: number,
	py: number,
	pz: number,
	getVoxel: (x: number, y: number, z: number) => number,
): LightSource[] {
	const sources: LightSource[] = [];
	const cx = Math.floor(px);
	const cy = Math.floor(py);
	const cz = Math.floor(pz);

	for (let dx = -SCAN_RADIUS; dx <= SCAN_RADIUS; dx++) {
		for (let dz = -SCAN_RADIUS; dz <= SCAN_RADIUS; dz++) {
			for (let dy = -SCAN_HEIGHT; dy <= SCAN_HEIGHT; dy++) {
				const x = cx + dx;
				const y = cy + dy;
				const z = cz + dz;
				const blockId = getVoxel(x, y, z);
				if (blockId === 0) continue;

				const radius = getBlockLightRadius(blockId);
				if (radius > 0) {
					sources.push({ x: x + 0.5, y: y + 0.5, z: z + 0.5, radius });
				}
			}
		}
	}
	return sources;
}

// ─── Player Hotbar Light ───

function getPlayerHotbarLight(world: World, px: number, py: number, pz: number): LightSource | null {
	let result: LightSource | null = null;
	world.query(PlayerTag, Hotbar).readEach(([hotbar]) => {
		const slot = hotbar.slots[hotbar.activeSlot];
		if (!slot) return;

		let radius = 0;
		if (slot.type === "item") {
			radius = getItemLightRadius(slot.id);
		} else if (slot.type === "block") {
			// Holding a torch block also emits light
			const meta = BLOCKS[slot.id];
			if (meta?.emissive) {
				radius = getBlockLightRadius(slot.id);
			}
		}

		if (radius > 0) {
			result = { x: px, y: py, z: pz, radius };
		}
	});
	return result;
}

export { SCAN_INTERVAL, SCAN_RADIUS };
