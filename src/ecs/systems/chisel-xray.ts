// ─── Chisel X-Ray System ───
// Detects long-press with chisel held to activate x-ray mode.
// When active, the rendering layer shows translucent internal faces
// revealing hidden rune inscriptions between adjacent blocks.

import type { World } from "koota";
import { ChiselState, MiningState, PlayerTag } from "../traits/index.ts";

/** Hold duration (seconds) before x-ray activates. */
export const XRAY_HOLD_THRESHOLD = 0.5;

/** Module-scoped timer — accumulates while chisel + mining are active. */
let holdTimer = 0;

/**
 * Chisel x-ray system — tracks long-press with chisel to toggle xrayActive.
 * Runs each frame. Must run AFTER runeInscriptionSystem (which sets chisel.active).
 */
export function chiselXraySystem(world: World, dt: number) {
	world.query(PlayerTag, ChiselState, MiningState).updateEach(([chisel, mining]) => {
		if (chisel.active && mining.active) {
			holdTimer += dt;
			if (holdTimer >= XRAY_HOLD_THRESHOLD) {
				chisel.xrayActive = true;
			}
		} else {
			holdTimer = 0;
			chisel.xrayActive = false;
		}
	});
}

/** Reset module state (call on game destroy). */
export function resetChiselXrayState() {
	holdTimer = 0;
}
