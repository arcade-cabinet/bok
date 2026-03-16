# Structure Recognition Architecture

## The Problem

Blocks are atoms. Gameplay happens at the molecule level. When the player arranges blocks into patterns, the game must recognize those patterns and grant them **purpose** — a forge smelts, a shelter protects, a rune ward repels. This document defines how composites of blocks become functional structures.

## Two Kinds of Composites

### 1. Workstations (Pattern-Matched)

A workstation is a small, specific arrangement of blocks that the game recognizes as a functional entity. The player builds it from blocks; the game detects the pattern and activates it.

**Examples:**
- **Crafting Bench (Hyvelbänk)**: 4 Planks in a 2×2 square
- **Forge (Städ)**: 3×3 Stone Bricks base + Torch on center top
- **Scriptorium (Skrivbord)**: Planks base + Glass top + Torch adjacent
- **Charcoal Kiln (Kolmila)**: Hollow ring of Stone (3×3×3 with center column empty, fire block inside)

### 2. Structures (Volume-Based)

A structure is an enclosed or semi-enclosed space that provides passive bonuses. Detection is based on volume analysis, not exact block patterns.

**Examples:**
- **Shelter (Stuga)**: Enclosed air volume with walls + roof → hunger/stamina bonus
- **Territory**: Contiguous player-placed block cluster → creature spawn influence
- **Light Perimeter**: Torch/lantern radius union → Mörker exclusion zone

## Architecture

### Structure Registry — Pattern Definitions

```typescript
interface StructurePattern {
  id: string;                    // "forge", "crafting_bench", "scriptorium"
  name: string;                  // "Städ (Forge)"
  /** 3D block pattern relative to an anchor point */
  pattern: PatternVoxel[];
  /** What this structure does when active */
  effect: StructureEffect;
  /** Optional: which block triggers detection (e.g., the last block placed) */
  triggerBlock?: BlockIdValue;
}

interface PatternVoxel {
  dx: number;  // offset from anchor
  dy: number;
  dz: number;
  blockId: BlockIdValue | BlockIdValue[];  // exact match or any-of
  optional?: boolean;                       // pattern still matches without this
}

type StructureEffect =
  | { type: "workstation"; tier: number; recipes: string[] }
  | { type: "shelter"; hungerMod: number; staminaMod: number }
  | { type: "ward"; creatureType: string; radius: number }
  | { type: "landmark"; function: "fast_travel" | "lore" | "offering" };
```

### Detection Strategy

**When to check:** Not every frame. Only when a block is placed or removed.

```
Player places block at (x, y, z)
  → structureDetectionSystem runs
    → For each registered pattern whose triggerBlock matches:
      → Try all rotations (0°, 90°, 180°, 270° around Y)
      → For each rotation, check if pattern matches at (x, y, z) as anchor
      → If match found:
        → Spawn Structure ECS entity at anchor position
        → Apply visual feedback (particle burst, rune glow)
        → Register in structure spatial index
    → Also check if a removed block breaks an existing structure
```

**Key constraint:** Patterns are small (3×3×3 max for workstations). Checking a dozen patterns against 27 blocks on block-place is trivially fast. No spatial hash needed for detection — it's O(patterns × rotation × pattern_size) per block event.

### ECS Representation

Structures are **ECS entities**, not block metadata. They reference world positions but live in the entity system:

```typescript
// New traits
export const StructureTag = trait();

export const StructureState = trait({
  patternId: "",        // references StructurePattern.id
  anchorX: 0,           // world position of anchor block
  anchorY: 0,
  anchorZ: 0,
  rotation: 0,          // 0, 1, 2, 3 (× 90°)
  active: true,         // false if a component block was removed
  integrity: 1.0,       // for decay system (1.0 = pristine, 0 = collapsed)
});
```

When the player is near a workstation structure entity, the crafting system unlocks that tier's recipes. When a structure's component block is removed, the entity deactivates (or is destroyed if critical block removed).

### Shelter Detection (Volume-Based)

Shelters are NOT pattern-matched — they're detected by **enclosed volume analysis**:

```
1. Player enters a position surrounded by player-placed blocks
2. Flood-fill from player position outward through air blocks
3. If flood-fill is contained (hits solid blocks on all sides within MAX_SHELTER_SIZE):
   → Player is "sheltered"
   → Apply bonuses (hunger decay ×0.5, stamina regen ×1.5)
4. If flood-fill escapes (reaches open air or exceeds limit):
   → Not sheltered
```

**When to check:** Periodically (every ~2 seconds), not per-frame. Cache result until player moves more than 2 blocks or a nearby block changes.

### Persistence

Structures persist through the existing delta system — the blocks that compose them are already saved as voxel deltas. On world load:

1. Terrain regenerated from seed
2. Voxel deltas applied (player blocks restored)
3. **Structure detection runs on all player-placed blocks** to rebuild structure entities

This means structures are **derived state** — they're recomputed from block layout, never stored independently. This is simpler and more robust than serializing structure entities.

**Alternative (optimization):** For large worlds, scanning all deltas on load could be slow. Store structure entities in a `structures` table:

```sql
CREATE TABLE structures (
  slot_id INTEGER NOT NULL REFERENCES save_slots(id) ON DELETE CASCADE,
  pattern_id TEXT NOT NULL,
  anchor_x INTEGER NOT NULL,
  anchor_y INTEGER NOT NULL,
  anchor_z INTEGER NOT NULL,
  rotation INTEGER NOT NULL DEFAULT 0,
  integrity REAL NOT NULL DEFAULT 1.0,
  PRIMARY KEY (slot_id, anchor_x, anchor_y, anchor_z)
);
```

Then on load, validate each stored structure still has its blocks intact (fast — just check pattern voxels) rather than re-scanning everything.

## Workstation Definitions

### Tier 0 — Hand Crafting
No structure needed. Available anywhere. Limited recipes (planks, torches, basic tools).

### Tier 1 — Hyvelbänk (Crafting Bench)
```
Pattern (2×1×2):
  Planks  Planks
  Planks  Planks
```
Unlocks: Improved tools, building materials, basic furniture.

### Tier 2 — Städ (Forge)
```
Pattern (3×2×3):
Layer y=0 (base):
  StoneBricks  StoneBricks  StoneBricks
  StoneBricks  StoneBricks  StoneBricks
  StoneBricks  StoneBricks  StoneBricks
Layer y=1 (top):
  (air)        (air)        (air)
  (air)        Torch        (air)
  (air)        (air)        (air)
```
Unlocks: Metal tools, lanterns, smelted materials.

### Tier 3 — Skrivbord (Scriptorium)
```
Pattern (3×2×1):
Layer y=0:
  Planks  Planks  Planks
Layer y=1:
  Glass   Glass   Glass
Adjacent Torch required (any side).
```
Unlocks: Knowledge items, Bok upgrades, enchanting.

## Territory System

Territory is not a structure — it's a **continuous field** computed from player-placed block density:

```
territory_strength(x, z) = Σ (1 / (1 + distance²))
  for all player-placed blocks within TERRITORY_RADIUS
```

This produces a smooth falloff field. Where `territory_strength > threshold`:
- Passive creatures may be attracted
- Hostile spawn rates reduced (scaled by strength)
- Mörker spawn radius pushed outward
- Light sources amplified

Territory is computed lazily (only around the player) and cached per-chunk.

## Light Zones

Each light-emitting block (Torch, Lantern, Ember Lantern, Glyph Lamp) defines a spherical zone of influence:

| Source | Radius | Effect |
|--------|--------|--------|
| Torch | 4 blocks | Mörker avoidance, mining visibility |
| Lantern | 8 blocks | Mörker avoidance, creature calming |
| Ember Lantern | 12 blocks | Mörker damage, strong avoidance |
| Glyph Lamp | 20 blocks | Mörker exclusion, Lyktgubbe attraction |

Light zones affect creature AI pathfinding: Mörker won't path through lit zones, Lyktgubbar are attracted to glyph lamp zones.

Computed by maintaining a spatial index of light-emitting blocks (updated on place/remove) and querying during creature AI updates.

## Decay System

Unvisited structures slowly lose integrity:

```
integrity -= DECAY_RATE * dt  (when player is > DECAY_DISTANCE away)
integrity = min(1.0, integrity + REPAIR_RATE * dt)  (when player is nearby)
```

At integrity thresholds:
- 0.8: Moss blocks start appearing on surfaces
- 0.5: Some blocks replaced with cracked variants
- 0.2: Structure deactivates (workstation stops working)
- 0.0: Structure collapses (blocks replaced with rubble/moss)

**Runsten Seal** (Jätten boss drop): Structures within radius of a placed Runsten Seal never decay. Your saga endures.

## Rune Wards

Rune wards are a special structure type — a single Runestone block inscribed with a rune:

- **ᛉ Algiz (Protection)**: Hostile creatures won't enter 10-block radius
- **ᚱ Raido (Journey)**: Fast-travel anchor when activated from the Kartan
- **ᚲ Kenaz (Craft)**: Workstations within 5 blocks operate at +50% speed
- **ᛗ Mannaz (Humanity)**: Neutral creatures within 10 blocks become friendly

Wards are structure entities with a single-block pattern and a rune-specific effect.

## Implementation Order

1. **StructurePattern registry + detection on block place/remove** — core system
2. **Crafting Bench pattern** — simplest workstation, proves the system
3. **Shelter detection** — volume-based, independent of patterns
4. **Forge + Scriptorium patterns** — more complex patterns
5. **Territory field** — density computation
6. **Light zones** — spatial index of emitters
7. **Decay** — integrity over time
8. **Rune wards** — single-block special structures
9. **Persistence table** — optimize load times for large worlds
