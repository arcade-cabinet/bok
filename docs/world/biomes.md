# Biomes and Terrain

## The Swedish Landscape as Game World

Bok's terrain is **Sweden compressed into a voxel world**. Every biome maps to a real Swedish landscape, with the building-block aesthetic making it feel like a handcrafted wooden diorama of the country. The player doesn't just explore generic fantasy terrain — they explore a place that feels like walking through a toy model of Scandinavia.

## Current Biomes

| Biome | Condition | Surface | Subsurface | Features |
|-------|-----------|---------|------------|----------|
| Plains | Height 11-20 | Grass | Dirt (4 deep) → Stone | Trees |
| Beach | Height 9-11 | Sand | Sand → Stone | Near water |
| Mountains | Height > 21 | Snow | Stone | High elevation |
| Ocean | Height < 10 | Water | Sand → Stone | Water fill |

## Planned Biomes

### Ängen (The Meadow) — Starting Biome
*Swedish summer meadows: wildflowers, scattered birch, gentle streams.*

The safe zone. Rolling grass terrain with scattered **björk** (birch) trees — white-barked trunks with light green canopy blocks. Wildflower blocks (small color accents on grass). Shallow streams with smooth stone beds. The spawn **stenhög** (stone cairn) sits here with torches and a runestone inscribed with ᚱ (Raido — journey).

- **Trees**: Birch (white bark blocks, light canopy) and occasional pine (dark bark, triangular canopy)
- **Creatures**: Lyktgubbar at twilight, Skogssniglar grazing, Tranor near streams
- **Resources**: Wood (birch), stone, grass, wildflowers
- **Threats**: Mörker at night (mild spawn rate), nothing during day
- **Feel**: Safe, pastoral, inviting. The player learns here. Like a **koloniträdgård** (allotment garden) — small, tended, yours.

### Bokskogen (The Beech Forest) — Temperate Forest
*Named for Sweden's famous beech forests (Skåne region). Dense, cathedral-like canopy.*

Dense forest with towering **bok** (beech) trees — thick trunks, broad canopy creating a dark forest floor. Moss-covered boulders. Mushroom blocks growing on fallen logs. Fornlämningar (ruins) half-swallowed by roots. Binding webs between trunks. The light filters through in golden shafts.

- **Trees**: Beech (thick brown bark, dense wide canopy — 7x7 leaf spread) and oak (gnarled, shorter)
- **Ground cover**: Moss blocks, mushroom blocks, fallen log blocks
- **Creatures**: Skogssniglar (abundant), Vittra (near mounds), Runväktare (at ruins)
- **Resources**: Hardwood (beech — stronger than birch), moss, mushrooms, runsten fragments
- **Threats**: Vittra debuffs if careless, Runväktare if you raid ruins, Mörker at night (denser)
- **Landmarks**: Fornlämningar (ancient stone foundations, runestones), Viking-age burial mounds (low grass-covered hills with stone entry)
- **Feel**: Ancient, reverent, dense. Like walking through a medieval Swedish church made of trees. You can expand here, but the forest pushes back.

### Fjällen (The Mountains) — Alpine
*Sweden's mountain range along the Norwegian border. Bare rock, wind, arctic conditions.*

High elevation terrain with exposed stone, thin snow cover, and no trees above the tree line. Deep valleys with fast-running water (ice-blue). Mountain lakes (**fjällsjöar**) with perfectly still water. The air is thin — stamina drains faster. But the view is unmatched, and rare ores are exposed in cliff faces.

- **Surface**: Snow blocks, bare stone, ice blocks (transparent, slippery physics)
- **Features**: Cliff faces (vertical stone), mountain lakes, cave entrances, exposed ore veins
- **Creatures**: Draugar (at burial cairns), Lindormar (in mountain caves), Tranor (at lakes, summer only)
- **Resources**: Iron ore, copper ore, crystal, mountain stone (harder, better tools)
- **Threats**: Cold exposure (future mechanic — hunger drains faster), Draugar, altitude (no shelter bonuses without walls+roof)
- **Landmarks**: **Fjällstuga** ruins (mountain hut foundations), summit cairns with runestones
- **Feel**: Exposed, magnificent, dangerous. Rewards the explorer who prepares. Like standing on Kebnekaise and seeing the world spread below.

### Skärgården (The Archipelago) — Coastal/Island
*Sweden's archipelago coast: thousands of rocky islands, smooth granite, pine clusters, cold clear water.*

Scattered islands of smooth stone and sparse pine trees in cold blue water. Rocky shores without sand — the stone slides directly into the sea. Each island is small (1-3 chunks) but may contain unique resources or a Näcken encounter. Boat/raft required for efficient travel (future mechanic).

- **Surface**: Smooth stone blocks (rounded-looking), sparse grass, gnarled pine trees
- **Water**: Deep blue, clear. Fish visible (ambient, not yet harvestable)
- **Creatures**: Näcken (on rocks at water's edge), Tranor (wading between islands), Lyktgubbar (over water at night)
- **Resources**: Smooth stone (decorative), driftwood, seaweed (food), fish (future)
- **Threats**: Water (drowning if stamina runs out while swimming), Näcken disorientation, Mörker over open water
- **Landmarks**: **Sjömärke** (sea markers — tall stone pillars on island tips), sunken ruins visible through water
- **Feel**: Isolated, beautiful, meditative. The **allemansrätten** made real — every island is yours to visit. Like kayaking through the Stockholm archipelago.

### Myren (The Mire) — Wetland/Bog
*Swedish mires and bogs: waterlogged terrain, carnivorous plants, preserved ancient things.*

Low, flat terrain saturated with water. Sphagnum moss blocks (bouncy physics — the player bounces slightly). Standing water everywhere, rarely deeper than 2 blocks. **Mossljus** (bog lights) — Lyktgubbar in blue-shift, leading travelers astray. The ground preserves — ancient structures are more intact here, preserved in the peat.

- **Surface**: Moss blocks (green-brown), peat blocks (dark brown, harvestable fuel), shallow water
- **Features**: Preserved Fornlämningar (most intact ruins), cranberry bushes (food), ancient trees preserved in peat
- **Creatures**: Lyktgubbar (blue-shifted, leading astray), Vittra (abundant — this is their homeland), Skogssniglar (largest variants)
- **Resources**: Peat (fuel), bog iron (unique resource), preserved wood (ancient hardwood), cranberries
- **Threats**: Disorientation (flat terrain, no landmarks), Vittra debuffs, sinking (soft blocks give way under weight)
- **Landmarks**: **Offerkälla** (offering springs — stone-lined pools where offerings appease Vittra)
- **Feel**: Eerie, flat, ancient. Time moves differently here. Like walking through a Swedish *myr* where Viking-age sacrifices still surface from the peat.

### Blothögen (The Blot Mound) — Corrupted Zone
*"Blot" was the Norse sacrificial ritual. This is where the old saga went wrong.*

Terrain tainted by the saga's unraveling — dark-tinted blocks, inverted day/night behavior (darker during day, slightly lit at night). The trees are **dead birch** — white bark blocks with no leaves, standing like bones. The ground is **sot** (soot) — black terrain blocks. Mörker are native here with no day/night restriction.

- **Surface**: Soot blocks (black), dead wood, corrupted stone (dark purple-grey)
- **Features**: Inverted lighting, permanent fog, ruined stone circles
- **Creatures**: Mörker (always active, larger), Draugar (always active), Lindormar (corrupted — black instead of pale)
- **Resources**: Sot (crafting material for ink), corrupted crystal (enchanting), shadow essence (mörker drops)
- **Threats**: Everything. This biome is the endgame zone. The inscription level here is naturally maxed.
- **Landmarks**: **Blotsten** (sacrificial stones — large flat blocks stained dark), the deepest Fornlämningar
- **Feel**: Dread. The saga failed here. This is what happens when writing goes wrong. Like finding a burned stave church in a dead forest.

## Terrain Generation Architecture

```text
Seed → Simplex Noise → Height Map → Temperature/Moisture → Biome Selection → Block Placement → Feature Generation
```

Each chunk (16x16x32) is generated independently. The noise function is deterministic from the seed.

### Noise Layers

| Layer | Scale | Purpose |
|-------|-------|---------|
| Continental | 200 | Base elevation — meadows vs mountains |
| Erosion | 50 | Surface roughness — smooth meadows vs craggy mountains |
| Temperature | 150 | North = cold (fjällen, snow), South = warm (ängen, bokskogen) |
| Moisture | 120 | East = dry (exposed stone), West = wet (myren, skärgården) |
| Cave | 30 | 3D noise for underground caverns |
| Ore | 15 | 3D noise for mineral deposits (depth-dependent) |

### Biome Selection

```text
                    Dry                          Wet
           ┌─────────────────────┬─────────────────────┐
    Cold   │     Fjällen         │     Fjällen          │
           │     (mountains)     │     (snow + lakes)   │
           ├─────────────────────┼─────────────────────┤
    Cool   │     Bokskogen       │     Myren            │
           │     (beech forest)  │     (mire/bog)       │
           ├─────────────────────┼─────────────────────┤
    Warm   │     Ängen           │     Skärgården       │
           │     (meadow)        │     (archipelago)    │
           └─────────────────────┴─────────────────────┘
```

Blothögen generates independently — seeded corruption zones in any biome, biased toward world edges.

## Landmarks

Procedurally placed structures that make each world feel like Sweden:

- **Stenhögar** (Stone cairns): Small stone stacks on hilltops. Navigation aids visible from 2-3 chunks away. Mark biome boundaries.
- **Runstenar** (Runestones): Tall stone blocks inscribed with runes. Readable lore. Fast-travel anchors when inscribed by the player (ᚱ Raido rune).
- **Fornlämningar** (Ancient remains): Stone foundations, partial walls, burial mounds. Contain lore, materials, creature dens, crafting stations.
- **Fjällstugor** (Mountain huts): Small shelter structures in alpine terrain. Pre-built shelter. Contain basic supplies.
- **Kolmilor** (Charcoal kilns): Round stone structures. Workstations for smelting. Found in Bokskogen.
- **Offerkällor** (Offering springs): Stone-lined pools. Appease Vittra. Found in Myren.
- **Sjömärken** (Sea markers): Tall stone pillars on island tips. Navigation for Skärgården.

## Trees

Trees are a major visual element and vary by biome:

| Tree | Biome | Trunk | Canopy | Height |
|------|-------|-------|--------|--------|
| **Björk** (Birch) | Ängen | White bark (2 wide) | Light green, irregular (5x5) | 6-8 |
| **Bok** (Beech) | Bokskogen | Thick brown (3 wide) | Dense dark green (7x7) | 8-12 |
| **Tall** (Pine) | All except Myren | Thin dark brown | Triangular layers (3x3, 5x5) | 8-10 |
| **Gran** (Spruce) | Fjällen edge | Dark brown | Dense narrow (3x3, dark) | 6-8 |
| **Död björk** (Dead birch) | Blothögen | White bark, no leaves | None | 5-7 |

## Underground — Berget (The Mountain Inside)

Below the surface lies **Berget** — the mountain's interior. In Swedish folklore, trolls and vittra live inside mountains. The underground is their domain.

- **Grottor** (Caves): 3D noise carving. Connected networks with Vittra warrens.
- **Malmåder** (Ore veins): Iron (5-15 deep), copper (10-20), crystal (20+). Visible as color-distinct blocks in cave walls.
- **Underjord** (The Underworld): Deepest caves contain the most intact Fornlämningar — the old saga's foundation, preserved underground. Draugar territory.
- **Vattenfall** (Underground waterfalls): Water flowing through cave systems. Beautiful, dangerous, acoustically rich.