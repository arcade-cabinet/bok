// ─── Self-Modifying Circuit System ───
// ECS system: processes Jera PLACE and Thurisaz DESTROY on exit faces,
// plus fuse consumption for wood blocks adjacent to heat signals.
// Runs after signal propagation — reads signal map, applies world mutations.
// No Three.js — uses side-effect callbacks for world changes.

import type { World } from "koota";
import { PlayerTag, Position } from "../traits/index.ts";
import { getSignalMap } from "./emitter-system.ts";
import { getHeatStrength, shouldFuseBurn } from "./fuse-burn.ts";
import { INTERACTION_TICK_INTERVAL } from "./interaction-rune-data.ts";
import { canPlaceBlock, selectPlacementBlock } from "./jera-place.ts";
import { type FaceIndex, RuneId, unpackFaceKey } from "./rune-data.ts";
import { getRuneIndex } from "./rune-index.ts";
import { FUSE_BURN_COLOR, isSelfModifyRune, JERA_PLACE_COLOR, THURISAZ_DESTROY_COLOR } from "./self-modify-data.ts";
import { FACE_OFFSETS, type SignalTypeId } from "./signal-data.ts";
import type { SignalMap } from "./signal-propagation.ts";
import { canDestroyBlock } from "./thurisaz-destroy.ts";

const SCAN_RADIUS = 3;
const CHUNK_SIZE = 16;

/** Maximum world mutations per tick to prevent runaway circuits. */
const MAX_MUTATIONS_PER_TICK = 8;

/** Side-effect callbacks for world mutations. */
export interface SelfModifyEffects {
	placeBlock: (x: number, y: number, z: number, blockId: number) => void;
	removeBlock: (x: number, y: number, z: number) => void;
	spawnParticles: (x: number, y: number, z: number, color: number, count: number) => void;
	getBlock: (x: number, y: number, z: number) => number;
}

let selfModifyTickTimer = 0;

/** Reset module state (call on game destroy). */
export function resetSelfModifyState(): void {
	selfModifyTickTimer = 0;
}

interface RuneEntry {
	x: number;
	y: number;
	z: number;
	face: FaceIndex;
	runeId: number;
}

/** Collect Jera and Thurisaz runes from chunks near the player. */
function collectSelfModifyRunes(playerCx: number, playerCz: number): RuneEntry[] {
	const results: RuneEntry[] = [];
	const index = getRuneIndex();
	for (let dx = -SCAN_RADIUS; dx <= SCAN_RADIUS; dx++) {
		for (let dz = -SCAN_RADIUS; dz <= SCAN_RADIUS; dz++) {
			const chunkRunes = index.getChunkRunes(playerCx + dx, playerCz + dz);
			if (!chunkRunes) continue;
			for (const [vk, faces] of chunkRunes) {
				const { x, y, z } = unpackFaceKey(vk);
				for (const [face, runeId] of faces) {
					if (isSelfModifyRune(runeId)) {
						results.push({ x, y, z, face: face as FaceIndex, runeId });
					}
				}
			}
		}
	}
	return results;
}

/** Get max signal strength of any type at a block position. */
function maxSignalAt(signalMap: SignalMap, x: number, y: number, z: number): [number, number] {
	const signals = signalMap.get(`${x},${y},${z}`);
	if (!signals) return [0, -1];
	let maxStr = 0;
	let maxType = -1;
	for (const [t, s] of signals) {
		if (s > maxStr) {
			maxStr = s;
			maxType = t;
		}
	}
	return [maxStr, maxType];
}

/** Process Jera exit-face PLACE operations. */
function processJeraPlace(
	runes: ReadonlyArray<RuneEntry>,
	signalMap: SignalMap,
	fx: SelfModifyEffects,
	mutationBudget: { remaining: number },
): void {
	for (const r of runes) {
		if (r.runeId !== RuneId.Jera || mutationBudget.remaining <= 0) continue;
		const [strength, sigType] = maxSignalAt(signalMap, r.x, r.y, r.z);
		if (strength <= 0 || sigType < 0) continue;

		const [dx, dy, dz] = FACE_OFFSETS[r.face];
		const ex = r.x + dx;
		const ey = r.y + dy;
		const ez = r.z + dz;
		const exitBlock = fx.getBlock(ex, ey, ez);
		const placeId = selectPlacementBlock(sigType as SignalTypeId);

		if (canPlaceBlock(exitBlock, strength, placeId)) {
			fx.placeBlock(ex, ey, ez, placeId);
			fx.spawnParticles(ex + 0.5, ey + 0.5, ez + 0.5, JERA_PLACE_COLOR, 4);
			mutationBudget.remaining--;
		}
	}
}

/** Process Thurisaz exit-face DESTROY operations. */
function processThurisazDestroy(
	runes: ReadonlyArray<RuneEntry>,
	signalMap: SignalMap,
	fx: SelfModifyEffects,
	mutationBudget: { remaining: number },
): void {
	for (const r of runes) {
		if (r.runeId !== RuneId.Thurisaz || mutationBudget.remaining <= 0) continue;
		const [strength] = maxSignalAt(signalMap, r.x, r.y, r.z);
		if (strength <= 0) continue;

		const [dx, dy, dz] = FACE_OFFSETS[r.face];
		const ex = r.x + dx;
		const ey = r.y + dy;
		const ez = r.z + dz;
		const exitBlock = fx.getBlock(ex, ey, ez);

		if (canDestroyBlock(exitBlock, strength)) {
			fx.removeBlock(ex, ey, ez);
			fx.spawnParticles(ex + 0.5, ey + 0.5, ez + 0.5, THURISAZ_DESTROY_COLOR, 5);
			mutationBudget.remaining--;
		}
	}
}

/** Scan for fuse blocks adjacent to heat signals and burn them. */
function processFuses(signalMap: SignalMap, fx: SelfModifyEffects, mutationBudget: { remaining: number }): void {
	const burned = new Set<string>();

	for (const [posKey, signals] of signalMap) {
		if (mutationBudget.remaining <= 0) break;
		const heat = getHeatStrength(signals);
		if (heat <= 0) continue;

		const parts = posKey.split(",");
		const bx = Number(parts[0]);
		const by = Number(parts[1]);
		const bz = Number(parts[2]);

		// Check 6 neighbors of this heated conductor block for fuse blocks
		for (const [dx, dy, dz] of FACE_OFFSETS) {
			const nx = bx + dx;
			const ny = by + dy;
			const nz = bz + dz;
			const nKey = `${nx},${ny},${nz}`;
			if (burned.has(nKey)) continue;

			const neighborBlock = fx.getBlock(nx, ny, nz);
			if (shouldFuseBurn(neighborBlock, heat)) {
				fx.removeBlock(nx, ny, nz);
				fx.spawnParticles(nx + 0.5, ny + 0.5, nz + 0.5, FUSE_BURN_COLOR, 6);
				burned.add(nKey);
				mutationBudget.remaining--;
				if (mutationBudget.remaining <= 0) return;
			}
		}
	}
}

/**
 * Self-modifying circuit system — processes Jera PLACE, Thurisaz DESTROY,
 * and fuse consumption after signal propagation.
 */
export function selfModifySystem(world: World, dt: number, effects: SelfModifyEffects): void {
	selfModifyTickTimer += dt;
	if (selfModifyTickTimer < INTERACTION_TICK_INTERVAL) return;
	selfModifyTickTimer -= INTERACTION_TICK_INTERVAL;

	let px = 0;
	let pz = 0;
	let hasPlayer = false;
	world.query(PlayerTag, Position).readEach(([pos]) => {
		px = pos.x;
		pz = pos.z;
		hasPlayer = true;
	});
	if (!hasPlayer) return;

	const signalMap = getSignalMap();
	if (signalMap.size === 0) return;

	const runes = collectSelfModifyRunes(Math.floor(px / CHUNK_SIZE), Math.floor(pz / CHUNK_SIZE));
	const mutationBudget = { remaining: MAX_MUTATIONS_PER_TICK };

	processJeraPlace(runes, signalMap, effects, mutationBudget);
	processThurisazDestroy(runes, signalMap, effects, mutationBudget);
	processFuses(signalMap, effects, mutationBudget);
}
