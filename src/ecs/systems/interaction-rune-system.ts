// ─── Interaction Rune System ───
// ECS system: processes Jera/Fehu/Ansuz/Thurisaz on a throttled tick.
// No Three.js — uses side-effect callbacks for world mutations.

import type { World } from "koota";
import { CreatureHealth, CreatureTag, PlayerTag, Position } from "../traits/index.ts";
import { computeAnsuzSignalStrength, countDetectedEntities } from "./ansuz-sense.ts";
import { getSignalMap } from "./emitter-system.ts";
import { computePullVelocity, FEHU_COLLECT_DISTANCE } from "./fehu-pull.ts";
import { INTERACTION_TICK_INTERVAL, isInteractionRune, THURISAZ_DAMAGE_RADIUS } from "./interaction-rune-data.ts";
import { findJeraRecipe } from "./jera-transform.ts";
import { type FaceIndex, RuneId, unpackFaceKey } from "./rune-data.ts";
import { getRuneIndex } from "./rune-index.ts";
import { FACE_OFFSETS, SignalType } from "./signal-data.ts";
import type { SignalEmitter, SignalMap } from "./signal-propagation.ts";
import { computeThurisazDamage } from "./thurisaz-damage.ts";

const SCAN_RADIUS = 3;
const CHUNK_SIZE = 16;

export interface InteractionRuneEffects {
	spawnItemDrop: (x: number, y: number, z: number, itemId: number, qty: number) => void;
	collectNearbyItem: (runeX: number, runeY: number, runeZ: number, itemId: number) => boolean;
	spawnParticles: (x: number, y: number, z: number, color: number, count: number) => void;
	damageCreature: (entityId: number, damage: number) => void;
	getItemDropsNear: (x: number, y: number, z: number, radius: number) => ItemDropInfo[];
	moveItemDrop: (dropIndex: number, vx: number, vy: number, vz: number, dt: number) => void;
}

export interface ItemDropInfo {
	x: number;
	y: number;
	z: number;
	itemId: number;
	qty: number;
	index: number;
}

let interactionTickTimer = 0;
let cachedAnsuzEmitters: SignalEmitter[] = [];

export function getAnsuzEmitters(): ReadonlyArray<SignalEmitter> {
	return cachedAnsuzEmitters;
}
export function resetInteractionRuneState(): void {
	interactionTickTimer = 0;
	cachedAnsuzEmitters = [];
}

interface RuneEntry {
	x: number;
	y: number;
	z: number;
	face: FaceIndex;
	runeId: number;
}

interface CreaturePos {
	entityId: number;
	x: number;
	y: number;
	z: number;
}

export function interactionRuneSystem(world: World, dt: number, effects: InteractionRuneEffects): void {
	interactionTickTimer += dt;
	if (interactionTickTimer < INTERACTION_TICK_INTERVAL) return;
	interactionTickTimer -= INTERACTION_TICK_INTERVAL;

	let px = 0;
	let pz = 0;
	let hasPlayer = false;
	world.query(PlayerTag, Position).readEach(([pos]) => {
		px = pos.x;
		pz = pos.z;
		hasPlayer = true;
	});
	if (!hasPlayer) return;

	const runes = collectRunes(Math.floor(px / CHUNK_SIZE), Math.floor(pz / CHUNK_SIZE));
	if (runes.length === 0) {
		cachedAnsuzEmitters = [];
		return;
	}

	const signalMap = getSignalMap();
	const creatures = collectCreatures(world);

	processJera(runes, signalMap, effects);
	processFehu(runes, effects, INTERACTION_TICK_INTERVAL);
	cachedAnsuzEmitters = processAnsuz(runes, creatures);
	processThurisaz(runes, signalMap, creatures, effects);
}

function collectRunes(playerCx: number, playerCz: number): RuneEntry[] {
	const results: RuneEntry[] = [];
	const index = getRuneIndex();
	for (let dx = -SCAN_RADIUS; dx <= SCAN_RADIUS; dx++) {
		for (let dz = -SCAN_RADIUS; dz <= SCAN_RADIUS; dz++) {
			const chunkRunes = index.getChunkRunes(playerCx + dx, playerCz + dz);
			if (!chunkRunes) continue;
			for (const [vk, faces] of chunkRunes) {
				const { x, y, z } = unpackFaceKey(vk);
				for (const [face, runeId] of faces) {
					if (isInteractionRune(runeId)) {
						results.push({ x, y, z, face: face as FaceIndex, runeId });
					}
				}
			}
		}
	}
	return results;
}

function collectCreatures(world: World): CreaturePos[] {
	const creatures: CreaturePos[] = [];
	world.query(CreatureTag, Position, CreatureHealth).readEach(([pos, hp], entity) => {
		if (hp.hp > 0) creatures.push({ entityId: entity.id(), x: pos.x, y: pos.y, z: pos.z });
	});
	return creatures;
}

function processJera(runes: ReadonlyArray<RuneEntry>, signalMap: SignalMap, fx: InteractionRuneEffects): void {
	for (const r of runes) {
		if (r.runeId !== RuneId.Jera) continue;
		const signals = signalMap.get(`${r.x},${r.y},${r.z}`);
		if (!signals) continue;
		for (const [sigType, strength] of signals) {
			const items = fx.getItemDropsNear(r.x + 0.5, r.y + 0.5, r.z + 0.5, 2.0);
			for (const item of items) {
				const recipe = findJeraRecipe(item.itemId, sigType, strength);
				if (!recipe) continue;
				if (fx.collectNearbyItem(r.x + 0.5, r.y + 0.5, r.z + 0.5, item.itemId)) {
					const [dx, dy, dz] = FACE_OFFSETS[r.face];
					fx.spawnItemDrop(r.x + 0.5 + dx, r.y + 0.5 + dy, r.z + 0.5 + dz, recipe.outputId, recipe.outputQty);
					fx.spawnParticles(r.x + 0.5, r.y + 0.5, r.z + 0.5, 0x228b22, 4);
					break;
				}
			}
		}
	}
}

function processFehu(runes: ReadonlyArray<RuneEntry>, fx: InteractionRuneEffects, dt: number): void {
	for (const r of runes) {
		if (r.runeId !== RuneId.Fehu) continue;
		const sx = r.x + 0.5;
		const sy = r.y + 0.5;
		const sz = r.z + 0.5;
		const items = fx.getItemDropsNear(sx, sy, sz, 6.0);
		for (const item of items) {
			const ddx = sx - item.x;
			const ddy = sy - item.y;
			const ddz = sz - item.z;
			if (ddx * ddx + ddy * ddy + ddz * ddz <= FEHU_COLLECT_DISTANCE * FEHU_COLLECT_DISTANCE) {
				fx.spawnParticles(sx, sy, sz, 0xffd700, 3);
				continue;
			}
			const [vx, vy, vz] = computePullVelocity(item.x, item.y, item.z, sx, sy, sz);
			if (vx !== 0 || vy !== 0 || vz !== 0) fx.moveItemDrop(item.index, vx, vy, vz, dt);
		}
	}
}

function processAnsuz(runes: ReadonlyArray<RuneEntry>, creatures: ReadonlyArray<CreaturePos>): SignalEmitter[] {
	const emitters: SignalEmitter[] = [];
	for (const r of runes) {
		if (r.runeId !== RuneId.Ansuz) continue;
		const src = { x: r.x + 0.5, y: r.y + 0.5, z: r.z + 0.5 };
		const count = countDetectedEntities(src, creatures);
		const strength = computeAnsuzSignalStrength(count);
		if (strength > 0) {
			emitters.push({ x: r.x, y: r.y, z: r.z, face: r.face, signalType: SignalType.Detection, strength });
		}
	}
	return emitters;
}

function processThurisaz(
	runes: ReadonlyArray<RuneEntry>,
	signalMap: SignalMap,
	creatures: ReadonlyArray<CreaturePos>,
	fx: InteractionRuneEffects,
): void {
	const rSq = THURISAZ_DAMAGE_RADIUS * THURISAZ_DAMAGE_RADIUS;
	for (const r of runes) {
		if (r.runeId !== RuneId.Thurisaz) continue;
		const signals = signalMap.get(`${r.x},${r.y},${r.z}`);
		if (!signals) continue;
		let maxStr = 0;
		for (const s of signals.values()) if (s > maxStr) maxStr = s;
		const dmg = computeThurisazDamage(maxStr);
		if (dmg <= 0) continue;
		const sx = r.x + 0.5;
		const sy = r.y + 0.5;
		const sz = r.z + 0.5;
		for (const c of creatures) {
			const dx = c.x - sx;
			const dy = c.y - sy;
			const dz = c.z - sz;
			if (dx * dx + dy * dy + dz * dz <= rSq) {
				fx.damageCreature(c.entityId, dmg);
				fx.spawnParticles(c.x, c.y, c.z, 0xff4500, 5);
			}
		}
	}
}
