// ─── Rune Inscription System ───
// ECS system: manages chisel mode, face selection, rune placement.
// Intercepts mining when chisel is active. Runs BEFORE miningSystem.

import type { World } from "koota";
import { computeEtchingTarget } from "../../engine/etching-camera.ts";
import {
	CameraTransition,
	ChiselState,
	EtchingState,
	Hotbar,
	MiningState,
	PlayerTag,
	Position,
	RuneFaces,
} from "../traits/index.ts";
import { computeFaceIndex } from "./face-selection.ts";
import { CHISEL_ITEM_ID, FACE_COUNT, type FaceIndex, packFaceKey, type RuneIdValue } from "./rune-data.ts";
import { getRuneIndex } from "./rune-index.ts";
import { drainDurability } from "./tool-durability.ts";

/** Hit data including face information, computed from BlockHighlight lastHit + lastPrev. */
export interface FaceHit {
	blockX: number;
	blockY: number;
	blockZ: number;
	prevX: number;
	prevY: number;
	prevZ: number;
}

/** Side-effect callbacks for visual feedback. */
export interface RuneInscriptionEffects {
	spawnParticles: (x: number, y: number, z: number, color: string, count: number) => void;
}

/**
 * Rune inscription system — intercepts mining when chisel is held,
 * selects block faces, and places runes via the rune wheel.
 *
 * Must run BEFORE miningSystem so it can clear MiningState.active.
 */
export function runeInscriptionSystem(
	world: World,
	_dt: number,
	faceHit: FaceHit | null,
	_effects: RuneInscriptionEffects,
) {
	world
		.query(PlayerTag, ChiselState, EtchingState, CameraTransition, Position, Hotbar, MiningState, RuneFaces)
		.updateEach(([chisel, etching, camTrans, pos, hotbar, mining, _runeFaces]) => {
			// Check if chisel is in the active hotbar slot
			const slot = hotbar.slots[hotbar.activeSlot];
			const holdingChisel = slot !== null && slot.type === "item" && slot.id === CHISEL_ITEM_ID;
			chisel.active = holdingChisel;

			if (!holdingChisel) {
				// Clear chisel state when not holding chisel
				if (chisel.selectedFace !== -1) {
					chisel.selectedFace = -1;
					chisel.wheelOpen = false;
					chisel.xrayActive = false;
				}
				return;
			}

			// Don't intercept while etching is active
			if (etching.active) {
				mining.active = false;
				mining.progress = 0;
				return;
			}

			// Chisel is active — intercept mining, open etching surface
			if (mining.active && faceHit) {
				const face = computeFaceIndex(
					faceHit.blockX,
					faceHit.blockY,
					faceHit.blockZ,
					faceHit.prevX,
					faceHit.prevY,
					faceHit.prevZ,
				);

				if (face !== -1) {
					chisel.selectedX = faceHit.blockX;
					chisel.selectedY = faceHit.blockY;
					chisel.selectedZ = faceHit.blockZ;
					chisel.selectedFace = face;

					// Open etching surface directly (no wheel)
					etching.active = true;
					etching.blockX = faceHit.blockX;
					etching.blockY = faceHit.blockY;
					etching.blockZ = faceHit.blockZ;
					etching.faceIndex = face;

					// Start camera transition to face-on view
					const target = computeEtchingTarget(faceHit.blockX, faceHit.blockY, faceHit.blockZ, face);
					camTrans.active = true;
					camTrans.progress = 0;
					camTrans.toEtching = true;
					camTrans.startX = pos.x;
					camTrans.startY = pos.y;
					camTrans.startZ = pos.z;
					camTrans.targetX = target.position.x;
					camTrans.targetY = target.position.y;
					camTrans.targetZ = target.position.z;
					camTrans.lookAtX = target.lookAt.x;
					camTrans.lookAtY = target.lookAt.y;
					camTrans.lookAtZ = target.lookAt.z;
				}

				// Prevent mining — chisel taps don't break blocks
				mining.active = false;
				mining.progress = 0;
			}
		});
}

/**
 * Place a rune on a selected face. Called from the UI callback when
 * the player selects a rune from the wheel.
 *
 * Returns true if the rune was placed successfully.
 */
export function placeRune(
	world: World,
	blockX: number,
	blockY: number,
	blockZ: number,
	faceIndex: FaceIndex,
	runeId: RuneIdValue,
	effects: RuneInscriptionEffects,
): boolean {
	let placed = false;

	world.query(PlayerTag, RuneFaces, Hotbar, ChiselState).updateEach(([runeFaces, hotbar, chisel]) => {
		const key = packFaceKey(blockX, blockY, blockZ);

		// Initialize face array if not present
		if (!runeFaces.faces[key]) {
			runeFaces.faces[key] = new Array(FACE_COUNT).fill(0);
		}

		// Place the rune (ECS trait + spatial index)
		runeFaces.faces[key][faceIndex] = runeId;
		getRuneIndex().setRune(blockX, blockY, blockZ, faceIndex, runeId);
		placed = true;

		// Drain chisel durability
		const slot = hotbar.slots[hotbar.activeSlot];
		if (slot && slot.type === "item" && slot.id === CHISEL_ITEM_ID) {
			if (drainDurability(slot)) {
				hotbar.slots[hotbar.activeSlot] = null;
			}
		}

		chisel.selectedFace = -1;

		// Visual feedback
		effects.spawnParticles(blockX + 0.5, blockY + 0.5, blockZ + 0.5, "#FFD700", 8);
	});

	return placed;
}

/**
 * Get the rune ID on a specific block face, or 0 (None) if blank.
 */
export function getRuneOnFace(
	runeFaces: { faces: Record<string, number[]> },
	blockX: number,
	blockY: number,
	blockZ: number,
	faceIndex: FaceIndex,
): number {
	const key = packFaceKey(blockX, blockY, blockZ);
	const faces = runeFaces.faces[key];
	if (!faces) return 0;
	return faces[faceIndex] ?? 0;
}
