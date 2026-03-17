/**
 * SQLite persistence layer using @capacitor-community/sqlite.
 * Stores voxel deltas, player state, and world metadata.
 */

import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from "@capacitor-community/sqlite";
import { defineCustomElements as jeepSqliteElements } from "jeep-sqlite/loader";

const DB_NAME = "bok_game";
let sqlite: SQLiteConnection | null = null;
let db: SQLiteDBConnection | null = null;
let initialized = false;
let initPromise: Promise<void> | null = null;

export async function initDatabase(): Promise<void> {
	if (initialized) return;
	if (initPromise) return initPromise;

	initPromise = (async () => {
		if (initialized) return;

		sqlite = new SQLiteConnection(CapacitorSQLite);

		// Register jeep-sqlite web component for browser platform
		if (Capacitor.getPlatform() === "web") {
			jeepSqliteElements(window);
			const jeepEl = document.createElement("jeep-sqlite");
			jeepEl.setAttribute("wasmPath", `${import.meta.env.BASE_URL}assets`);
			document.body.appendChild(jeepEl);
			await customElements.whenDefined("jeep-sqlite");
			await sqlite.initWebStore();
		}

		db = await sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);
		await db.open();

		await db.execute(`
		CREATE TABLE IF NOT EXISTS save_slots (
			id INTEGER PRIMARY KEY,
			seed TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS player_state (
			slot_id INTEGER PRIMARY KEY REFERENCES save_slots(id) ON DELETE CASCADE,
			pos_x REAL NOT NULL DEFAULT 8.5,
			pos_y REAL NOT NULL DEFAULT 30,
			pos_z REAL NOT NULL DEFAULT 8.5,
			health REAL NOT NULL DEFAULT 100,
			hunger REAL NOT NULL DEFAULT 100,
			stamina REAL NOT NULL DEFAULT 100,
			quest_step INTEGER NOT NULL DEFAULT 0,
			quest_progress INTEGER NOT NULL DEFAULT 0,
			time_of_day REAL NOT NULL DEFAULT 0.25,
			day_count INTEGER NOT NULL DEFAULT 1,
			hotbar_json TEXT NOT NULL DEFAULT '[]',
			inventory_json TEXT NOT NULL DEFAULT '{}',
			inscription_blocks_placed INTEGER NOT NULL DEFAULT 0,
			inscription_blocks_mined INTEGER NOT NULL DEFAULT 0,
			inscription_structures_built INTEGER NOT NULL DEFAULT 0,
			discovered_runes_json TEXT NOT NULL DEFAULT '[]'
		);

		CREATE TABLE IF NOT EXISTS voxel_deltas (
			slot_id INTEGER NOT NULL REFERENCES save_slots(id) ON DELETE CASCADE,
			x INTEGER NOT NULL,
			y INTEGER NOT NULL,
			z INTEGER NOT NULL,
			block_id INTEGER NOT NULL,
			PRIMARY KEY (slot_id, x, y, z)
		);

		CREATE INDEX IF NOT EXISTS idx_voxel_deltas_slot ON voxel_deltas(slot_id);

		CREATE TABLE IF NOT EXISTS rune_faces (
			slot_id INTEGER NOT NULL REFERENCES save_slots(id) ON DELETE CASCADE,
			x INTEGER NOT NULL,
			y INTEGER NOT NULL,
			z INTEGER NOT NULL,
			face INTEGER NOT NULL,
			rune_id INTEGER NOT NULL,
			PRIMARY KEY (slot_id, x, y, z, face)
		);

		CREATE INDEX IF NOT EXISTS idx_rune_faces_slot ON rune_faces(slot_id);

		CREATE TABLE IF NOT EXISTS user_settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);
	`);

		// Migration: add discovered_runes_json column for existing databases
		try {
			await db.execute("ALTER TABLE player_state ADD COLUMN discovered_runes_json TEXT NOT NULL DEFAULT '[]'");
		} catch {
			// Column already exists — ignore
		}

		// Migration: add name column to save_slots
		try {
			await db.execute("ALTER TABLE save_slots ADD COLUMN name TEXT NOT NULL DEFAULT ''");
		} catch {
			// Column already exists — ignore
		}

		initialized = true;
	})();

	await initPromise;
	initPromise = null;
}

/** Persist to IndexedDB (web only). Call after writes. */
async function persistWebStore(): Promise<void> {
	if (Capacitor.getPlatform() === "web" && sqlite) {
		await sqlite.saveToStore(DB_NAME);
	}
}

// ─── Save Slots ───

export interface SaveSlotMeta {
	id: number;
	name: string;
	seed: string;
	createdAt: string;
	updatedAt: string;
}

export async function listSaveSlots(): Promise<SaveSlotMeta[]> {
	if (!db) return [];
	const result = await db.query(
		"SELECT id, name, seed, created_at, updated_at FROM save_slots ORDER BY updated_at DESC",
	);
	return (result.values ?? []).map((r) => ({
		id: r.id as number,
		name: (r.name as string) || (r.seed as string),
		seed: r.seed as string,
		createdAt: r.created_at as string,
		updatedAt: r.updated_at as string,
	}));
}

export async function createSaveSlot(seed: string, name?: string): Promise<number> {
	if (!db) throw new Error("Database not initialized");
	const slotName = name ?? seed;
	const result = await db.run("INSERT INTO save_slots (seed, name) VALUES (?, ?)", [seed, slotName]);
	const slotId = result.changes?.lastId;
	if (slotId === undefined) throw new Error("Failed to create save slot");
	await db.run("INSERT INTO player_state (slot_id) VALUES (?)", [slotId]);
	await persistWebStore();
	return slotId;
}

/** Preview data for the slot manager UI. */
export interface SlotPreviewData {
	id: number;
	name: string;
	seed: string;
	dayCount: number;
	inscriptionLevel: number;
	updatedAt: string;
}

/** Fetch all save slots with preview data (joined from player_state). */
export async function getSlotPreviews(): Promise<SlotPreviewData[]> {
	if (!db) return [];
	const result = await db.query(`
		SELECT s.id, s.name, s.seed, s.updated_at,
			COALESCE(p.day_count, 1) AS day_count,
			COALESCE(p.inscription_blocks_placed, 0) AS inscription_level
		FROM save_slots s
		LEFT JOIN player_state p ON p.slot_id = s.id
		ORDER BY s.updated_at DESC
	`);
	return (result.values ?? []).map((r) => ({
		id: r.id as number,
		name: (r.name as string) || (r.seed as string),
		seed: r.seed as string,
		dayCount: r.day_count as number,
		inscriptionLevel: r.inscription_level as number,
		updatedAt: r.updated_at as string,
	}));
}

export async function deleteSaveSlot(slotId: number): Promise<void> {
	if (!db) return;
	await db.run("DELETE FROM save_slots WHERE id = ?", [slotId]);
	await persistWebStore();
}

// ─── Player State ───

import type { InventoryData } from "../ecs/inventory.ts";

export interface PlayerSaveData {
	posX: number;
	posY: number;
	posZ: number;
	health: number;
	hunger: number;
	stamina: number;
	questStep: number;
	questProgress: number;
	timeOfDay: number;
	dayCount: number;
	hotbar: unknown[];
	inventory: InventoryData;
	inscriptionBlocksPlaced: number;
	inscriptionBlocksMined: number;
	inscriptionStructuresBuilt: number;
	discoveredRunes: number[];
}

export async function savePlayerState(slotId: number, data: PlayerSaveData): Promise<void> {
	if (!db) return;
	await db.run(
		`UPDATE player_state SET
			pos_x = ?, pos_y = ?, pos_z = ?,
			health = ?, hunger = ?, stamina = ?,
			quest_step = ?, quest_progress = ?,
			time_of_day = ?, day_count = ?,
			hotbar_json = ?, inventory_json = ?,
			inscription_blocks_placed = ?,
			inscription_blocks_mined = ?,
			inscription_structures_built = ?,
			discovered_runes_json = ?
		WHERE slot_id = ?`,
		[
			data.posX,
			data.posY,
			data.posZ,
			data.health,
			data.hunger,
			data.stamina,
			data.questStep,
			data.questProgress,
			data.timeOfDay,
			data.dayCount,
			JSON.stringify(data.hotbar),
			JSON.stringify(data.inventory),
			data.inscriptionBlocksPlaced,
			data.inscriptionBlocksMined,
			data.inscriptionStructuresBuilt,
			JSON.stringify(data.discoveredRunes),
			slotId,
		],
	);
	await db.run("UPDATE save_slots SET updated_at = datetime('now') WHERE id = ?", [slotId]);
	await persistWebStore();
}

export async function loadPlayerState(slotId: number): Promise<PlayerSaveData | null> {
	if (!db) return null;
	const result = await db.query("SELECT * FROM player_state WHERE slot_id = ?", [slotId]);
	const row = result.values?.[0];
	if (!row) return null;
	let hotbar: unknown[] = [];
	try {
		hotbar = JSON.parse(row.hotbar_json as string);
	} catch (e) {
		console.warn(`Corrupted hotbar_json for slot ${slotId}, using default`, e);
	}

	let inventory: InventoryData = { items: {}, capacity: 256 };
	try {
		const parsed = JSON.parse(row.inventory_json as string);
		if (parsed && typeof parsed === "object" && parsed.items) {
			// New format: { items: Record<number, number>, capacity: number }
			const items: Record<number, number> = {};
			for (const [k, v] of Object.entries(parsed.items)) {
				if (typeof v === "number" && v > 0) {
					items[Number(k)] = v;
				}
			}
			inventory = {
				items,
				capacity: typeof parsed.capacity === "number" ? parsed.capacity : 256,
			};
		} else if (parsed && typeof parsed === "object") {
			// Legacy format: { wood: 1, stone: 3, ... } — skip, start fresh
			inventory = { items: {}, capacity: 256 };
		}
	} catch (e) {
		console.warn(`Corrupted inventory_json for slot ${slotId}, using default`, e);
	}

	return {
		posX: row.pos_x as number,
		posY: row.pos_y as number,
		posZ: row.pos_z as number,
		health: row.health as number,
		hunger: row.hunger as number,
		stamina: row.stamina as number,
		questStep: row.quest_step as number,
		questProgress: row.quest_progress as number,
		timeOfDay: row.time_of_day as number,
		dayCount: row.day_count as number,
		hotbar,
		inventory,
		inscriptionBlocksPlaced: (row.inscription_blocks_placed as number) ?? 0,
		inscriptionBlocksMined: (row.inscription_blocks_mined as number) ?? 0,
		inscriptionStructuresBuilt: (row.inscription_structures_built as number) ?? 0,
		discoveredRunes: parseDiscoveredRunes(row.discovered_runes_json as string | undefined),
	};
}

function parseDiscoveredRunes(json: string | undefined): number[] {
	if (!json) return [];
	try {
		const arr = JSON.parse(json);
		return Array.isArray(arr) ? arr.filter((n): n is number => typeof n === "number") : [];
	} catch {
		return [];
	}
}

// ─── Voxel Deltas ───

export interface VoxelDelta {
	x: number;
	y: number;
	z: number;
	blockId: number;
}

/**
 * Save a single voxel modification (place or remove).
 * blockId=0 means the block was removed.
 */
export async function saveVoxelDelta(slotId: number, x: number, y: number, z: number, blockId: number): Promise<void> {
	if (!db) return;
	await db.run(
		`INSERT OR REPLACE INTO voxel_deltas (slot_id, x, y, z, block_id)
		 VALUES (?, ?, ?, ?, ?)`,
		[slotId, x, y, z, blockId],
	);
	await persistWebStore();
}

/** Batch-save voxel deltas. Call persistWebStore() after. */
export async function saveVoxelDeltasBatch(slotId: number, deltas: VoxelDelta[]): Promise<void> {
	if (!db || deltas.length === 0) return;
	const statements = deltas.map((d) => ({
		statement: "INSERT OR REPLACE INTO voxel_deltas (slot_id, x, y, z, block_id) VALUES (?, ?, ?, ?, ?)",
		values: [slotId, d.x, d.y, d.z, d.blockId],
	}));
	await db.executeSet(statements);
	await persistWebStore();
}

/** Load all voxel deltas for a save slot. */
export async function loadVoxelDeltas(slotId: number): Promise<VoxelDelta[]> {
	if (!db) return [];
	const result = await db.query("SELECT x, y, z, block_id FROM voxel_deltas WHERE slot_id = ?", [slotId]);
	return (result.values ?? []).map((r) => ({
		x: r.x as number,
		y: r.y as number,
		z: r.z as number,
		blockId: r.block_id as number,
	}));
}

/** Clear all voxel deltas for a slot. */
export async function clearVoxelDeltas(slotId: number): Promise<void> {
	if (!db) return;
	await db.run("DELETE FROM voxel_deltas WHERE slot_id = ?", [slotId]);
	await persistWebStore();
}

/** Close the database connection. */
export async function closeDatabase(): Promise<void> {
	if (db) {
		await db.close();
		db = null;
	}
	if (sqlite) {
		await sqlite.closeConnection(DB_NAME, false);
		sqlite = null;
	}
	initialized = false;
}

// ─── Rune Faces ───

export interface RuneFaceDelta {
	x: number;
	y: number;
	z: number;
	face: number;
	runeId: number;
}

/** Batch-save rune face inscriptions. Replaces all data for the slot. */
export async function saveRuneFaces(slotId: number, entries: RuneFaceDelta[]): Promise<void> {
	if (!db) return;
	await db.run("DELETE FROM rune_faces WHERE slot_id = ?", [slotId]);
	if (entries.length > 0) {
		const statements = entries.map((e) => ({
			statement: "INSERT INTO rune_faces (slot_id, x, y, z, face, rune_id) VALUES (?, ?, ?, ?, ?, ?)",
			values: [slotId, e.x, e.y, e.z, e.face, e.runeId],
		}));
		await db.executeSet(statements);
	}
	await persistWebStore();
}

/** Load all rune face inscriptions for a save slot. */
export async function loadRuneFaces(slotId: number): Promise<RuneFaceDelta[]> {
	if (!db) return [];
	const result = await db.query("SELECT x, y, z, face, rune_id FROM rune_faces WHERE slot_id = ?", [slotId]);
	return (result.values ?? []).map((r) => ({
		x: r.x as number,
		y: r.y as number,
		z: r.z as number,
		face: r.face as number,
		runeId: r.rune_id as number,
	}));
}

// ─── User Settings ───

/** Get a setting value. Returns defaultValue if not found or DB not ready. */
export async function getSetting(key: string, defaultValue: string): Promise<string> {
	if (!db) return defaultValue;
	const result = await db.query("SELECT value FROM user_settings WHERE key = ?", [key]);
	return (result.values?.[0]?.value as string) ?? defaultValue;
}

/** Set a setting value (upsert). */
export async function setSetting(key: string, value: string): Promise<void> {
	if (!db) return;
	await db.run("INSERT INTO user_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?", [
		key,
		value,
		value,
	]);
	await persistWebStore();
}

/** Load all settings as a Record. */
export async function loadAllSettings(): Promise<Record<string, string>> {
	if (!db) return {};
	const result = await db.query("SELECT key, value FROM user_settings");
	const settings: Record<string, string> = {};
	for (const r of result.values ?? []) {
		settings[r.key as string] = r.value as string;
	}
	return settings;
}
