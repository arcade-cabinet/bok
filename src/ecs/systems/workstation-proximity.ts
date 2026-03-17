// ─── Workstation Proximity System ───
// Scans nearby blocks around the player each frame to determine the highest
// available workstation tier. Updates the WorkstationProximity trait.

import type { World } from "koota";
import { PlayerTag, Position, WorkstationProximity } from "../traits/index.ts";
import { scanNearbyWorkstationTier } from "./workstation.ts";

/** Throttle interval in seconds — scanning every frame is wasteful. */
const SCAN_INTERVAL = 0.5;

let scanTimer = 0;

/**
 * ECS system: periodically scans for workstations near the player.
 * @param getVoxel — injected voxel accessor (avoids Three.js import)
 */
export function workstationProximitySystem(
	world: World,
	dt: number,
	getVoxel: (x: number, y: number, z: number) => number,
): void {
	scanTimer += dt;
	if (scanTimer < SCAN_INTERVAL) return;
	scanTimer -= SCAN_INTERVAL;

	world.query(PlayerTag, Position, WorkstationProximity).updateEach(([pos, ws]) => {
		ws.maxTier = scanNearbyWorkstationTier(pos.x, pos.y, pos.z, getVoxel);
	});
}

/** Reset scan timer (for testing or game restart). */
export function resetWorkstationScanTimer(): void {
	scanTimer = 0;
}
