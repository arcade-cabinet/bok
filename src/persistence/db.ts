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

	// Register jeep-sqlite web component for browser platform
	if (Capacitor.getPlatform() === "web") {
		jeepSqliteElements(window);
		const jeepEl = document.createElement("jeep-sqlite");
		document.body.appendChild(jeepEl);
		await customElements.whenDefined("jeep-sqlite");
		await (jeepEl as unknown as JeepSqliteElement).initWebStore();
	}

	sqlite = new SQLiteConnection(CapacitorSQLite);
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
			inventory_json TEXT NOT NULL DEFAULT '{}'
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
	`);

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
	seed: string;
	createdAt: string;
	updatedAt: string;
}

export async function listSaveSlots(): Promise<SaveSlotMeta[]> {
	if (!db) return [];
	const result = await db.query("SELECT id, seed, created_at, updated_at FROM save_slots ORDER BY updated_at DESC");
	return (result.values ?? []).map((r) => ({
		id: r.id as number,
		seed: r.seed as string,
		createdAt: r.created_at as string,
		updatedAt: r.updated_at as string,
	}));
}

export async function createSaveSlot(seed: string): Promise<number> {
	if (!db) throw new Error("Database not initialized");
	await db.run("BEGIN TRANSACTION");
	try {
		const result = await db.run("INSERT INTO save_slots (seed) VALUES (?)", [seed]);
		const slotId = result.changes?.lastId;
		if (slotId === undefined) throw new Error("Failed to create save slot");
		await db.run("INSERT INTO player_state (slot_id) VALUES (?)", [slotId]);
		await db.run("COMMIT");
		await persistWebStore();
		return slotId;
	} catch (error) {
		await db.run("ROLLBACK");
		throw error;
	}
}

export async function deleteSaveSlot(slotId: number): Promise<void> {
	if (!db) return;
	await db.run("DELETE FROM save_slots WHERE id = ?", [slotId]);
	await persistWebStore();
}

// ─── Player State ───

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
	inventory: Record<string, number>;
}

export async function savePlayerState(slotId: number, data: PlayerSaveData): Promise<void> {
	if (!db) return;
	await db.run(
		`UPDATE player_state SET
			pos_x = ?, pos_y = ?, pos_z = ?,
			health = ?, hunger = ?, stamina = ?,
			quest_step = ?, quest_progress = ?,
			time_of_day = ?, day_count = ?,
			hotbar_json = ?, inventory_json = ?
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

	let inventory: Record<string, number> = {};
	try {
		inventory = JSON.parse(row.inventory_json as string);
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
	};
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

// Type declaration for jeep-sqlite web component
interface JeepSqliteElement {
	initWebStore(): Promise<void>;
}