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
  seed TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### player_state

```sql
CREATE TABLE player_state (
  slot_id INTEGER PRIMARY KEY REFERENCES save_slots(id) ON DELETE CASCADE,
  pos_x REAL, pos_y REAL, pos_z REAL,
  health REAL, hunger REAL, stamina REAL,
  quest_step INTEGER, quest_progress INTEGER,
  time_of_day REAL, day_count INTEGER,
  hotbar_json TEXT,
  inventory_json TEXT
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
```

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

The delta listener is registered by `enableVoxelDeltaTracking()` in game.ts and wired in App.tsx when a game session starts.

## Save/Load Flow

### New Game
```text
1. initGame(canvas, seed)         — Generate world, spawn ECS entities
2. createSaveSlot(seed)           — Insert save_slots + player_state rows
3. enableVoxelDeltaTracking()     — Wire delta listener
4. Auto-save every 60s            — savePlayerState() updates player_state row
```

### Continue Game
```text
1. listSaveSlots()                — Find most recent save
2. loadPlayerState(slotId)        — Read player_state row
3. initGame(canvas, slot.seed)    — Regenerate world from seed
4. loadVoxelDeltas(slotId)        — Read all voxel_deltas rows
5. applyVoxelDeltas(deltas)       — Apply deltas to live world
6. restorePlayerState(data)       — Write save data back to ECS
7. enableVoxelDeltaTracking()     — Wire delta listener for new changes
```

### Auto-Save
```text
setInterval(() => {
  readPlayerStateForSave()        — Read ECS state
  savePlayerState(slotId, data)   — UPDATE player_state row
}, 60_000)
```

## Web Platform Details

On web (`Capacitor.getPlatform() === "web"`):

1. `jeep-sqlite` web component is registered
2. `initWebStore()` initializes IndexedDB-backed storage
3. After every write, `persistWebStore()` flushes in-memory DB to IndexedDB
4. The `sql-wasm.wasm` file is served from `public/assets/`

## API Reference

| Function | Purpose |
|----------|---------|
| `initDatabase()` | Create tables, init web store |
| `listSaveSlots()` | Get all saves, ordered by most recent |
| `createSaveSlot(seed)` | New save with seed |
| `deleteSaveSlot(slotId)` | Delete save and all associated data |
| `savePlayerState(slotId, data)` | Update player state |
| `loadPlayerState(slotId)` | Read player state |
| `saveVoxelDelta(slotId, x, y, z, blockId)` | Store single block change |
| `saveVoxelDeltasBatch(slotId, deltas)` | Batch store block changes |
| `loadVoxelDeltas(slotId)` | Read all block changes for a save |
| `clearVoxelDeltas(slotId)` | Remove all deltas (world reset) |
| `closeDatabase()` | Clean shutdown |