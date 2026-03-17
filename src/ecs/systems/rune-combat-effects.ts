// ─── Rune Combat Effects System ───
// Reads the rune simulation's signal field and applies combat effects:
// - Thurisaz: damage creatures proportional to signal strength
// - (Algiz/Tiwaz handled by protection/network rune systems via old SignalMap)
// Runs AFTER runeWorldTickSystem so it reads the latest simulation output.
// No Three.js — uses side-effect callbacks for visual feedback.

import type { World } from "koota";
import type { SignalField } from "../../engine/runes/wavefront.ts";
import { CreatureHealth, CreatureTag, PlayerTag, Position } from "../traits/index.ts";
import { INTERACTION_TICK_INTERVAL, THURISAZ_DAMAGE_RADIUS } from "./interaction-rune-data.ts";
import { RuneId, unpackFaceKey } from "./rune-data.ts";
import { getRuneIndex } from "./rune-index.ts";
import { computeThurisazDamage } from "./thurisaz-damage.ts";

const SCAN_RADIUS = 3;
const CHUNK_SIZE = 16;

export interface CombatRuneEffects {
	spawnParticles: (x: number, y: number, z: number, color: number, count: number) => void;
	damageCreature: (entityId: number, damage: number) => void;
}

let combatTickTimer = 0;

export function resetCombatEffectsState(): void {
	combatTickTimer = 0;
}

/**
 * Apply combat rune effects from the rune simulation's signal field.
 * Scans for Thurisaz inscriptions powered by the simulation and damages nearby creatures.
 *
 * @param world - Koota ECS world.
 * @param dt - Frame delta time in seconds.
 * @param field - Signal field from the rune world simulation.
 * @param effects - Side-effect callbacks for particles and damage.
 */
export function runeCombatEffectsSystem(
	world: World,
	dt: number,
	field: SignalField,
	effects: CombatRuneEffects,
): void {
	combatTickTimer += dt;
	if (combatTickTimer < INTERACTION_TICK_INTERVAL) return;
	combatTickTimer -= INTERACTION_TICK_INTERVAL;

	let px = 0;
	let pz = 0;
	let hasPlayer = false;
	world.query(PlayerTag, Position).readEach(([pos]) => {
		px = pos.x;
		pz = pos.z;
		hasPlayer = true;
	});
	if (!hasPlayer || field.size === 0) return;

	const index = getRuneIndex();
	const playerCx = Math.floor(px / CHUNK_SIZE);
	const playerCz = Math.floor(pz / CHUNK_SIZE);

	// Collect creatures once for damage checks
	const creatures: Array<{ entityId: number; x: number; y: number; z: number }> = [];
	world.query(CreatureTag, Position, CreatureHealth).readEach(([pos, hp], entity) => {
		if (hp.hp > 0) creatures.push({ entityId: entity.id(), x: pos.x, y: pos.y, z: pos.z });
	});
	if (creatures.length === 0) return;

	const rSq = THURISAZ_DAMAGE_RADIUS * THURISAZ_DAMAGE_RADIUS;

	for (let dx = -SCAN_RADIUS; dx <= SCAN_RADIUS; dx++) {
		for (let dz = -SCAN_RADIUS; dz <= SCAN_RADIUS; dz++) {
			const chunkRunes = index.getChunkRunes(playerCx + dx, playerCz + dz);
			if (!chunkRunes) continue;

			for (const [vk, faces] of chunkRunes) {
				const { x, y, z } = unpackFaceKey(vk);

				for (const [, runeId] of faces) {
					if (runeId !== RuneId.Thurisaz) continue;

					const cell = field.get(`${x},${y},${z}`);
					const strength = cell?.strength ?? 0;
					const dmg = computeThurisazDamage(strength);
					if (dmg <= 0) continue;

					const sx = x + 0.5;
					const sy = y + 0.5;
					const sz = z + 0.5;
					for (const c of creatures) {
						const cdx = c.x - sx;
						const cdy = c.y - sy;
						const cdz = c.z - sz;
						if (cdx * cdx + cdy * cdy + cdz * cdz <= rSq) {
							effects.damageCreature(c.entityId, dmg);
							effects.spawnParticles(c.x, c.y, c.z, 0xff4500, 5);
						}
					}
				}
			}
		}
	}
}
