# Persistence Architecture

## Overview

Bok uses **@capacitor-community/sqlite** for all persistence. On web, this wraps sql.js (SQLite compiled to WASM) with IndexedDB storage via jeep-sqlite. On native (iOS/Android), it uses the platform's native SQLite.

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Game State   │────>│  db.ts       │────>│  SQLite      │
│  (ECS)       │     │  (queries)   │     │  (storage)   │
│              │<────│              │<────│              │
└──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                          ┌─────┴─────┐
                                          │ IndexedDB  │ (web)
                                          │ or Native  │ (iOS/Android)
                                          └───────────┘
```

## Database Schema

### save_slots

```sql
CREATE TABLE save_slots (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  seed TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### player_state

```sql
CREATE TABLE player_state (
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
```

### voxel_deltas

```sql
CREATE TABLE voxel_deltas (
  slot_id INTEGER NOT NULL REFERENCES save_slots(id) ON DELETE CASCADE,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  z INTEGER NOT NULL,
  block_id INTEGER NOT NULL,
  PRIMARY KEY (slot_id, x, y, z)
);
CREATE INDEX idx_voxel_deltas_slot ON voxel_deltas(slot_id);
```

### rune_faces

Stores per-face rune inscriptions for every inscribed block in the world.

```sql
CREATE TABLE rune_faces (
  slot_id INTEGER NOT NULL REFERENCES save_slots(id) ON DELETE CASCADE,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  z INTEGER NOT NULL,
  face INTEGER NOT NULL,  -- 0=+x, 1=-x, 2=+y, 3=-y, 4=+z, 5=-z
  rune_id INTEGER NOT NULL,
  PRIMARY KEY (slot_id, x, y, z, face)
);
CREATE INDEX idx_rune_faces_slot ON rune_faces(slot_id);
```

Save strategy: full replace on each save (delete all for slot, then batch insert). See `saveRuneFaces()` in `src/persistence/db.ts`.

### user_settings

Key-value store for cross-slot preferences (render quality, controls, etc.).

```sql
CREATE TABLE user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Access via `getSetting(key, defaultValue)` and `setSetting(key, value)` (upsert).

## Voxel Delta Pattern

The world is **not** stored in full. Instead:

1. **Generation**: World terrain is deterministically generated from seed
2. **Deltas**: Every block placed or removed is stored as a delta `(x, y, z, blockId)`
3. **Loading**: Regenerate terrain from seed, then apply all deltas on top
4. **UPSERT**: `INSERT OR REPLACE` ensures only the latest state per coordinate is stored

This means:
- New game: 0 rows in voxel_deltas
- After mining 100 blocks: 100 rows (blockId=0 for removed)
- After building a house: N rows for placed blocks + M rows for mined blocks
- Storage grows linearly with player modifications, not world size

### Delta Tracking Flow
```text
Player places/removes block
  → setVoxelAt() in voxel-helpers.ts
    → VoxelRenderer updates visual
    → deltaListener fires (if enabled)
      → saveVoxelDelta() writes to SQLite
```

The delta listener is registered by `enableVoxelDeltaTracking()` in `src/engine/game.ts` and wired in `src/ui/hooks/useSaveManager.ts` when a game session starts.

## ECS Trait Serialization

### Serialized traits (persisted to SQLite)

These traits are read by `readPlayerStateForSave()` in `src/engine/game-save.ts` and written to `player_state`:

| Trait | Columns | Notes |
|-------|---------|-------|
| `Position` | `pos_x`, `pos_y`, `pos_z` | Player world position |
| `Health` | `health` | `health.current` |
| `Hunger` | `hunger` | `hunger.current` |
| `Stamina` | `stamina` | `stamina.current` |
| `QuestProgress` | `quest_step`, `quest_progress` | Quest state |
| `WorldTime` | `time_of_day`, `day_count` | Day cycle |
| `Hotbar` | `hotbar_json` | Serialized as JSON array of `HotbarSlot | null` |
| `Inventory` | `inventory_json` | Serialized as `{ items: Record<number,number>, capacity: number }` |
| `InscriptionLevel` | `inscription_blocks_placed`, `inscription_blocks_mined`, `inscription_structures_built` | Progression counters |
| `RuneDiscovery` (IDs) | `discovered_runes_json` | Array of discovered `RuneId` integers |
| `RuneFaces` (index) | `rune_faces` table | All face inscriptions, restored via `applyRuneEntries()` |

### Runtime-only traits (not persisted)

These traits exist in ECS but are reset to defaults at the start of each session:

| Trait | Reason not persisted |
|-------|---------------------|
| `SeasonState` | Derived from `day_count`; recalculated on load |
| `FarmPlots` | Resets each session; farm state is emergent |
| `SagaLog` | Narrative log; not yet wired to persistence |
| `Codex` | Knowledge entries; not yet wired to persistence |
| `SettlementBonusState` | Derived from active rune inscriptions |
| `TerritoryState` | Derived from active rune inscriptions |

## Save/Load Flow

### New Game
```text
1. initGame(canvas, seed)         — Generate world, spawn ECS entities
2. createSaveSlot(seed)           — Insert save_slots + player_state rows
3. enableVoxelDeltaTracking()     — Wire delta listener
4. Auto-save every 60s            — savePlayerState() + saveRuneFaces()
```

### Continue Game
```text
1. listSaveSlots()                — Find most recent save
2. loadPlayerState(slotId)        — Read player_state row
3. initGame(canvas, slot.seed)    — Regenerate world from seed
4. loadVoxelDeltas(slotId)        — Read all voxel_deltas rows
5. applyVoxelDeltas(deltas)       — Apply deltas to live world
6. restorePlayerState(data)       — Write save data back to ECS
7. loadRuneFaces(slotId)          — Read rune_faces rows
8. applyRuneEntries(entries)      — Restore rune spatial index + RuneFaces trait
9. enableVoxelDeltaTracking()     — Wire delta listener for new changes
```

### Auto-Save

Auto-save runs every **60 seconds** while `phase === "playing"`. Defined in `src/ui/hooks/useSaveManager.ts` (`AUTO_SAVE_INTERVAL_MS = 60_000`) and tested in `src/ecs/systems/session-data.test.ts`.

```text
setInterval(() => {
  readPlayerStateForSave()        — Read ECS state (game-save.ts)
  savePlayerState(slotId, data)   — UPDATE player_state row
  saveRuneFaces(slotId, entries)  — REPLACE rune_faces rows
}, 60_000)
```

Voxel deltas are written **immediately** on each block change (not batched with the 60s interval) via the delta listener registered in `enableVoxelDeltaTracking()`.

## Schema Migrations

Applied at `initDatabase()` time via `ALTER TABLE ... ADD COLUMN` wrapped in try/catch to skip if column already exists:

| Migration | Column added |
|-----------|-------------|
| 1 | `player_state.discovered_runes_json` |
| 2 | `save_slots.name` |

## Web Platform Details

On web (`Capacitor.getPlatform() === "web"`):

1. `jeep-sqlite` web component is registered
2. `initWebStore()` initializes IndexedDB-backed storage
3. After every write, `persistWebStore()` flushes in-memory DB to IndexedDB
4. The `sql-wasm.wasm` file is served from `public/assets/`

## API Reference

| Function | Purpose |
|----------|---------|
| `initDatabase()` | Create tables, run migrations, init web store |
| `listSaveSlots()` | Get all saves, ordered by most recent |
| `getSlotPreviews()` | Get saves with day count and inscription level for slot UI |
| `createSaveSlot(seed, name?)` | New save with seed |
| `deleteSaveSlot(slotId)` | Delete save and all associated data |
| `savePlayerState(slotId, data)` | Update player state |
| `loadPlayerState(slotId)` | Read player state |
| `saveVoxelDelta(slotId, x, y, z, blockId)` | Store single block change |
| `saveVoxelDeltasBatch(slotId, deltas)` | Batch store block changes |
| `loadVoxelDeltas(slotId)` | Read all block changes for a save |
| `clearVoxelDeltas(slotId)` | Remove all deltas (world reset) |
| `saveRuneFaces(slotId, entries)` | Replace all rune face inscriptions |
| `loadRuneFaces(slotId)` | Read all rune face inscriptions |
| `getSetting(key, defaultValue)` | Read a user setting |
| `setSetting(key, value)` | Write a user setting (upsert) |
| `loadAllSettings()` | Read all settings as a Record |
| `closeDatabase()` | Clean shutdown |
