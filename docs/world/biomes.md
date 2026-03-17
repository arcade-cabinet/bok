# Biomes and Terrain

## The Swedish Landscape as Game World

Bok's terrain is **Sweden compressed into a voxel world**. Every biome maps to a real Swedish landscape, with the building-block aesthetic making it feel like a handcrafted wooden diorama of the country. The player doesn't just explore generic fantasy terrain — they explore a place that feels like walking through a toy model of Scandinavia.

## Implemented Biomes

All 6 thematic biomes are implemented in `src/world/biomes.ts`. Each has a `BiomeId` enum value, surface rules, tree types, light multipliers, and biome-exclusive resources.

| Biome | ID | Surface | Subsurface | Ambient Light |
|-------|----|---------|------------|---------------|
| Ängen | 0 | Grass | Dirt (4 deep) | 1.0× |
| Bokskogen | 1 | Moss | Dirt (5 deep) | 0.85× |
| Fjällen | 2 | Snow / Ice (≥22) | Stone (2 deep) | 1.1× |
| Skärgården | 3 | Smooth Stone | Stone (3 deep) | 1.05× |
| Myren | 4 | Moss | Peat (4 deep) | 0.75× |
| Blothögen | 5 | Soot | Corrupted Stone (3 deep) | 0.25× (always dim) |

---

## Starting Zone — Ängen Guarantee

The 3×3 chunk area around origin (chunks −1..+1 on both axes, 48×48 blocks) is a **forced starting zone**. Implemented in `src/world/spawn-zone.ts`.

- **Biome**: Forced to Ängen regardless of temperature/moisture noise (`forceSpawnBiome`)
- **Terrain**: Flat plateau clamped to y=12 within 14 blocks of shrine center (gx=8, gz=8). Height variation ≤ 2 blocks via smooth ease-in lerp (`clampSpawnHeight`).
- **Trees**: Suppressed entirely within 8 blocks of shrine center (`isTreeSuppressed`). Reduced to 50% normal density in the rest of the spawn zone.
- **Landmarks**: No landmarks generated in spawn zone chunks (`generateChunkLandmarks` skips them).
- **Plateau repair**: `flattenSpawnPlateau` runs post-generation — removes floating blocks above surface + 2, fills gaps, ensures grass surface coverage.

---

## Biome Selection

Selection is done in `selectBiome(temperature, moisture)` in `src/world/biomes.ts`. Temperature is height-adjusted before selection: higher elevation subtracts up to 0.3 from raw temperature (`adjustTemperature`).

```
temperature < 0.33              → Fjällen
temperature 0.33–0.66, moisture < 0.5  → Bokskogen
temperature 0.33–0.66, moisture ≥ 0.5  → Myren
temperature ≥ 0.66, moisture < 0.5     → Ängen
temperature ≥ 0.66, moisture ≥ 0.5     → Skärgården
```

Blothögen is a **corruption overlay**, not a temperature/moisture cell. It overrides any biome when `isCorrupted(gx, gz)` returns true (checked before `selectBiome`):

```
noise(gx/80, gz/80) + edgeBias > 0.65
edgeBias = min(1, dist(origin)/500) × 0.2
```

Corruption is biased toward world edges — the further from origin, the more likely corruption.

### Biome Selection Matrix

```
                    Dry (moisture < 0.5)    Wet (moisture ≥ 0.5)
           ┌──────────────────────────┬──────────────────────────┐
    Cold   │  Fjällen                 │  Fjällen                 │
    < 0.33 │  (mountains)             │  (snow + lakes)          │
           ├──────────────────────────┼──────────────────────────┤
    Cool   │  Bokskogen               │  Myren                   │
  0.33–0.66│  (beech forest)          │  (mire/bog)              │
           ├──────────────────────────┼──────────────────────────┤
    Warm   │  Ängen                   │  Skärgården              │
    ≥ 0.66 │  (meadow)                │  (archipelago)           │
           └──────────────────────────┴──────────────────────────┘

Corruption overlay → Blothögen (distance-biased from origin, overrides any cell)
```

---

## Terrain Generation Architecture

```text
Seed → Simplex Noise → Height Map → Temperature/Moisture → Biome Selection → Block Placement → Feature Generation
```

Each chunk (16×16×32) is generated independently via `generateChunkTerrain` in `src/world/terrain-generator.ts`. The noise function is deterministic from the world seed.

### Noise Layers

| Layer | Scale | Offset | Purpose |
|-------|-------|--------|---------|
| Continental | 200 | 0 | Base elevation — meadows vs mountains |
| Erosion | 50 | 1000 | Surface roughness — smooth meadows vs craggy mountains |
| Temperature | 150 | 2000 | Biome selection axis 1 (height-adjusted) |
| Moisture | 120 | 3000 | Biome selection axis 2 |
| Island | 30 | 4000 | Skärgården island shapes |
| Corruption | 80 | 5000 | Blothögen overlay |
| Cave | 30 | — | 3D noise for underground caverns (separate pass) |

### Height Calculation

```
base = continental × 16 + 4
detail = (erosion − 0.5) × 8
h = clamp(floor(base + detail), 1, 27)
```

Biome height adjustments (`adjustBiomeHeight`):
- **Skärgården**: Island noise > 0.6 → raise above water level; otherwise sink 2 below water
- **Myren**: Compress toward water level (20% of raw height above water)

---

## Biome Details

### Ängen (The Meadow) — Starting Biome

*Swedish summer meadows: wildflowers, scattered birch, gentle streams.*

The safe zone. Rolling grass terrain with scattered björk (birch) trees. The spawn stenhög (stone cairn) sits here with torches and a runestone inscribed with ᚱ (Raido — journey).

- **Trees**: Birch and occasional pine. Tree density 3% (`treeSpawnRate`).
- **Ground features**: Wildflower blocks (8% chance above water)
- **Creatures**: Lyktgubbar at twilight, Skogssniglar grazing, Tranor near streams
- **Resources**: `Grass`, `Wildflower`
- **Threats**: Morker at night (mild spawn rate), nothing during day
- **Feel**: Safe, pastoral, inviting. Like a koloniträdgård — small, tended, yours.

### Bokskogen (The Beech Forest) — Temperate Forest

*Named for Sweden's famous beech forests (Skåne region). Dense, cathedral-like canopy.*

Dense forest with towering bok (beech) trees. Moss-covered boulders. Mushroom blocks on fallen logs. Fornlämningar half-swallowed by roots.

- **Trees**: Beech and pine. Tree density 7% — densest biome.
- **Ground features**: Mushroom blocks (8% chance above water)
- **Creatures**: Skogssniglar (abundant), Vittra (near mounds), Runvaktare (at ruins)
- **Resources**: `Moss`, `Mushroom`
- **Threats**: Vittra debuffs if careless, Runvaktare if you raid ruins, Morker at night (denser)
- **Landmarks**: Fornlämningar (ancient stone foundations, runestones), Viking-age burial mounds
- **Feel**: Ancient, reverent, dense. Like walking through a medieval Swedish church made of trees.

### Fjällen (The Mountains) — Alpine

*Sweden's mountain range along the Norwegian border. Bare rock, wind, arctic conditions.*

High elevation terrain with exposed stone, thin snow cover, no trees above tree line (y≥18). Ice replaces snow above y=22.

- **Trees**: Spruce and pine. Tree density 2%. Suppressed entirely at or above tree line (y=18).
- **Surface**: Snow below y=22, Ice at y=22+
- **Creatures**: Draugar (at burial cairns), Lindormar (in mountain caves), Tranor (at lakes, summer only)
- **Resources**: `Snow`, `Ice`
- **Threats**: Draugar, altitude (no shelter bonuses without walls+roof)
- **Landmarks**: Fjällstuga ruins (mountain hut foundations), summit cairns with runestones
- **Feel**: Exposed, magnificent, dangerous. Like standing on Kebnekaise.

### Skärgården (The Archipelago) — Coastal/Island

*Sweden's archipelago coast: thousands of rocky islands, smooth granite, pine clusters.*

Scattered islands of smooth stone and sparse pine trees in cold blue water. Islands shaped by island noise — above 0.6 forms land, below sinks 2 under water level.

- **Trees**: Pine only. Tree density 2%.
- **Surface**: Smooth Stone (no sand)
- **Creatures**: Nacken (on rocks at water's edge), Tranor (wading between islands), Lyktgubbar (over water at night)
- **Resources**: `SmoothStone`
- **Threats**: Water (drowning), Nacken disorientation, Morker over open water
- **Landmarks**: Sjömärke (sea markers — tall stone pillars on island tips), sunken ruins
- **Feel**: Isolated, beautiful, meditative. Like kayaking through the Stockholm archipelago.

### Myren (The Mire) — Wetland/Bog

*Swedish mires and bogs: waterlogged terrain, carnivorous plants, preserved ancient things.*

Low, flat terrain saturated with water. Height compressed to 20% above water level. Sphagnum moss surface. Standing water everywhere.

- **Trees**: Pine only. Tree density 2%.
- **Ground features**: Cranberry blocks (10% chance above water)
- **Creatures**: Lyktgubbar (blue-shifted, leading astray), Vittra (abundant), Skogssniglar (largest variants)
- **Resources**: `Peat`, `Cranberry`
- **Threats**: Disorientation (flat terrain, no landmarks), Vittra debuffs, sinking (soft blocks)
- **Landmarks**: Offerkälla (offering springs — stone-lined pools where offerings appease Vittra)
- **Feel**: Eerie, flat, ancient. Like walking through a Swedish myr where Viking-age sacrifices still surface.

### Blothögen (The Blot Mound) — Corrupted Zone

*"Blot" was the Norse sacrificial ritual. This is where the old saga went wrong.*

Terrain tainted by the saga's unraveling — dark-tinted blocks, always dim (0.25× ambient light). Dead birch trees (no leaves). Morker active without day/night restriction.

- **Trees**: Dead birch only.
- **Surface**: Soot blocks (black)
- **Creatures**: Morker (always active, larger), Draugar (always active), Lindormar (corrupted — black)
- **Resources**: `Soot`, `CorruptedStone`
- **Threats**: Everything. This biome is the endgame zone.
- **Landmarks**: Blotsten (sacrificial stones), the deepest Fornlämningar
- **Feel**: Dread. The saga failed here.

---

## Landmarks

Procedurally placed structures (`src/world/landmark-generator.ts`):

- **Stenhögar** (Stone cairns): Small stone stacks on hilltops. Navigation aids visible from 2-3 chunks away.
- **Runstenar** (Runestones): Tall stone blocks inscribed with runes. Readable lore. Fast-travel anchors.
- **Fornlämningar** (Ancient remains): Stone foundations, partial walls, burial mounds. Contain lore, materials, creature dens, crafting stations.
- **Fjällstugor** (Mountain huts): Small shelter structures in alpine terrain. Pre-built shelter.
- **Kolmilor** (Charcoal kilns): Round stone structures in Bokskogen. Workstations for smelting.
- **Offerkällor** (Offering springs): Stone-lined pools in Myren. Appease Vittra.
- **Sjömärken** (Sea markers): Tall stone pillars on island tips. Navigation for Skärgården.

---

## Trees

| Tree | Biome | Trunk | Canopy | Height |
|------|-------|-------|--------|--------|
| **Björk** (Birch) | Ängen | White bark (2 wide) | Light green, irregular (5×5) | 6-8 |
| **Bok** (Beech) | Bokskogen | Thick brown (3 wide) | Dense dark green (7×7) | 8-12 |
| **Tall** (Pine) | All except Myren primary | Thin dark brown | Triangular layers (3×3, 5×5) | 8-10 |
| **Gran** (Spruce) | Fjällen | Dark brown | Dense narrow (3×3, dark) | 6-8 |
| **Död björk** (Dead birch) | Blothögen | White bark, no leaves | None | 5-7 |

---

## Underground — Berget (The Mountain Inside)

Below the surface lies **Berget** — the mountain's interior. In Swedish folklore, trolls and vittra live inside mountains. The underground is their domain.

- **Grottor** (Caves): 3D noise carving (`src/world/cave-generator.ts`). Connected networks with Vittra warrens.
- **Malmåder** (Ore veins): Iron (5-15 deep), copper (10-20), crystal (20+). Visible as color-distinct blocks in cave walls.
- **Underjord** (The Underworld): Deepest caves contain the most intact Fornlämningar. Draugar territory.
- **Vattenfall** (Underground waterfalls): Water flowing through cave systems.
