# PRD: Bok — Full Implementation (Phases 0-6 + Runic Computation)

## Overview
Complete implementation of Bok, a mobile-first 4X voxel survival game rooted in Swedish folklore, from its current POC state through to a shippable product. This covers all planned phases: foundation hardening, Swedish landscape generation, building-block creature system, survival depth, diegetic journal UI (The Bok), runic computation system (merged from structures phases A-G), and mobile polish. Every story includes Vitest unit tests for ECS/logic and Playwright CT tests for React components.

## Goals
- Transform POC into a fully realized 4X survival game with 6 biomes, 11 creature types, workstation crafting, and the Bok diegetic journal
- Implement a face-based runic computation system that is intentionally Turing-complete, replacing pattern-matched crafting
- Achieve 60fps on mid-range mobile with touch-first controls
- Establish comprehensive test coverage: Vitest for ECS systems and pure logic, Playwright CT for React components, Playwright e2e for full UI flows
- Maintain ECS discipline (Koota owns state, Jolly Pixel owns rendering, React owns UI) with side-effect pattern throughout

## Quality Gates

These commands must pass for every user story:
- `pnpm typecheck` — Type checking (`tsc -b --dry`)
- `pnpm lint` — Linting (`biome check .`)
- `pnpm test` — Vitest unit tests (ECS systems, pure functions, game logic)
- `pnpm test-ct` — Playwright component tests (React UI components)

For UI stories, also include:
- Playwright e2e tests for React UI layer (HUD, menus, modals — not canvas interactions)

For all stories:
- Files must stay under ~200 LOC with proper decomposition
- `.tsx` files contain UI only; `.ts` files contain logic/state
- No game state in rendering layer; side-effect pattern for system→render communication

## User Stories

---

### Phase 0 — Foundation Hardening

### US-001: Set Up Vitest Testing Infrastructure
As a developer, I want Vitest configured for unit testing so that ECS systems and pure functions have automated test coverage.

**Acceptance Criteria:**
- [ ] `vitest` added as devDependency with compatible config
- [ ] `vitest.config.ts` created with TypeScript support, path aliases matching `vite.config.ts`
- [ ] `pnpm test` script added to `package.json` running `vitest run`
- [ ] `pnpm test:watch` script added for development (`vitest`)
- [ ] At least one passing test for an existing ECS system (e.g., `movementSystem` or `survivalSystem`)
- [ ] Test utilities module created at `src/test-utils.ts` with helpers for creating mock Koota worlds and entities
- [ ] CI workflow updated to run `pnpm test` alongside existing checks

### US-002: Creature Entity Framework
As a developer, I want a generalized creature framework replacing the hardcoded enemy system so that multiple species with different behaviors can be supported.

**Acceptance Criteria:**
- [ ] New `CreatureType` trait with species enum: Morker, Lyktgubbe, Skogssnigle, Trana, Vittra, Nacken, Runvaktare, Lindorm, Draug, Jatten
- [ ] New `CreatureAI` trait with fields: aiType (passive/neutral/hostile/boss), behaviorState, targetEntity, aggroRange, attackRange, attackDamage, attackCooldown, moveSpeed, detectionRange
- [ ] New `CreatureAnimation` trait with fields: animState (idle/walk/chase/attack/flee/burn), animTimer, variant (size/color offsets)
- [ ] `enemySystem` refactored to `creatureSystem` dispatching AI by `CreatureType`, supporting passive/neutral/hostile behavior trees
- [ ] `EnemyRendererBehavior` refactored to `CreatureRendererBehavior` dispatching mesh construction by `CreatureType`
- [ ] `CreatureSideEffects` interface replacing `EnemySideEffects`
- [ ] Existing Mörker behavior preserved through the new framework (no gameplay regression)
- [ ] Vitest: unit tests for creature AI dispatch, behavior state transitions, passive/neutral/hostile branching
- [ ] Playwright CT: no UI changes in this story

### US-003: Biome Noise Infrastructure
As a developer, I want multi-layer noise functions for biome selection so that terrain generation can produce distinct Swedish landscapes.

**Acceptance Criteria:**
- [ ] Multi-layer noise added to `terrain-generator.ts`: continental (scale 200), erosion (50), temperature (150), moisture (120)
- [ ] Biome selection function: temperature × moisture → biome enum (Angen, Bokskogen, Fjallen, Skargarden, Myren, Blothogen)
- [ ] Per-biome surface rules defined: surface block, subsurface block, depth, water behavior
- [ ] Per-biome tree type selection: birch (Ängen), beech (Bokskogen), pine (all), spruce (Fjällen edge), dead birch (Blothögen)
- [ ] 8-block biome blend at boundaries with weighted block selection
- [ ] Vitest: unit tests for biome selection function (temperature/moisture → expected biome), noise layer composition, boundary blending logic
- [ ] Terrain generation remains deterministic from seed

### US-004: New Block Types for Biomes
As a developer, I want expanded block types so that biome-specific terrain and resources can be rendered.

**Acceptance Criteria:**
- [ ] New blocks added to `blocks.ts`: BirchWood, BirchLeaves, BeechWood, BeechLeaves, PineWood, PineLeaves, SpruceLeaves, DeadWood, Moss, Mushroom, Peat, Ice, SmoothStone, Soot, CorruptedStone, IronOre, CopperOre, Crystal, FaluRed
- [ ] Block properties defined: hardness, color, transparency, special physics (ice=slippery, peat=bouncy, moss=soft)
- [ ] New textures in `tileset-generator.ts` for each block, tileset grid expanded to accommodate
- [ ] All texture colors comply with palette in `docs/design/art-direction.md`
- [ ] Vitest: unit tests for block property lookups, block ID→name mappings, texture generation functions

### US-005: Inventory Refactor
As a developer, I want the inventory system to use `Record<number, number>` instead of named fields so that it scales to arbitrary block/item types.

**Acceptance Criteria:**
- [ ] `Inventory` trait changed from named fields to `Record<number, number>` (blockId/itemId → count)
- [ ] All consumers updated: `CraftingMenu.tsx`, `HotbarDisplay.tsx`, `miningSystem`, `questSystem`, save/load in `db.ts`
- [ ] Inventory capacity limit field added for future Bok Ledger integration
- [ ] Persisted as JSON via `JSON.stringify`/`JSON.parse` (no custom encode/decode)
- [ ] Vitest: unit tests for inventory add/remove/has operations, capacity checks, serialization round-trip
- [ ] Playwright CT: `HotbarDisplay` and `CraftingMenu` component tests still pass with new inventory shape

---

### Phase 1 — The Swedish Landscape

### US-006: Ängen, Bokskogen, and Fjällen Biomes
As a player, I want to explore distinct Swedish landscapes so that the world feels like Scandinavia.

**Acceptance Criteria:**
- [ ] **Ängen** (meadow): rolling grass, birch trees (white bark, light canopy), gentle terrain, wildflower accents
- [ ] **Bokskogen** (beech forest): dense beech trees (thick trunk, 7×7 canopy), moss floor, mushroom blocks, darker ambient
- [ ] **Fjällen** (mountains): high elevation, exposed stone, snow cap, ice blocks, cave entrances, no trees above tree line
- [ ] Each biome generates correctly from noise-based temperature/moisture selection
- [ ] Tree generation varies per biome with correct species
- [ ] Vitest: unit tests for per-biome surface block selection, tree type dispatch, elevation-based tree line cutoff

### US-007: Skärgården, Myren, and Blothögen Biomes
As a player, I want coastal, wetland, and corrupted biomes so that exploration reveals new environments with unique resources.

**Acceptance Criteria:**
- [ ] **Skärgården** (archipelago): island clusters in deep water, smooth stone shores, sparse pine
- [ ] **Myren** (bog): flat waterlogged terrain, peat, moss, shallow pools, cranberry bushes
- [ ] **Blothögen** (corrupted): soot ground, dead birch, corrupted stone, permanent darkness bias
- [ ] Blothögen generates independently as corruption zones biased toward world edges
- [ ] Biome-specific resource availability enforced (peat only in Myren, soot only in Blothögen, etc.)
- [ ] Vitest: unit tests for island generation (Skärgården), waterlogging (Myren), corruption zone placement (Blothögen)

### US-008: Underground Caves and Ore Veins
As a player, I want to mine underground to find caves and ores so that resource gathering has depth.

**Acceptance Criteria:**
- [ ] Cave noise layer (scale 30) using 3D simplex, carving where value exceeds threshold
- [ ] Ore placement: iron (y 5-15), copper (y 10-20), crystal (y 20+) in cluster generation
- [ ] Underground water pools at cave intersections
- [ ] Caves connect into networks, not isolated pockets
- [ ] Vitest: unit tests for cave carving threshold, ore depth bands, cluster generation determinism

### US-009: Landmark Generation
As a player, I want procedurally placed landmarks so that the world feels like Sweden with ancient structures to discover.

**Acceptance Criteria:**
- [ ] **Stenhögar** (cairns): stone stacks on hilltops, 3-5 blocks tall, placed at biome boundaries
- [ ] **Runstenar** (runestones): tall inscribed stone blocks near stenhögar, readable interaction stub
- [ ] **Fornlämningar** (ruins): stone foundations (5×5 to 15×15), partial walls, loot container stubs
- [ ] Spawn shrine upgraded: stenhög + runestone + torches replacing generic stone platform
- [ ] Biome-specific landmarks: Kolmilor (Bokskogen), Offerkällor (Myren), Sjömärken (Skärgården), Fjällstugor (Fjällen)
- [ ] Vitest: unit tests for landmark placement rules (biome-specific, elevation-based), spawn rate per chunk

### US-010: Tileset Polish
As a player, I want block textures that match the Swedish art direction so that the world looks handcrafted.

**Acceptance Criteria:**
- [ ] All new block textures comply with palette from `docs/design/art-direction.md`
- [ ] Wood grain detail: birch (white, horizontal lenticels), beech (smooth grey-brown), pine (dark vertical grain)
- [ ] Ore sparkle: metallic pixel highlights in ore textures
- [ ] Biome ground textures: moss (deep green, soft), peat (dark brown, fibrous), soot (black, ashy)
- [ ] Warm bias maintained: stone/dirt skew +5-10 red channel
- [ ] Vitest: unit tests for texture generation function outputs (pixel color sampling)

---

### Phase 2 — Building-Block Creatures

### US-011: Multi-Part Creature Renderer
As a developer, I want a renderer that assembles creatures from geometric primitives so that creatures look like building-block toys.

**Acceptance Criteria:**
- [ ] Part system: creatures defined as arrays of `{ geometry, offset, jointParent, jointAxis }`, assembled at spawn
- [ ] Joint system: hierarchical transforms where parent movement cascades to children
- [ ] Scale/color variation: ±10% size, ±5% hue per individual from `CreatureAnimation.variant`
- [ ] LOD: reduce to single box mesh beyond 30 blocks distance
- [ ] New file `src/engine/creature-parts.ts` with part definitions and assembly functions
- [ ] Vitest: unit tests for part assembly, joint hierarchy, LOD distance threshold, variation ranges

### US-012: Procedural Animation Runtime
As a developer, I want code-driven animation for creatures so that no animation files are needed.

**Acceptance Criteria:**
- [ ] Sine wave animations for breathing/idle (amplitude, frequency per creature type)
- [ ] IK solver for leg placement on terrain (2-bone IK minimum)
- [ ] Spring physics for floppy parts (Tomte cap, Trana neck, chain segments)
- [ ] Follow-the-leader for segmented creatures (Lindorm body segments)
- [ ] State-driven blending: smooth transitions between idle/walk/chase/attack/flee states
- [ ] Vitest: unit tests for IK solver (target reach, joint angles), spring physics (damping, convergence), state blending interpolation

### US-013: Lyktgubbar (Will-o'-the-Wisps)
As a player, I want floating orbs of warm light at twilight so that the world feels alive with folklore.

**Acceptance Criteria:**
- [ ] Build: single glowing sphere with point light and additive blend
- [ ] Color: warm amber `#ffd700`, shifts to cool blue `#88ccff` over deep water
- [ ] Behavior: drift in slow sine patterns, scatter on approach (burst velocity, reform), cluster near runstenar and water
- [ ] Spawn in Ängen/Bokskogen/Myren during skymning (twilight) and morgon (dawn)
- [ ] Vitest: unit tests for drift pattern, scatter/reform logic, spawn time window, water color shift
- [ ] Creature framework integration: uses CreatureType.Lyktgubbe, passive AI

### US-014: Skogssniglar (Forest Snails) and Tranor (Cranes)
As a player, I want peaceful creatures grazing and wading so that biomes feel like ecosystems.

**Acceptance Criteria:**
- [ ] **Skogssniglar**: base capsule + 5 stacked box segments (shell), 4 stubby IK legs. Wander, graze on grass, retract when threatened (becomes static block), drop Shell Plates. Spawn in Ängen/Bokskogen/Myren.
- [ ] **Tranor**: elongated box torso, 8-segment chain neck, cone beak, flat box wings, 2 reverse-knee IK legs. Wade in water, fish (neck dips), flee on approach (honk, V-formation with flock via Boids). Spawn near water in Ängen/Skärgården.
- [ ] Colors match art direction: Skogssniglar (moss `#3a5a40` + stone `#6b6b6b`), Tranor (björk `#e0d5c1` + ink `#1a1a2e` wingtips)
- [ ] Vitest: unit tests for grazing behavior, retract state transition, Boids flocking algorithm, flock formation
- [ ] Both creature types correctly despawn/spawn based on biome

### US-015: Mörker (Darkness Packs)
As a player, I want the darkness itself to hunt me at night so that Swedish winter terror drives the combat loop.

**Acceptance Criteria:**
- [ ] Build: amorphous sphere mesh with vertex displacement noise, 2-4 shifting red emissive eyes, dark particle trail
- [ ] Color: deep ink `#1a1a2e`, eyes ember `#ff4444`
- [ ] Pack AI: spawn in groups of 3-5, alpha/flanking behavior, coordinate pursuit
- [ ] Light-averse: take damage within torch radius, flee from fire, size scales inversely with ambient light
- [ ] Dissolve at dawn, hunt Lyktgubbar (ecological chain — extinguish ambient light)
- [ ] Replace current generic box enemy completely
- [ ] Vitest: unit tests for pack formation, flanking positions, light damage calculation, size scaling by ambient light, dawn dissolution

### US-016: Runväktare, Lindormar, and Draugar
As a player, I want hostile creatures guarding ruins, tunneling through terrain, and advancing when unseen so that exploration and mining are dangerous.

**Acceptance Criteria:**
- [ ] **Runväktare**: tall stone column (2×4), flat slab head with ember eyes, segmented stone arms. Dormant near ruins (appear as scenery), activate when player mines ruin blocks, slam attack (ground AOE), return to post if player retreats. Drop Runsten Fragments.
- [ ] **Lindormar**: 12-segment chain of rounded boxes, follow-the-leader animation. Tunnel through soft blocks (dirt/sand/grass, not stone), breach near player, arc attack, dive back. Attracted by mining vibrations. Leave permanent tunnels. Drop Lindorm Scales/Fang.
- [ ] **Draugar**: wireframe humanoid, semi-transparent. Advance only when player not looking (dot product check of look direction). Freeze when observed. Massive contact damage. Spawn at burial mounds, teleport back at dawn. Frost blue `#aaccee` emissive.
- [ ] Vitest: unit tests for Runväktare activation trigger (block mining near ruins), Lindorm tunneling pathfinding (soft vs hard blocks), Draugar observation mechanic (look direction dot product threshold)

### US-017: Vittra, Näcken, and Jätten
As a player, I want unique creature interactions — offerings, observation, and a world boss — so that creatures serve all 4X pillars.

**Acceptance Criteria:**
- [ ] **Vittra**: small humanoid (1 block tall), semi-transparent when passive, solid when aggravated. Spawn near mounds in Bokskogen/Myren. Inflict otur debuffs (hunger decay increase, tool durability reduction) when player mines near mounds. Appeased by food offerings placed at mounds.
- [ ] **Näcken**: humanoid sitting on water rocks, translucent green-blue emissive. Disorientation aura on approach (camera sway, reversed controls 3s). Teaches a rune when iron offering thrown in water. One per world region.
- [ ] **Jätten**: 8-block tall humanoid assembled from world blocks. Appears when inscription level 1000+. Attacks player's largest build. Regenerates by pulling blocks from terrain. Drops Runsten Seal on defeat. Yields permanent structure protection.
- [ ] Vitest: unit tests for Vittra debuff application/appeasement, Näcken disorientation trigger/iron offering, Jätten inscription level threshold, terrain block consumption for regeneration

### US-018: Norrsken (Northern Lights) World Event
As a player, I want periodic aurora borealis events so that rare nights offer safety and discovery.

**Acceptance Criteria:**
- [ ] 5% chance per night to trigger Norrsken event lasting 60 seconds
- [ ] All creatures become passive during event (mesmerized)
- [ ] Rare glowing resource blocks briefly surface on terrain
- [ ] Kartan reveals nearby unexplored landmarks (when Kartan exists)
- [ ] Rune inscriptions on runstenar glow brighter and readable from further away
- [ ] Visual: animated ribbon of light (green `#88ff88`, purple `#aa66cc`, blue `#66aaff` cycling), particle streamers, world tinted with aurora color
- [ ] Implemented as `WorldEvent` system, not creature AI
- [ ] Vitest: unit tests for trigger probability, creature pacification, resource surfacing, event duration/cleanup

---

### Phase 3 — Survival Depth

### US-019: Food and Hunger Rework
As a player, I want a food system replacing linear hunger decay so that eating is a meaningful survival loop.

**Acceptance Criteria:**
- [ ] Food items: berries (from bushes in Ängen), mushrooms (Bokskogen floor), cranberries (Myren), cooked meat (creature drops + fire)
- [ ] Eating mechanic: select food in hotbar, use to consume, restores hunger proportional to food type
- [ ] Cooking: place raw food on torch/campfire block, transforms after configurable time
- [ ] Hunger effects: below 20% → slow movement, below 10% → health drain, 0% → death
- [ ] Vitest: unit tests for hunger decay rates, food restoration values, cooking transformation timer, movement penalty thresholds
- [ ] Playwright CT: VitalsBar reflects hunger effects (slow movement indicator)

### US-020: Tool Durability
As a player, I want tools that wear out so that maintaining my equipment creates a crafting loop.

**Acceptance Criteria:**
- [ ] Durability field on tool items: wood (50), stone (150), iron (500), crystal (1000)
- [ ] Durability drains 1 per mining action or attack
- [ ] Tool removed from hotbar at durability 0 with break particles
- [ ] Durability bar displayed under tool icon in hotbar
- [ ] Vitest: unit tests for durability drain per action, break at zero, tier-specific durability values
- [ ] Playwright CT: HotbarDisplay shows durability bar, updates on drain, handles break state

### US-021: Workstation Crafting
As a player, I want physical crafting stations in the world so that crafting is a spatial activity.

**Acceptance Criteria:**
- [ ] Workstation blocks: Crafting Bench (tier 1), Forge/Städ (tier 2), Scriptorium (tier 3)
- [ ] Proximity crafting: being near a workstation unlocks its recipe tier in crafting menu
- [ ] Recipe tiers: hand-craft (tier 0, always available), bench (tier 1), forge (tier 2), scriptorium (tier 3)
- [ ] New recipes: iron tools, lanterns, ember lanterns, treated planks, reinforced bricks
- [ ] Player crafts station block from materials, places it in world, interacts with it
- [ ] Vitest: unit tests for proximity detection, recipe tier unlocking, workstation block crafting
- [ ] Playwright CT: CraftingMenu shows correct recipes based on nearby workstation tier

### US-022: Inscription Level System
As a developer, I want the world to track player modifications and escalate responses so that expansion has consequences.

**Acceptance Criteria:**
- [ ] New `InscriptionLevel` trait: totalBlocksPlaced, totalBlocksMined, structuresBuilt, computed level
- [ ] Level formula: `totalBlocksPlaced + (totalBlocksMined * 0.5) + (structuresBuilt * 10)`
- [ ] Increment on place/mine in mining system
- [ ] Creature spawn scaling: base rates multiplied by inscription level tiers
- [ ] Threshold events: Runväktare wake at 100+, Lindormar attracted at 300+, Jätten at 1000+
- [ ] Persisted in player_state table
- [ ] Vitest: unit tests for level calculation formula, spawn rate scaling, threshold triggers, persistence round-trip

### US-023: Structure Recognition
As a player, I want the game to recognize my builds so that enclosed spaces provide shelter bonuses.

**Acceptance Criteria:**
- [ ] Enclosed space detection: flood-fill from air blocks, check surrounded by solid blocks on all 6 sides within configurable limit
- [ ] Shelter bonus: inside enclosed space → reduced hunger decay rate, stamina regen boost
- [ ] Structure size tracking feeds into inscription level
- [ ] Falu red blocks in structures reduce Mörker spawn radius in surrounding area
- [ ] New `src/ecs/systems/structure.ts` created
- [ ] Vitest: unit tests for flood-fill enclosed detection (open vs closed vs partial), shelter bonus application, Falu red spawn radius reduction

### US-024: Light as Mechanic
As a player, I want light sources to affect gameplay beyond visibility so that light management is strategic survival.

**Acceptance Criteria:**
- [ ] Light radius per source: torch (4), lantern (8), ember lantern (12), glyph lamp (20)
- [ ] Mörker won't spawn or path within light radius
- [ ] Proximity to light deals continuous damage to Mörker
- [ ] Portable ember lantern in hotbar creates mobile safe zone around player
- [ ] Simple light propagation: track light-emitting blocks, compute radius, pass to creature AI
- [ ] New `src/ecs/systems/light.ts` created
- [ ] Vitest: unit tests for radius calculation per source type, Mörker avoidance pathfinding, damage-over-time in light, mobile lantern radius

---

### Phase 4 — The Bok (Diegetic UI)

### US-025: Bok Shell
As a player, I want a birch-bark journal overlay so that I can access my map, inventory, knowledge, and saga in a diegetic interface.

**Acceptance Criteria:**
- [ ] Bok open/close: tap/key opens full-screen parchment overlay
- [ ] Page navigation: bottom tabs — Kartan, Listan, Kunskapen, Sagan
- [ ] Visual style: birch-bark texture background (`#e0d5c1`), rune borders, Cinzel font
- [ ] Mobile gestures: swipe between pages, tap outside to close
- [ ] Transition animation: book opening/closing
- [ ] New `src/ui/screens/BokScreen.tsx` and `src/ui/components/BokPage.tsx`
- [ ] Playwright CT: BokScreen renders with all 4 tabs, tab switching works, open/close transitions
- [ ] Playwright e2e: Bok opens from game HUD, tab navigation works, close returns to game

### US-026: Kartan (Atlas/Map Page)
As a player, I want a fog-of-war map in my Bok so that I can track explored terrain and discovered landmarks.

**Acceptance Criteria:**
- [ ] Chunk tracking: record which chunks player has visited in new `ExploredChunks` trait
- [ ] Mini-map rendering: top-down color-coded grid using biome colors, centered on player
- [ ] Fog of war: unexplored = parchment color, explored = biome color, current = bright
- [ ] Landmark markers: runstenar, fornlämningar, stenhögar marked with rune icons
- [ ] Pinch to zoom on mobile
- [ ] New `src/ui/components/BokMap.tsx`
- [ ] Vitest: unit tests for chunk exploration tracking, fog-of-war state, landmark marker placement
- [ ] Playwright CT: BokMap renders with correct fog of war, landmarks display, zoom works

### US-027: Kunskapen (Knowledge/Codex Page)
As a player, I want a creature and lore encyclopedia so that observation and exploration are recorded.

**Acceptance Criteria:**
- [ ] Creature entries: one per species, starts blank, fills through observation
- [ ] Observation mechanic: keep camera pointed at creature for configurable duration → fills entry progressively (silhouette → basic shape → full details)
- [ ] Entry content: behavior description, weaknesses, drop tables
- [ ] Lore entries: collected from runstenar and fornlämningar inscriptions
- [ ] Recipe discovery display: recipes unlocked through exploration shown here
- [ ] New `Codex` trait tracking observation progress per species
- [ ] New `src/ui/components/BokCodex.tsx`
- [ ] Vitest: unit tests for observation timer, progressive reveal stages, codex persistence
- [ ] Playwright CT: BokCodex renders creature entries at each reveal stage, lore entries display

### US-028: Listan (Ledger/Inventory Page)
As a player, I want a resource overview in my Bok so that I can see what I have at a glance.

**Acceptance Criteria:**
- [ ] Resource list: all owned resources with counts, sorted by category (blocks, tools, materials, food)
- [ ] Crafting integration: tap resource to see available recipes using that resource
- [ ] Glanceable design: icons + counts, no clutter, parchment aesthetic
- [ ] New `src/ui/components/BokLedger.tsx`
- [ ] Playwright CT: BokLedger renders resource list with correct counts, category sorting, recipe lookup

### US-029: Sagan (Saga/Journal Page)
As a player, I want my journey auto-recorded as narrative so that my progress tells a story.

**Acceptance Criteria:**
- [ ] Saga entries: auto-generated from milestones (first shelter, first creature kill, first biome discovered, boss defeated, day survived thresholds)
- [ ] Active objectives: current goal displayed as saga verse
- [ ] Stats display: days survived, blocks placed/mined, creatures observed
- [ ] New `SagaLog` trait tracking milestones and generating prose entries
- [ ] New `src/ui/components/BokSaga.tsx`
- [ ] Vitest: unit tests for milestone detection, entry generation, stats aggregation
- [ ] Playwright CT: BokSaga renders entries chronologically, stats display correctly

### US-030: HUD Diegetification
As a player, I want floating HUD elements gradually replaced with world-based feedback so that immersion increases.

**Acceptance Criteria:**
- [ ] Health → vignette intensity (red = low, pulsing = critical) as meta effect
- [ ] Hunger → movement slowdown + screen desaturation as meta effect
- [ ] Time → removed from HUD, player reads the sky (sun/moon position)
- [ ] Quest → rune glow effect on Bok icon when new info available
- [ ] Settings toggle to keep explicit vitals bars for players who prefer numbers
- [ ] Vitest: unit tests for vignette intensity mapping from health value, desaturation from hunger
- [ ] Playwright CT: VitalsBar respects settings toggle (show/hide), DamageVignette scales with health

---

### Phase 5 — Runes & Advanced Systems (Merged with Structures Phases A-E)

### US-031: Chisel Tool and Rune Inscription UI
As a player, I want to etch runes onto block faces with a chisel so that I can give blocks behaviors.

**Acceptance Criteria:**
- [ ] Chisel tool item (iron tier, craftable at Forge)
- [ ] Face selection: holding chisel and tapping a block face highlights that face
- [ ] Rune wheel: appears around tap point, drag to select rune, rune etches onto face
- [ ] Each block has 6 faces (+x, -x, +y, -y, +z, -z), each can hold one rune or be blank
- [ ] Visual feedback: etched faces glow with rune-specific color
- [ ] Internal face support: runes on faces between adjacent blocks (hidden from view, still active)
- [ ] X-ray view: long-press with chisel to see and modify internal faces
- [ ] New `src/ui/components/RuneWheel.tsx`
- [ ] Vitest: unit tests for face selection from ray intersection, rune placement on face, internal face visibility rules
- [ ] Playwright CT: RuneWheel renders rune options, drag-to-select works, visual preview on selection

### US-032: Face-Based Rune Storage and Spatial Index
As a developer, I want efficient per-face rune storage so that signal propagation can quickly find inscribed blocks.

**Acceptance Criteria:**
- [ ] Per-face rune storage: `Map<voxelKey, Map<FaceIndex, RuneId>>` per chunk
- [ ] FaceIndex type: `0 | 1 | 2 | 3 | 4 | 5` mapping to +x, -x, +y, -y, +z, -z
- [ ] Spatial index updated on block place/remove/etch operations
- [ ] Sparse face maps: most blocks have 1-3 etched faces
- [ ] Index persisted in save data (new table or extended voxel_deltas)
- [ ] Vitest: unit tests for index insertion/removal, face lookup, persistence round-trip, sparse storage efficiency

### US-033: Signal Propagation Engine
As a developer, I want a BFS-based signal propagation system so that rune behaviors can interact through conducting blocks.

**Acceptance Criteria:**
- [ ] Signal types: heat, light, force, detection — each with strength (0-15)
- [ ] Propagation runs on slow tick (4 ticks/second, every 250ms)
- [ ] BFS from each emitter through conducting blocks (stone, iron, copper conduct; wood insulates; crystal amplifies ×1.5)
- [ ] Face-direction awareness: signal enters/exits through specific faces, rune on face transforms signal
- [ ] Per-tick budget: max 128 blocks evaluated, max 32 active emitters, max 16 propagation depth
- [ ] Same-type same-direction strengths ADD (max 15), opposing SUBTRACT (min 0), different types pass independently (multiplexed)
- [ ] Visited set prevents double-evaluation per tick
- [ ] Vitest: unit tests for BFS traversal, material conductivity, signal attenuation, face-direction routing, multiplexing, budget limits

### US-034: Emitter Runes — Kenaz and Sowilo
As a player, I want to create heat and light emitters so that I can power runic machines and repel darkness.

**Acceptance Criteria:**
- [ ] **ᚲ Kenaz** (Torch): EMIT(heat) at strength 10 in facing direction, continuous
- [ ] **ᛊ Sowilo** (Sun): EMIT(light) at strength 10 in facing direction, repels Mörker
- [ ] Both runes produce visible glow on the etched face (Kenaz = ember `#a3452a`, Sowilo = gold `#c9a84c`)
- [ ] Particle trail shows signal propagation path at slow tick
- [ ] Discovery: Kenaz taught by Tomte at spawn (later story), Sowilo from watching full sunrise
- [ ] Vitest: unit tests for signal emission at correct strength and type, propagation through conductors, visual particle spawn

### US-035: Interaction Runes — Jera, Fehu, Ansuz, Thurisaz
As a player, I want runes that transform resources, collect items, detect creatures, and deal damage so that I can build functional machines.

**Acceptance Criteria:**
- [ ] **ᛃ Jera** (Harvest): TRANSFORM — converts input resource to output when signal + input present (ore + heat → ingot, wood + heat → charcoal)
- [ ] **ᚠ Fehu** (Wealth): PULL — attracts nearby loose items/drops within radius toward the inscribed face
- [ ] **ᚨ Ansuz** (Wisdom): SENSE — detects creatures/player within configurable radius, emits detection signal
- [ ] **ᚦ Thurisaz** (Thorn): DAMAGE — converts incoming signal to area damage, functions as trap
- [ ] Each rune discoverable through world observation per `docs/architecture/structures.md`
- [ ] Vitest: unit tests for Jera transformation rules (correct input+signal → output), Fehu pull radius, Ansuz detection radius and signal emission, Thurisaz damage calculation from signal strength

### US-036: Protection Runes — Algiz, Mannaz, Berkanan
As a player, I want runes that create wards, calm creatures, and accelerate growth so that my settlement is protected and productive.

**Acceptance Criteria:**
- [ ] **ᛉ Algiz** (Protection): WARD — creates exclusion zone, hostile creatures can't enter radius proportional to signal strength
- [ ] **ᛗ Mannaz** (Humanity): CALM — neutral creatures in radius become friendly, taming ward
- [ ] **ᛒ Berkanan** (Birch): GROW — accelerates natural growth in radius (saplings grow faster, crops yield sooner)
- [ ] Ward radius visible as subtle particle boundary
- [ ] Vitest: unit tests for Algiz exclusion zone radius from signal strength, Mannaz creature behavior override, Berkanan growth multiplier application

### US-037: Archetype Recognition and Settlement Founding
As a player, I want the game to recognize functional archetypes from my rune builds so that settlements emerge naturally.

**Acceptance Criteria:**
- [ ] Archetype detection: Hearth (heat + enclosed space), Workshop (heat + transform within 5 blocks), Beacon (light strength >20), Ward (active ward radius >5), Trap (sense + damage connected), Farm (grow + saplings/crops), Gate (paired teleport)
- [ ] Settlement recognition: Hearth + Workshop + Ward colocated within a chunk
- [ ] On settlement founding: Sagan records entry, procedurally generated Swedish place name, Kartan marks location, passive creature behavior shifts
- [ ] Settlement growth: adding Farm/Gate/Beacon/multiple Wards enhances settlement
- [ ] Vitest: unit tests for each archetype detection condition, settlement threshold (3 colocated archetypes), name generation

### US-038: Computational Runes — Naudiz, Isa, Hagalaz
As a player, I want NOT, DELAY, and AND gates so that I can build computational circuits from runes.

**Acceptance Criteria:**
- [ ] **ᚾ Naudiz** (Need): INVERT — outputs signal (strength 5) when receiving none, silent when powered. The NOT gate.
- [ ] **ᛁ Isa** (Ice): DELAY — holds signal for N ticks before releasing (default N=1/250ms, crystal N=2). Enables sequential logic.
- [ ] **ᚺ Hagalaz** (Hail): GATE — passes signal from one face only if signal also present on perpendicular face. The AND gate.
- [ ] Composite gates buildable: NAND (Hagalaz → Naudiz), OR (two signals at junction), flip-flop (Naudiz + Isa feedback loop), clock oscillator
- [ ] Discovery: Naudiz from ruin observation, Isa from ice formation, Hagalaz from hailstorm survival
- [ ] Vitest: unit tests for NOT truth table, delay timing accuracy, AND gate truth table, NAND composition, flip-flop stability, clock oscillation period

### US-039: Self-Modifying Circuits and Feedback Loops
As a developer, I want circuits that can alter their own topology so that the runic system achieves full computational power.

**Acceptance Criteria:**
- [ ] Jera on exit face: PLACE(blockType) — when signal exits into air, places a block (consumes signal strength proportional to hardness)
- [ ] Thurisaz on exit face: DESTROY — when signal exits into a block, removes that block
- [ ] Feedback loop detection: system handles stable oscillators without infinite loops (visited set per tick)
- [ ] Self-modifying: circuits can place/remove blocks, changing their own signal paths
- [ ] Physical switch: placing/removing a block manually toggles circuit on/off
- [ ] Fuse: wood block in signal path with heat signal burns, consuming block and breaking circuit
- [ ] Vitest: unit tests for block placement from signal, block destruction from signal, feedback loop termination, fuse consumption

### US-040: Rune Discovery and Kunskapen Integration
As a player, I want to discover runes through world observation so that learning feels diegetic.

**Acceptance Criteria:**
- [ ] Each of 15 runes discoverable through specific world interactions per structures.md discovery table
- [ ] Discoveries recorded in Kunskapen page of the Bok with rune meaning, behavior description, and discovery context
- [ ] Undiscovered runes don't appear in rune wheel
- [ ] Discovery state persisted in save data
- [ ] Vitest: unit tests for discovery trigger conditions, Kunskapen entry creation, rune wheel filtering by discovery state
- [ ] Playwright CT: BokCodex renders rune entries with discovery progress, RuneWheel only shows discovered runes

### US-041: Fast Travel System
As a player, I want to teleport between inscribed runestones so that long-distance traversal is manageable.

**Acceptance Criteria:**
- [ ] **ᚱ Raido** rune inscribed on runestone blocks creates fast-travel anchor
- [ ] Travel via Kartan: tap inscribed runestone marker, confirm, teleport with transition effect
- [ ] Cost: consumes crystal dust resource per travel
- [ ] Raido blocks can also pair for item teleportation in rune networks (inter-chunk signal bridges)
- [ ] Vitest: unit tests for anchor registration, travel cost deduction, paired block linking, item teleportation
- [ ] Playwright CT: BokMap shows inscribed runestone markers as interactive, travel confirmation dialog works

### US-042: Network Runes — Uruz, Tiwaz, Crystal Amplification
As a player, I want force, combat buff, and signal amplification runes so that my settlement can scale its capabilities.

**Acceptance Criteria:**
- [ ] **ᚢ Uruz** (Strength): PUSH — exerts force on entities in signal direction
- [ ] **ᛏ Tiwaz** (Victory): BUFF — entities in radius deal more combat damage
- [ ] Crystal blocks amplify signal strength ×1.5 (resonating material property)
- [ ] Full settlement growth system: all archetypes compose into increasingly powerful settlements
- [ ] Vitest: unit tests for Uruz force application, Tiwaz damage multiplier, crystal amplification calculation

### US-043: Territory and Decay
As a player, I want my territory to attract peaceful creatures and repel hostile ones, but decay if neglected, so that building has lasting consequences.

**Acceptance Criteria:**
- [ ] Territory calculation: player-placed blocks define territory radius (density field)
- [ ] Passive creatures attracted to settled territory, hostile creatures avoid well-lit territory
- [ ] Unvisited structures slowly accumulate moss blocks (configurable timer, e.g., 30 game-days)
- [ ] Decay prevention: Runsten Seal (Jätten drop) stops decay permanently for the settlement
- [ ] Falu red blocks reduce Mörker spawn radius
- [ ] New `src/ecs/systems/territory.ts`
- [ ] Vitest: unit tests for territory radius calculation, creature response to territory, decay timer, seal application, Falu red effect

### US-044: Seasons (Visual)
As a player, I want seasonal cycles so that the world changes over time with gameplay effects.

**Acceptance Criteria:**
- [ ] Season cycle: every N game-days cycles through vår (spring), sommar (summer), höst (autumn), vinter (winter)
- [ ] Visual changes: leaf color shift (green → gold → bare → green), snow accumulation in vinter, grass warmth variation
- [ ] Gameplay effects: longer nights in vinter (more Mörker), shorter in sommar. Hunger drain faster in vinter.
- [ ] Creature behavior: Tranor migrate south in höst, Mörker stronger in vinter
- [ ] Vitest: unit tests for season transition timing, night duration per season, hunger drain multiplier, creature migration triggers

---

### Phase 6 — Polish and Mobile Excellence (Merged with Structures Phases F-G)

### US-045: Mobile Controls Refinement
As a mobile player, I want responsive and comfortable touch controls so that the game feels native on phones.

**Acceptance Criteria:**
- [ ] Left joystick: virtual analog stick with improved feel (dead zone, ramp curve)
- [ ] Right zone: camera drag with adjustable sensitivity
- [ ] Action buttons: mine (tap target), place (long-press), jump, Bok, inventory — all in thumb zone (bottom 40%)
- [ ] Auto-targeting: nearest enemy selected when attack pressed
- [ ] Haptic feedback via Capacitor: light tap (place), medium pulse (break), heavy thud (damage)
- [ ] Gesture shortcuts: swipe down for Bok, double-tap for sprint
- [ ] All interactive elements minimum 48×48 CSS pixels
- [ ] Playwright CT: MobileControls renders correctly, button positions in thumb zone
- [ ] Playwright e2e: mobile control layout responds to viewport size changes

### US-046: Performance Budget
As a mobile player, I want 60fps on mid-range phones so that the game is playable without dropped frames.

**Acceptance Criteria:**
- [ ] Chunk LOD: simplified mesh for distant chunks (merge faces, reduce vertices)
- [ ] Creature LOD: single-box beyond 30 blocks (from US-011)
- [ ] Draw call batching: merge creature meshes where possible
- [ ] Render distance toggle: 2/3/4 chunks selectable in settings
- [ ] Particle budget: capped per device tier (100 low, 200 medium, 500 high)
- [ ] Adaptive quality: auto-detect device capability on startup (Low/Medium/High presets)
- [ ] Shadow map scaling: 512×512 mobile, 1024×1024 desktop
- [ ] Vitest: unit tests for LOD distance thresholds, quality preset selection logic, particle budget enforcement

### US-047: Session Design
As a mobile player, I want short sessions to feel complete so that 5-minute bus rides are satisfying.

**Acceptance Criteria:**
- [ ] Quick-save on background: auto-save when app loses focus (visibilitychange event)
- [ ] Resume context: on load, brief Saga reminder of what player was doing
- [ ] Micro-goals: always have a discoverable thing within 1-2 minutes of play
- [ ] Pause on lost focus: freeze game state when app backgrounded
- [ ] Auto-save every 60 seconds during play
- [ ] Vitest: unit tests for save trigger on visibility change, state freeze/resume, auto-save interval
- [ ] Playwright e2e: game pauses when tab loses focus, resumes correctly

### US-048: Audio Foundation
As a player, I want ambient sounds and block/creature audio so that the world is immersive.

**Acceptance Criteria:**
- [ ] Per-biome ambient loops: birds (Ängen), wind (Fjällen), water (Skärgården), silence (Blothögen), insects (Myren), dense forest (Bokskogen)
- [ ] Block sounds: mine, place, break — different per material category (wood, stone, ore)
- [ ] Creature sounds: procedural (pitch-shifted sine/noise bursts per creature type)
- [ ] Mobile: respect mute switch, volume slider in settings
- [ ] New `src/engine/audio.ts` with audio manager
- [ ] Vitest: unit tests for biome→audio mapping, material→sound mapping, mute state

### US-049: Tomte Entity and Teaching AI
As a player, I want a grumpy gnome companion who teaches me rune etching through demonstration so that the tutorial is diegetic.

**Acceptance Criteria:**
- [ ] Tomte: multi-part creature — small rounded box body, sphere head, red cone cap (spring physics), white beard chain (spring), 2 stubby IK legs. Colors: earth brown body, Falu red `#8b2500` cap, björk white `#e0d5c1` beard
- [ ] Singleton per world with unique AI state machine: Watching, Teaching, Examining, Settling, Hiding, Celebrating
- [ ] **Day 1 — Introduction**: waits at spawn stenhög, hops down, walks to stone, etches Kenaz, points at glow, leaves chisel on ground. No text.
- [ ] **Days 2-5 — Face etching**: demonstrates multi-face etching near player builds. Teaches tap-and-wheel method. After player etches 3+ distinct runes, demonstrates drag-to-etch (expert mode unlock).
- [ ] **Days 5-15 — Computational discovery**: builds small demo circuits (Naudiz inverter, Isa delay, Hagalaz gate) near settlement, only for runes player hasn't used yet.
- [ ] Never builds anything the player has already built — fills knowledge gaps only.
- [ ] Vitest: unit tests for state machine transitions, knowledge gap detection, demo circuit selection

### US-050: Tomte Settlement Integration
As a player, I want the Tomte to live in my settlement and react to my builds so that he feels like a living companion.

**Acceptance Criteria:**
- [ ] **Days 15+**: Tomte settles at Hearth archetype, sleeps by fire, tends mushroom garden
- [ ] Examines novel rune machines: if topology is new to Tomte, inspects with visible curiosity (scratches beard)
- [ ] Hides from chaotic self-modifying circuits or Mörker proximity (covers eyes, retreats to garden)
- [ ] Celebrates when Settlement archetype first achieved (dances, throws cap)
- [ ] Sagan integration: Tomte milestones recorded as narrative entries
- [ ] Vitest: unit tests for novelty detection (topology comparison), reaction behavior dispatch, settlement-settling trigger

### US-051: Drag-to-Etch Expert Mode
As an experienced player, I want to draw rune patterns by dragging across block faces so that inscription is faster.

**Acceptance Criteria:**
- [ ] Unlocked after player has etched 3+ distinct rune types (tracked by Tomte)
- [ ] Drag pattern determines rune: ↓ = Isa, ✕ = Hagalaz, ∧ = Kenaz, etc. for each rune
- [ ] Both tap-wheel and drag modes remain available after unlock
- [ ] Visual feedback: drag trail shows on block face during gesture
- [ ] Vitest: unit tests for pattern recognition (gesture path → rune mapping), unlock condition
- [ ] Playwright CT: drag gesture visualization on block face mock

### US-052: Emergent Machine Discovery
As a player, I want the game to recognize novel circuit topologies I've invented so that creativity is rewarded.

**Acceptance Criteria:**
- [ ] Auto-detect novel circuit topologies not previously built by the player
- [ ] Novel machines recorded in Kunskapen with auto-generated description
- [ ] Tomte reacts to novel topologies (Examining state)
- [ ] Archetype recognition extends to player-invented compound behaviors
- [ ] Vitest: unit tests for topology fingerprinting, novelty comparison, Kunskapen entry generation

### US-053: Playwright E2E Test Suite
As a developer, I want end-to-end tests covering the React UI layer so that full UI flows are verified.

**Acceptance Criteria:**
- [ ] Playwright e2e config for full-page tests (separate from CT config)
- [ ] Title screen → New Game → game starts flow tested
- [ ] Death screen → respawn flow tested
- [ ] Bok open → navigate all tabs → close flow tested
- [ ] CraftingMenu open → craft item → inventory updates flow tested
- [ ] Mobile controls layout verification at mobile viewport sizes
- [ ] Settings toggles (vitals bar, render distance) flow tested
- [ ] All e2e tests target React UI layer only (no canvas/Three.js interaction)

---

## Functional Requirements

- FR-1: All game state must live in Koota ECS traits; rendering layer reads but never owns state
- FR-2: All ECS systems must use the side-effect callback pattern — no Three.js imports in system files
- FR-3: Every new trait must serialize to SQLite via the persistence layer in `db.ts`
- FR-4: Every block texture must use colors from the palette in `docs/design/art-direction.md`
- FR-5: Every creature name, biome name, and mechanic name must be Swedish
- FR-6: Touch input must be the primary interaction method; keyboard/mouse are enhancements
- FR-7: Signal propagation must run at 4 ticks/second with max 128 blocks evaluated per tick
- FR-8: All interactive UI elements must be minimum 48×48 CSS pixels for touch targets
- FR-9: The game must auto-save on app background (visibilitychange) and every 60 seconds
- FR-10: `.tsx` files contain UI rendering only; game logic lives in `.ts` files
- FR-11: No file should exceed ~200 LOC; extract components/hooks aggressively
- FR-12: Rune discovery must be diegetic — through world observation, not menus
- FR-13: Archetype recognition must be functional (checks capability), not structural (checks block arrangement)

## Non-Goals (Out of Scope)

- Multiplayer or ghost economy (Monolith Market)
- Armor system (wait for combat to stabilize through testing)
- Boat/raft mechanics for water traversal
- Weather particles (rain, snow falling)
- Chisel decorative block shaping (beyond rune inscription)
- Custom color schemes or theme system
- App store deployment (Capacitor native builds)
- PWA service worker caching
- Procedural music generation (Tone.js)
- Community-shared saga fragments / ghost archaeology (Phase G stretch)

## Technical Considerations

- **Koota ECS** (v0.6.5) owns all game state; systems are pure functions
- **Jolly Pixel** engine provides Actor/Behavior pattern and VoxelRenderer
- **Three.js** (v0.182) for 3D rendering, instanced meshes for particles/creatures
- **Capacitor SQLite** for persistence (WASM on web, native on mobile)
- **Vitest** for unit testing ECS systems, pure functions, and game logic
- **Playwright CT** for React component visual testing
- **Playwright e2e** for full React UI flow testing (not canvas interactions)
- Signal propagation BFS must stay within 128-block budget for mobile performance
- All terrain generation must be deterministic from seed
- Voxel delta pattern: only player modifications stored, not full world state

## Success Metrics

- All 53 user stories completed with acceptance criteria met
- `pnpm typecheck && pnpm lint && pnpm test && pnpm test-ct` passes clean
- 6 distinct biomes generating correctly from noise-based selection
- 11 creature types (+ Tomte singleton + Norrsken event) with multi-part geometry and procedural animation
- All 15 runes discoverable and functional in signal propagation system
- Bok journal with 4 functional pages (Kartan, Listan, Kunskapen, Sagan)
- Archetype recognition detects Hearth, Workshop, Ward, Beacon, Trap, Farm, Gate, Settlement
- Computational circuits buildable: NOT, AND, OR, NAND, flip-flop, clock, counter
- 60fps maintained on mid-range mobile at 2-chunk render distance
- All React UI components have Playwright CT tests
- Full UI flows covered by Playwright e2e tests

## Open Questions

- Should the drag-to-etch gesture patterns be configurable or fixed per rune?
- What is the optimal game-day duration for season cycles (real-time minutes per game-day)?
- Should crystal amplification stack (multiple crystals in chain) or cap at a single ×1.5?
- How should rune inscription state interact with the voxel delta persistence — extend voxel_deltas table or create a separate rune_inscriptions table?
- What is the Tomte's behavior when the player is in Blothögen (corrupted biome)? Does he refuse to enter, or enter with hiding behavior?