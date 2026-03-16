# Bok — Comprehensive Implementation Plan

> From POC to Swedish folklore 4X voxel survival game.

## Current State (Baseline)

| Category | Count | Details |
|----------|-------|---------|
| ECS Systems | 7 | movement, physics, survival, quest, time, enemy, mining |
| ECS Traits | 17 | Player (15), World (2), Enemy (2) |
| Behaviors | 6 | BlockHighlight, AmbientParticles, Celestial, Particles, ViewModel, EnemyRenderer |
| Block Types | 13 | Air, Grass, Dirt, Stone, Wood, Leaves, Planks, Water, Torch, Sand, Snow, StoneBricks, Glass |
| Items | 4 | Wood Axe, Wood Pickaxe, Stone Pickaxe, Stone Sword |
| Recipes | 8 | Basic hand-craft recipes |
| Biomes | 1 | Height-based grass/sand/snow (no distinct biomes) |
| Creatures | 1 | Generic box enemy (Mörker placeholder) |
| Persistence | 3 tables | save_slots, player_state, voxel_deltas |
| UI | 2 screens + 8 HUD + 1 menu | Title, Death, Crosshair, Vitals, Hotbar, Quest, Time, Underwater, DamageVignette, MobileControls, CraftingMenu |

## Vision Gap

Everything documented in `docs/` but not yet in code:

- **11 creature types** from Swedish folklore (only generic box enemy exists)
- **6 distinct biomes** with noise-based selection (only height-based terrain exists)
- **Multi-part building-block creatures** with procedural animation (only box mesh)
- **The Bok** — diegetic journal UI with Atlas, Ledger, Kunskapen, Saga pages
- **Workstation crafting** — physical stations in world, recipe discovery
- **Tool durability**, armor, food/farming systems
- **Inscription level** — world pushback proportional to player activity
- **Landmarks** — Fornlämningar, runstenar, stenhögar, offerkällor
- **Underground** — cave generation, ore veins, depth layers
- **Rune system** — Elder Futhark for fast travel, protection, light
- **Structure recognition** — enclosed spaces, shelter bonuses
- **Territory & decay** — player builds attract/repel creatures, decay over time
- **Seasons/weather** — visual + mechanical progression
- **Boss encounter** — Jätten endgame event

---

## Phase 0 — Foundation Hardening
**Goal**: Solid base for everything that follows. No new gameplay, just infrastructure.
**Estimated scope**: ~15 systems/files touched

### 0.1 — Creature Entity Framework
Generalize the enemy system into a creature framework that supports multiple species with different behaviors.

- [ ] **New trait: `CreatureType`** — species enum (Morker, Lyktgubbe, Skogssnigle, Trana, Vittra, Nacken, Runvaktare, Lindorm, Draug, Jatten, Norrsken)
- [ ] **New trait: `CreatureAI`** — aiType (passive/neutral/hostile/boss), behaviorState, targetEntity, aggroRange, attackRange, attackDamage, attackCooldown, moveSpeed, detectionRange
- [ ] **New trait: `CreatureAnimation`** — animState (idle/walk/chase/attack/flee/burn), animTimer, variant (size/color offsets)
- [ ] **Refactor `enemySystem` → `creatureSystem`** — dispatch AI based on CreatureType, support passive/neutral/hostile behavior trees
- [ ] **Refactor `EnemyRendererBehavior` → `CreatureRendererBehavior`** — dispatch mesh construction based on CreatureType, support multi-part geometry
- [ ] **Side-effect interface update** — `CreatureSideEffects` replacing `EnemySideEffects`

**Dependencies**: None
**Files**: `src/ecs/traits/index.ts`, `src/ecs/systems/enemy.ts` → `creature.ts`, `src/engine/behaviors/EnemyRendererBehavior.ts` → `CreatureRendererBehavior.ts`, `src/engine/game.ts`

### 0.2 — Biome Noise Infrastructure
Replace height-only terrain with multi-noise biome selection per `docs/world/biomes.md`.

- [ ] **Multi-layer noise** in `terrain-generator.ts`: continental (200), erosion (50), temperature (150), moisture (120)
- [ ] **Biome selection function**: temperature × moisture → biome enum (Angen, Bokskogen, Fjallen, Skargarden, Myren, Blothogen)
- [ ] **Per-biome surface rules**: surface block, subsurface, depth, water behavior
- [ ] **Per-biome tree types**: birch (Ängen), beech (Bokskogen), pine (all), spruce (Fjällen edge), dead birch (Blothögen)
- [ ] **Biome blend at boundaries**: 8-block transition zones with weighted block selection

**Dependencies**: None
**Files**: `src/world/terrain-generator.ts`, `src/world/noise.ts`

### 0.3 — New Block Types for Biomes
Add blocks needed by the biome system before biomes can render.

- [ ] **New blocks**: BirchWood, BirchLeaves, BeechWood, BeechLeaves, PineWood, PineLeaves, SpruceLeaves, DeadWood, Moss, Mushroom, Peat, Ice, SmoothStone, Soot, CorruptedStone, IronOre, CopperOre, Crystal
- [ ] **New textures** in `tileset-generator.ts` for each block (expand grid to 8×4 or 8×5)
- [ ] **Block properties**: hardness, color, transparency, special physics (ice = slippery, peat = bouncy, moss = soft)
- [ ] **Update `Inventory` trait** to handle new resource types (switch from named fields to `Record<BlockId, number>`)

**Dependencies**: 0.2 (biomes need these blocks)
**Files**: `src/world/blocks.ts`, `src/world/tileset-generator.ts`, `src/ecs/traits/index.ts`

### 0.4 — Inventory Refactor
The current Inventory trait has hardcoded fields per resource. This won't scale.

- [ ] **Inventory as `Map<number, number>`** (blockId/itemId → count) instead of named fields
- [ ] **Update all consumers**: CraftingMenu, HotbarDisplay, miningSystem, questSystem, save/load
- [ ] **Inventory capacity limit** (future-proofing for the Bok's Ledger page)
- [ ] **Persist as JSON map** in `inventory_json`

**Dependencies**: 0.3 (new block types need flexible inventory)
**Files**: `src/ecs/traits/index.ts`, `src/ui/hud/HotbarDisplay.tsx`, `src/ui/components/CraftingMenu.tsx`, `src/ecs/systems/mining.ts`, `src/ecs/systems/quest.ts`, `src/persistence/db.ts`, `src/App.tsx`

---

## Phase 1 — The Swedish Landscape
**Goal**: Walk through Sweden. Six biomes, trees, landmarks, underground.

### 1.1 — Biome Generation (Wire Up)
Activate the biome infrastructure from Phase 0.

- [ ] **Ängen** (meadow): rolling grass, birch trees (white bark, light canopy), wildflower accents, gentle terrain
- [ ] **Bokskogen** (beech forest): dense beech trees (thick trunk, 7×7 canopy), moss floor, mushroom blocks, darker ambient
- [ ] **Fjällen** (mountains): high elevation, exposed stone, snow cap, ice blocks, cave entrances, no trees above tree line
- [ ] **Skärgården** (archipelago): island clusters in deep water, smooth stone shores, sparse pine, kelp
- [ ] **Myren** (bog): flat waterlogged terrain, peat, moss, shallow pools, cranberry bushes
- [ ] **Blothögen** (corrupted): soot ground, dead birch, corrupted stone, inverted lighting tint

**Dependencies**: 0.2, 0.3
**Files**: `src/world/terrain-generator.ts`

### 1.2 — Underground & Caves
3D noise carving for cave systems + ore veins at depth.

- [ ] **Cave noise layer** (scale 30): 3D simplex, carve where value > threshold
- [ ] **Ore placement**: iron (y 5-15), copper (y 10-20), crystal (y 20+) — cluster generation
- [ ] **Cave lighting**: ambient darkness, torch requirement, future light propagation
- [ ] **Underground water**: pools and falls at cave intersections

**Dependencies**: 0.3 (ore blocks)
**Files**: `src/world/terrain-generator.ts`, `src/world/noise.ts`

### 1.3 — Landmarks
Procedural structure placement to make the world feel like Sweden.

- [ ] **Stenhögar** (cairns): stone stacks on hilltops, 3-5 blocks tall, mark biome boundaries
- [ ] **Runstenar** (runestones): tall inscribed stone blocks, readable, future fast-travel anchor
- [ ] **Fornlämningar** (ruins): stone foundations (5×5 to 15×15), partial walls, loot containers
- [ ] **Spawn shrine upgrade**: replace generic stone platform with a stenhög + runestone + torches
- [ ] **Biome-specific landmarks**: Kolmilor in Bokskogen, Offerkällor in Myren, Sjömärken in Skärgården, Fjällstugor in Fjällen

**Dependencies**: 1.1 (biomes determine landmark placement)
**Files**: `src/world/terrain-generator.ts` (or new `src/world/structures.ts`)

### 1.4 — Tileset Polish
Ensure all new blocks have textures that match the art direction.

- [ ] **Swedish palette compliance**: all textures use colors from `docs/design/art-direction.md`
- [ ] **Wood grain detail**: birch (white, horizontal lenticels), beech (smooth grey-brown), pine (dark vertical grain)
- [ ] **Ore sparkle**: metallic pixel highlights in ore textures
- [ ] **Biome ground textures**: moss (deep green, soft), peat (dark brown, fibrous), soot (black, ashy)

**Dependencies**: 0.3
**Files**: `src/world/tileset-generator.ts`

---

## Phase 2 — Building-Block Creatures
**Goal**: Populate the world with multi-part, procedurally animated Swedish folklore creatures.

### 2.1 — Multi-Part Creature Renderer
Replace box meshes with articulated geometric primitives.

- [ ] **Part system**: each creature is an array of `{ geometry, offset, jointParent, jointAxis }` — assembled at spawn
- [ ] **Joint system**: hierarchical transforms — parent part movement cascades to children
- [ ] **Procedural animation runtime**: sine waves (breathing), IK (leg placement), spring (floppy parts), follow-the-leader (segments)
- [ ] **Scale/color variation**: ±10% size, ±5% hue per individual (from `CreatureAnimation.variant`)
- [ ] **LOD**: reduce to single box mesh beyond 30 blocks distance

**Dependencies**: 0.1 (creature framework)
**Files**: `src/engine/behaviors/CreatureRendererBehavior.ts`, new `src/engine/creature-parts.ts`

### 2.2 — Passive Creatures
Creatures that exist in the world as ecosystem, not threats.

- [ ] **Lyktgubbar** (will-o-wisps): point light particles, drift toward player at twilight, flee if approached fast, guide toward landmarks (or mislead in Myren). Emissive amber/blue.
- [ ] **Skogssniglar** (forest snails): multi-segment shell + body, slow patrol, grazing behavior, drops shell plates. Spawn in Ängen/Bokskogen/Myren.
- [ ] **Tranor** (cranes): tall body + long neck (spring physics) + wings, wading near water, fly away if startled, seasonal migration. Spawn near water in Ängen/Skärgården.

**Dependencies**: 2.1, 1.1 (biome-based spawning)
**Files**: `src/ecs/systems/creature.ts`, `src/engine/creature-parts.ts`

### 2.3 — Hostile Creatures
Threats that escalate with inscription level and biome danger.

- [ ] **Mörker** (darkness): shadow pack, spawn at night, chase in groups, flee from light sources, burn at dawn. Replace current box enemy. Dark bodies with red emissive eyes.
- [ ] **Runväktare** (rune wardens): stone sentinel at Fornlämningar, dormant until player takes blocks from ruins, slow but heavy damage, weak to patience (stop attacking → they return to dormant). Stone body with gold rune glow.
- [ ] **Lindormar** (wyrms): segmented body (follow-the-leader animation), tunnel through soft blocks, attracted by mining vibrations, surface in caves/mountains. Pale body with red rune marks.
- [ ] **Draugar** (restless dead): wireframe/skeletal mesh, advance only when player looks away (Weeping Angel mechanic), spawn at burial mounds. Frost blue emissive.

**Dependencies**: 2.1, 1.1, 1.3 (landmarks for spawn points)
**Files**: `src/ecs/systems/creature.ts`, `src/engine/creature-parts.ts`

### 2.4 — Neutral & Special Creatures
Creatures with unique interaction models.

- [ ] **Vittra** (underground folk): semi-transparent, spawn near mounds in Bokskogen/Myren, debuff greedy players (mine too much near their mounds), reward offerings (food placed at mound).
- [ ] **Näcken** (water spirit): water-surface shimmer entity, disorientation aura if approached, teaches runes if observed from distance with iron offering. Spawn at water edges in Skärgården.
- [ ] **Jätten** (the giant): boss-scale entity assembled from world blocks, triggered by inscription level 1000+, appears near largest build, endgame encounter. Drops Runsten Seal.

**Dependencies**: 2.1, inscription level system (Phase 3)
**Files**: `src/ecs/systems/creature.ts`, new `src/ecs/systems/boss.ts`

---

## Phase 3 — Survival Depth
**Goal**: Make surviving meaningful. Food, tools, territory, the inscription system.

### 3.1 — Food & Hunger Rework
Replace linear hunger decay with a food system.

- [ ] **Food items**: berries (from bushes), mushrooms (Bokskogen floor), cranberries (Myren), cooked meat (creature drops + fire)
- [ ] **Eating mechanic**: select food in hotbar, use to consume, restores hunger
- [ ] **Cooking**: place raw food on torch/campfire block, transforms after time
- [ ] **Hunger effects**: below 20% → slow movement, below 10% → health drain (existing), 0% → death

**Dependencies**: 0.4 (flexible inventory), 0.3 (new blocks for food items)
**Files**: `src/world/blocks.ts`, `src/ecs/systems/survival.ts`, `src/ecs/systems/mining.ts` (harvesting)

### 3.2 — Tool Durability
Tools wear out, creating a maintenance loop.

- [ ] **Durability field** on items: wood (50), stone (150), iron (500), crystal (1000)
- [ ] **Durability drain**: 1 per mining action or attack
- [ ] **Tool break**: removed from hotbar when durability hits 0, particles
- [ ] **Durability display**: bar under tool icon in hotbar
- [ ] **Repair recipe** at workstation (future)

**Dependencies**: 0.4 (inventory refactor)
**Files**: `src/world/blocks.ts`, `src/ecs/systems/mining.ts`, `src/ui/hud/HotbarDisplay.tsx`

### 3.3 — Workstation Crafting
Physical crafting stations in the world.

- [ ] **Workstation blocks**: Crafting Bench, Forge (Städ), Scriptorium — new block types with interaction
- [ ] **Proximity crafting**: when near a workstation, its recipes unlock in crafting menu
- [ ] **Recipe tiers**: hand-craft (tier 0), bench (tier 1), forge (tier 2), scriptorium (tier 3)
- [ ] **New recipes**: iron tools, lanterns, ember lanterns, treated planks, reinforced bricks
- [ ] **Workstation placement**: player crafts the station block, places it, interacts with it

**Dependencies**: 0.3 (new blocks), 0.4 (flexible inventory), 1.2 (ores for forge recipes)
**Files**: `src/world/blocks.ts`, `src/ui/components/CraftingMenu.tsx`, `src/ecs/systems/mining.ts`

### 3.4 — Inscription Level System
The world pushes back proportional to player activity.

- [ ] **New trait: `InscriptionLevel`** — totalBlocksPlaced, totalBlocksMined, structuresBuilt, level (computed)
- [ ] **Track modifications**: increment on place/mine in relevant systems
- [ ] **Creature spawn scaling**: base spawn rates multiplied by inscription level tiers
- [ ] **Threshold events**: Runväktare wake at 100+, Lindormar attracted at 300+, Jätten at 1000+
- [ ] **Persist in player_state**

**Dependencies**: 0.1 (creature framework)
**Files**: `src/ecs/traits/index.ts`, `src/ecs/systems/mining.ts`, `src/ecs/systems/creature.ts`, `src/persistence/db.ts`

### 3.5 — Structure Recognition
The game recognizes player builds.

- [ ] **Enclosed space detection**: flood-fill from air blocks, check if surrounded by solid blocks on all 6 sides (within limit)
- [ ] **Shelter bonus**: inside enclosed space → reduced hunger decay, stamina regen boost
- [ ] **Structure size tracking**: feeds into inscription level and territory system
- [ ] **Falu red bonus**: structures with Falu red blocks reduce Mörker spawn radius

**Dependencies**: 0.3 (Falu red block)
**Files**: new `src/ecs/systems/structure.ts`, `src/ecs/systems/survival.ts`

### 3.6 — Light as Mechanic
Light sources affect gameplay beyond visibility.

- [ ] **Light radius per source**: torch (4), lantern (8), ember lantern (12), glyph lamp (20)
- [ ] **Mörker avoidance**: won't spawn or path within light radius
- [ ] **Light damage to Mörker**: proximity to light source deals continuous damage
- [ ] **Portable light**: ember lantern in hotbar creates mobile safe zone
- [ ] **Light propagation** (simple): track light-emitting blocks, compute radius, pass to creature AI

**Dependencies**: 2.3 (Mörker rework), 3.3 (lantern recipes)
**Files**: new `src/ecs/systems/light.ts`, `src/ecs/systems/creature.ts`

---

## Phase 4 — The Bok (Diegetic UI)
**Goal**: Replace floating UI with the in-world birch-bark journal.

### 4.1 — Bok Shell
The core journal UI framework.

- [ ] **Bok open/close**: tap/key opens full-screen parchment overlay with page tabs
- [ ] **Page navigation**: bottom tabs — Kartan (Map), Listan (Ledger), Kunskapen (Knowledge), Sagan (Saga)
- [ ] **Visual style**: birch-bark texture background, rune borders, Cinzel font, ink illustrations
- [ ] **Mobile gestures**: swipe between pages, tap outside to close
- [ ] **Transition animation**: book opening/closing with page flip

**Dependencies**: None (UI-only)
**Files**: new `src/ui/screens/BokScreen.tsx`, new `src/ui/components/BokPage.tsx`

### 4.2 — Kartan (Atlas/Map Page)
Fog-of-war map that reveals as the player explores.

- [ ] **Chunk tracking**: record which chunks the player has visited
- [ ] **Mini-map rendering**: top-down color-coded grid (biome colors), centered on player
- [ ] **Fog of war**: unexplored = parchment, explored = biome color, current = bright
- [ ] **Landmark markers**: runstenar, fornlämningar, stenhögar marked with rune icons
- [ ] **Fast travel** (future): tap runestone marker to teleport (requires rune inscription)

**Dependencies**: 1.1 (biomes for map colors), 1.3 (landmarks)
**Files**: new `src/ui/components/BokMap.tsx`, new `src/ecs/traits/index.ts` (ExploredChunks trait)

### 4.3 — Kunskapen (Knowledge/Codex Page)
Creature and lore encyclopedia.

- [ ] **Creature entries**: one per species, starts blank, fills in through observation
- [ ] **Observation mechanic**: keep camera pointed at creature for X seconds → fills entry
- [ ] **Entry content**: silhouette → basic shape → full details (behavior, weaknesses, drops)
- [ ] **Lore entries**: collected from runstenar and fornlämningar inscriptions
- [ ] **Recipe discovery display**: recipes unlocked through exploration shown here

**Dependencies**: 2.2, 2.3 (creatures to observe)
**Files**: new `src/ui/components/BokCodex.tsx`, new `src/ecs/traits/index.ts` (Codex trait)

### 4.4 — Listan (Ledger/Inventory Page)
Resource overview replacing the crafting menu inventory grid.

- [ ] **Resource list**: all owned resources with counts, sorted by category
- [ ] **Crafting integration**: tap resource to see what it crafts into
- [ ] **Glanceable design**: icons + counts, no clutter

**Dependencies**: 0.4 (flexible inventory)
**Files**: new `src/ui/components/BokLedger.tsx`

### 4.5 — Sagan (Saga Page)
The player's story — progression tracking, quest log.

- [ ] **Saga entries**: auto-generated from milestones (first shelter, first kill, first biome discovered, boss defeated)
- [ ] **Active objectives**: current quest/goal displayed as saga verse
- [ ] **Day counter + stats**: days survived, blocks placed/mined, creatures observed

**Dependencies**: 3.4 (inscription tracking for stats)
**Files**: new `src/ui/components/BokSaga.tsx`, new `src/ecs/traits/index.ts` (SagaLog trait)

### 4.6 — HUD Diegetification
Gradually replace floating HUD elements with world-based feedback.

- [ ] **Health → screen effects**: vignette intensity replaces health bar (red = low health, pulsing = critical)
- [ ] **Hunger → character effects**: movement slowdown + stomach rumble sfx (future) replaces bar
- [ ] **Time → sky observation**: remove time display, player reads the sky
- [ ] **Quest → Bok notifications**: rune glow effect on Bok icon when new info available
- [ ] **Keep vitals bar as option**: settings toggle for players who prefer explicit numbers

**Dependencies**: 4.1 (Bok exists)
**Files**: `src/ui/hud/VitalsBar.tsx`, `src/ui/hud/TimeDisplay.tsx`, `src/ui/hud/QuestTracker.tsx`, `src/App.tsx`

---

## Phase 5 — Runes & Advanced Systems
**Goal**: The rune system, fast travel, advanced crafting, territory.

### 5.1 — Rune System
Elder Futhark runes as world mechanics.

- [ ] **Rune discovery**: found at runstenar, taught by Näcken, discovered in fornlämningar
- [ ] **Rune inscription**: player inscribes runes onto runestones and structures
- [ ] **Active runes**: ᚱ Raido (fast travel between inscribed runstenar), ᛉ Algiz (protection ward on structures), ᚲ Kenaz (light/craft boost near inscribed workstation), ᛗ Mannaz (creature calming)
- [ ] **Rune UI**: selection wheel when interacting with inscribable surface

**Dependencies**: 4.3 (Kunskapen for rune discovery tracking), 3.3 (workstations for inscription)
**Files**: new `src/ecs/systems/rune.ts`, new `src/ui/components/RuneWheel.tsx`

### 5.2 — Fast Travel
Runestone network for quick traversal.

- [ ] **Inscribe runestone**: interact with runestone block, inscribe ᚱ Raido
- [ ] **Travel**: open Kartan, tap inscribed runestone, confirm, teleport with transition effect
- [ ] **Cost**: consumes crystal dust (resource) per travel
- [ ] **Lore integration**: "traveling the song-lines between stones"

**Dependencies**: 5.1 (rune system), 4.2 (Kartan for UI)
**Files**: `src/ecs/systems/rune.ts`, `src/ui/components/BokMap.tsx`

### 5.3 — Territory & Decay
Player builds have lasting world effects.

- [ ] **Territory calculation**: blocks placed by player define territory radius
- [ ] **Creature response**: passive creatures attracted to settled territory, hostile avoid lit territory
- [ ] **Structure decay**: unvisited builds slowly accumulate moss blocks (configurable timer)
- [ ] **Decay prevention**: Runsten Seal (Jätten drop) stops decay permanently
- [ ] **Falu red mechanic**: Falu red blocks in structures reduce Mörker spawn radius

**Dependencies**: 3.4 (inscription level), 3.5 (structure recognition), 2.4 (Jätten for seal)
**Files**: new `src/ecs/systems/territory.ts`, `src/ecs/systems/creature.ts`

### 5.4 — Seasons (Visual)
Time-based visual changes to the world.

- [ ] **Season cycle**: every N game-days cycles through vår (spring), sommar (summer), höst (autumn), vinter (winter)
- [ ] **Visual changes**: leaf color shift, snow accumulation in winter, grass color warmth
- [ ] **Gameplay effects**: longer nights in winter (more Mörker), shorter in summer. Hunger drain faster in winter.
- [ ] **Creature behavior**: Tranor migrate south in höst, Mörker stronger in vinter

**Dependencies**: 1.1 (biomes), 2.2 (creatures with seasonal behavior)
**Files**: `src/ecs/systems/time.ts`, `src/world/terrain-generator.ts`, `src/engine/behaviors/CelestialBehavior.ts`

---

## Phase 6 — Polish & Mobile Excellence
**Goal**: Ship-quality mobile experience.

### 6.1 — Mobile Controls Refinement
Complete the mobile control scaffold.

- [ ] **Left joystick**: virtual analog stick for movement (current touch zone, improve feel)
- [ ] **Right zone**: camera drag (current, improve sensitivity)
- [ ] **Action buttons**: mine (tap target), place (long-press), jump, Bok, inventory
- [ ] **Auto-targeting**: nearest enemy selected when attack pressed
- [ ] **Haptic feedback**: vibration on hit, break, damage (Capacitor)
- [ ] **Gesture shortcuts**: swipe down for Bok, double-tap for sprint

**Dependencies**: None (can start anytime)
**Files**: `src/ui/hud/MobileControls.tsx`, `src/engine/input-handler.ts`

### 6.2 — Performance Budget
Hit 60fps on mid-range mobile.

- [ ] **Chunk LOD**: simplified mesh for distant chunks (merge faces, reduce vertices)
- [ ] **Creature LOD**: single-box beyond 30 blocks (from 2.1)
- [ ] **Draw call batching**: merge creature meshes where possible
- [ ] **Render distance toggle**: 2/3/4 chunks selectable in settings
- [ ] **Particle budget**: cap total particles, reduce on mobile
- [ ] **Profiling pass**: identify and fix frame drops on target device

**Dependencies**: All rendering work from prior phases
**Files**: `src/engine/game.ts`, all behaviors

### 6.3 — Session Design
Short sessions must feel complete.

- [ ] **Quick-save on background**: auto-save when app loses focus (Capacitor lifecycle)
- [ ] **Resume context**: on load, brief reminder of what player was doing (Saga entry)
- [ ] **Micro-goals**: always have a next discoverable thing within 1-2 minutes of play
- [ ] **Pause on lost focus**: freeze game state when app backgrounded

**Dependencies**: Persistence (exists), 4.5 (Saga)
**Files**: `src/App.tsx`, `src/persistence/db.ts`

### 6.4 — Audio Foundation
Sound design for immersion.

- [ ] **Ambient loops**: per-biome (birds in Ängen, wind in Fjällen, water in Skärgården, silence in Blothögen)
- [ ] **Block sounds**: mine, place, break per material
- [ ] **Creature sounds**: procedural (pitch-shifted sine/noise bursts)
- [ ] **Music**: procedural ambient (stretch — Tone.js or similar)
- [ ] **Mobile**: respect mute switch, volume in settings

**Dependencies**: 1.1 (biomes for ambient selection)
**Files**: new `src/engine/audio.ts`

---

## Dependency Graph

```
Phase 0 (Foundation)
├── 0.1 Creature Framework ─────────────┐
├── 0.2 Biome Noise ──────────┐         │
├── 0.3 New Blocks ◄──────────┤         │
└── 0.4 Inventory Refactor ◄──┘         │
                                         │
Phase 1 (Landscape)                      │
├── 1.1 Biome Generation ◄── 0.2, 0.3   │
├── 1.2 Underground ◄── 0.3             │
├── 1.3 Landmarks ◄── 1.1               │
└── 1.4 Tileset Polish ◄── 0.3          │
                                         │
Phase 2 (Creatures) ◄───────────────────┘
├── 2.1 Multi-Part Renderer ◄── 0.1
├── 2.2 Passive Creatures ◄── 2.1, 1.1
├── 2.3 Hostile Creatures ◄── 2.1, 1.1, 1.3
└── 2.4 Neutral/Boss ◄── 2.1, 3.4

Phase 3 (Survival Depth)
├── 3.1 Food System ◄── 0.4, 0.3
├── 3.2 Tool Durability ◄── 0.4
├── 3.3 Workstations ◄── 0.3, 0.4, 1.2
├── 3.4 Inscription Level ◄── 0.1
├── 3.5 Structure Recognition ◄── 0.3
└── 3.6 Light Mechanic ◄── 2.3, 3.3

Phase 4 (The Bok)
├── 4.1 Bok Shell ◄── (none)
├── 4.2 Kartan ◄── 1.1, 1.3
├── 4.3 Kunskapen ◄── 2.2, 2.3
├── 4.4 Listan ◄── 0.4
├── 4.5 Sagan ◄── 3.4
└── 4.6 HUD Diegetification ◄── 4.1

Phase 5 (Advanced)
├── 5.1 Rune System ◄── 4.3, 3.3
├── 5.2 Fast Travel ◄── 5.1, 4.2
├── 5.3 Territory & Decay ◄── 3.4, 3.5, 2.4
└── 5.4 Seasons ◄── 1.1, 2.2

Phase 6 (Polish)
├── 6.1 Mobile Controls ◄── (anytime)
├── 6.2 Performance ◄── (after rendering phases)
├── 6.3 Session Design ◄── 4.5
└── 6.4 Audio ◄── 1.1
```

## Recommended Build Order

For a solo developer or small team, work in this sequence to always have a playable game:

1. **Phase 0** (all) — ~1 sprint. Foundation work. Game still playable but unchanged.
2. **Phase 1.1 + 1.4** — Biomes. Immediate visual impact. World feels Swedish.
3. **Phase 2.1 + 2.2** — Passive creatures. World feels alive.
4. **Phase 1.2 + 1.3** — Underground + landmarks. Exploration rewarded.
5. **Phase 2.3** — Hostile creatures. Night becomes terrifying.
6. **Phase 3.1 + 3.2** — Food + tools. Survival has depth.
7. **Phase 3.3 + 3.4** — Workstations + inscription. Progression loop complete.
8. **Phase 4.1 + 4.4** — Bok shell + ledger. Diegetic UI begins.
9. **Phase 3.5 + 3.6** — Structure + light. Building is strategic.
10. **Phase 4.2 + 4.3** — Map + codex. Exploration tracked.
11. **Phase 2.4** — Vittra, Näcken, Jätten. Endgame exists.
12. **Phase 5** — Runes, fast travel, territory. Advanced systems.
13. **Phase 4.5 + 4.6** — Saga + diegetification. UI polish.
14. **Phase 6** — Mobile excellence, performance, audio. Ship quality.

## What NOT to Build (Yet)

These are mentioned in docs but are stretch goals beyond the core vision:

- Multiplayer / ghost economy (Monolith Market)
- Structural integrity (air requirement for mining)
- Chisel / decorative block shaping
- Armor system (wait for combat to stabilize)
- Farming (wait for food system to prove out)
- Boat/raft mechanics
- Weather particles (rain, snow falling)
- Norrsken (aurora) world event

## Cross-Cutting Concerns

These apply to every phase:

- **Save/load**: every new trait and system must serialize to SQLite. Update `player_state` schema as traits are added.
- **Mobile performance**: every visual addition must be profiled on mobile. Keep draw calls under 100, particles under 300.
- **Biome check**: run `npm run typecheck && npm run lint` after every change.
- **Art direction compliance**: all new colors must come from the palette in `docs/design/art-direction.md`.
- **ECS discipline**: no game state in rendering layer. Side-effect pattern for all system→render communication.
- **Swedish authenticity**: every creature, biome, and mechanic name should be Swedish. English in code comments and UI descriptions only.
