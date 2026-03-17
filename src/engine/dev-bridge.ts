/**
 * Dev Bridge — exposes game state to window.__bok for Chrome DevTools debugging.
 * Only active when import.meta.env.DEV is true.
 * Query from Chrome MCP: evaluate_script(() => window.__bok.state())
 */

import type { World } from "koota";
import { getActiveEmitters, getSignalMap } from "../ecs/systems/emitter-system.ts";
import { SEASON_NAMES } from "../ecs/systems/season-data.ts";
import { LEVEL_NAMES } from "../ecs/systems/settlement-data.ts";
import { getPlayerSettlement } from "../ecs/systems/settlement-system.ts";
import { getTomteHint, isTomteSpawned } from "../ecs/systems/tomte-ai.ts";
import {
	CreatureTag,
	CreatureType,
	Health,
	Hunger,
	InscriptionLevel,
	PhysicsBody,
	PlayerTag,
	Position,
	Rotation,
	SeasonState,
	Stamina,
	TerritoryState,
	WorldTime,
} from "../ecs/traits/index.ts";

let kWorld: World | null = null;
let lastFps = 0;
let frameCount = 0;
let fpsTimer = 0;
let lastTime = performance.now();
let drawCalls = 0;
let triangles = 0;
let chunkCount = 0;
let biomeName = "—";

export function initDevBridge(world: World): void {
	if (!import.meta.env.DEV) return;
	kWorld = world;

	const bridge = {
		/** Full state snapshot — call from Chrome DevTools MCP */
		state: () => collectState(),
		/** Just player position */
		pos: () => {
			let p = { x: 0, y: 0, z: 0 };
			kWorld?.query(PlayerTag, Position).readEach(([pos]) => {
				p = { x: pos.x, y: pos.y, z: pos.z };
			});
			return p;
		},
		/** Just vitals */
		vitals: () => {
			const v = { health: 0, hunger: 0, stamina: 0 };
			kWorld?.query(PlayerTag, Health).readEach(([h]) => {
				v.health = h.current;
			});
			kWorld?.query(PlayerTag, Hunger).readEach(([h]) => {
				v.hunger = h.current;
			});
			kWorld?.query(PlayerTag, Stamina).readEach(([s]) => {
				v.stamina = s.current;
			});
			return v;
		},
		/** List all creatures with positions */
		creatures: () => {
			const list: Array<{ species: string; x: number; y: number; z: number; hp: number }> = [];
			kWorld?.query(CreatureTag, CreatureType, Position, Health).readEach(([ct, pos, h]) => {
				list.push({ species: ct.species, x: pos.x, y: pos.y, z: pos.z, hp: h.current });
			});
			return list;
		},
		/** Rune system state */
		runes: () => {
			const emitters = getActiveEmitters();
			const signalMap = getSignalMap();
			return { emitters: emitters.length, signals: signalMap?.size ?? 0 };
		},
		/** World time */
		time: () => {
			const t = { timeOfDay: 0, dayCount: 0, season: "—" };
			kWorld?.query(WorldTime).readEach(([wt]) => {
				t.timeOfDay = wt.timeOfDay;
				t.dayCount = wt.dayCount;
			});
			kWorld?.query(SeasonState).readEach(([s]) => {
				t.season = SEASON_NAMES[s.current] ?? "—";
			});
			return t;
		},
		/** Tomte tutorial state */
		tomte: () => ({ spawned: isTomteSpawned(), hint: getTomteHint() }),
		/** Settlement state */
		settlement: () => {
			const s = getPlayerSettlement();
			return s ? { levelName: LEVEL_NAMES[s.level], level: s.level } : null;
		},
		/** Performance */
		perf: () => ({ fps: lastFps, drawCalls, triangles, chunks: chunkCount }),
	};

	(window as unknown as Record<string, unknown>).__bok = bridge;
}

export function tickDevBridge(): void {
	if (!import.meta.env.DEV) return;
	const now = performance.now();
	frameCount++;
	fpsTimer += now - lastTime;
	lastTime = now;
	if (fpsTimer >= 1000) {
		lastFps = frameCount;
		frameCount = 0;
		fpsTimer = 0;
	}
}

export function setDevRendererStats(dc: number, tri: number): void {
	drawCalls = dc;
	triangles = tri;
}

export function setDevChunkCount(count: number): void {
	chunkCount = count;
}

export function setDevBiome(name: string): void {
	biomeName = name;
}

function collectState() {
	if (!kWorld) return { error: "world not initialized" };

	let px = 0,
		py = 0,
		pz = 0,
		pitch = 0,
		yaw = 0;
	let health = 0,
		hunger = 0,
		stamina = 0;
	let onGround = false,
		isSwimming = false;
	let timeOfDay = 0,
		dayCount = 0,
		season = "—";
	let territoryDensity = 0,
		inscriptionLevel = 0;

	kWorld.query(PlayerTag, Position).readEach(([pos]) => {
		px = pos.x;
		py = pos.y;
		pz = pos.z;
	});
	kWorld.query(PlayerTag, Rotation).readEach(([rot]) => {
		pitch = rot.pitch;
		yaw = rot.yaw;
	});
	kWorld.query(PlayerTag, Health).readEach(([h]) => {
		health = h.current;
	});
	kWorld.query(PlayerTag, Hunger).readEach(([h]) => {
		hunger = h.current;
	});
	kWorld.query(PlayerTag, Stamina).readEach(([s]) => {
		stamina = s.current;
	});
	kWorld.query(PlayerTag, PhysicsBody).readEach(([b]) => {
		onGround = b.onGround;
		isSwimming = b.isSwimming;
	});
	kWorld.query(WorldTime).readEach(([t]) => {
		timeOfDay = t.timeOfDay;
		dayCount = t.dayCount;
	});
	kWorld.query(SeasonState).readEach(([s]) => {
		season = SEASON_NAMES[s.current] ?? "—";
	});
	kWorld.query(PlayerTag, TerritoryState).readEach(([t]) => {
		territoryDensity = t.density;
	});
	kWorld.query(PlayerTag, InscriptionLevel).readEach(([il]) => {
		inscriptionLevel = il.totalBlocksPlaced + il.totalBlocksMined;
	});

	let creatureCount = 0;
	kWorld.query(CreatureTag).readEach(() => {
		creatureCount++;
	});

	const settlement = getPlayerSettlement();
	const emitters = getActiveEmitters();
	const signalMap = getSignalMap();

	return {
		fps: lastFps,
		drawCalls,
		triangles,
		chunks: chunkCount,
		biome: biomeName,
		player: { x: px, y: py, z: pz, pitch, yaw, health, hunger, stamina, onGround, isSwimming },
		world: { timeOfDay, dayCount, season },
		territory: { density: territoryDensity, inscriptionLevel },
		settlement: settlement ? { level: LEVEL_NAMES[settlement.level] } : null,
		creatures: creatureCount,
		runes: { emitters: emitters.length, signals: signalMap?.size ?? 0 },
		tomte: { spawned: isTomteSpawned(), hint: getTomteHint() },
	};
}
