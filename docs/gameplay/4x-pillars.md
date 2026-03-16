# The Four Pillars — 4X in a Voxel World

Bok is a **4X survival game** disguised as a Scandinavian voxel sandbox. The four pillars are not menus or modes — they are emergent from the world's systems interacting. The Swedish concept of **allemansrätten** (freedom to roam) underpins exploration, **lagom** (just enough) governs expansion, **slöjd** (craft) drives exploitation, and the long dark Swedish winter gives extermination its teeth.

## eXplore

**The world rewards curiosity.**

### Discovery Loop
1. Player sees something unfamiliar on the horizon (Fornlämning tower, biome boundary, creature behavior)
2. Player travels to investigate (risk: distance from base, resource consumption)
3. Player discovers something valuable (lore fragment, rare resource, crafting knowledge, creature observation)
4. Discovery is recorded in the Bok (the player's book/journal) and persists

### Mechanics
- **Fog of War**: The Bok's Kartan page starts blank. Explored terrain is remembered. Unexplored terrain is parchment-colored void.
- **Fornlämningar** (Ancient remains): Procedurally generated ruins containing rune inscriptions, rare blocks, Vittra warrens, and ancient crafting stations. Each major ruin has a Runväktare that must be dealt with — or respected.
- **Creature Observation**: Watching creatures without disturbing them fills in their Kunskapen (knowledge) entry. Entries reveal weaknesses, drop tables, behavioral patterns. Observing Näcken at a distance teaches runes.
- **Biome Transitions**: Each biome maps to a real Swedish landscape (Ängen, Bokskogen, Fjällen, Skärgården, Myren). Unique resources, creatures, and hazards per biome.
- **Landmarks**: Runstenar (runestones) serve as fast-travel anchors once inscribed with ᚱ (Raido). Stenhögar (cairns) mark biome boundaries. Offerkällor (offering springs) are Vittra appeasement points.

### Mobile Consideration
Exploration must feel rewarding in short sessions. The mobile player might explore for 5 minutes on a bus. Landmarks should be visible within 2-3 chunks. Biome transitions should be noticeable quickly.

## eXpand

**What you build matters to the world.**

### Settlement Loop — Building Your Stuga
1. Player establishes a base (places blocks in a cluster) — the first **stuga** (cottage)
2. Base attracts Lyktgubbar (ambient light, makes area safer)
3. Extended base attracts passive creatures (Skogssniglar graze nearby, Tranor nest at nearby water)
4. Large enough structures — painted with **Falu red** blocks — reduce Mörker spawn radius
5. Eventually, the settlement becomes a Fornlämning of its own — future sagas built on yours (stretch)

### Mechanics
- **Territory**: Blocks placed by the player define territory. Creatures respond to territory differently — some avoid it, some are attracted.
- **Structure Recognition**: The game recognizes basic structures (walls, roofs, enclosed spaces). Enclosed spaces provide shelter bonuses (hunger decay reduction, stamina regen boost).
- **Workstations**: Crafting stations placed in the world expand available recipes. **Städ** (anvil) for tools, **Vävstol** (loom) for textiles, **Kolmila** (charcoal kiln) for smelting. Each station is a physical block built from materials.
- **Decay and Maintenance**: Structures slowly decay if unvisited — the Swedish forest reclaims everything. The player must maintain their builds or moss grows over them. The **Runsten Seal** (dropped by Jätten, the giant world boss) stops decay — your saga is deemed worthy.
- **Light Radius**: Torches and light sources expand the safe zone. Mörker won't spawn within torch radius. Building a well-lit perimeter of a **stuga** is strategic survival — like keeping the fire burning through a Swedish winter night.

### Mobile Consideration
Building in a voxel game on mobile requires careful UX. Block placement should have snap-to-grid assistance, undo support, and template/blueprint modes for repeating structures. One-tap placement of known patterns.

## eXploit

**Resources have depth, not just quantity.**

### Resource Loop
1. Surface resources are common but low-tier (wood, stone, dirt, sand)
2. Crafting transforms resources into higher-tier materials (planks, glass, bricks)
3. Rare resources require exploration (cave ores, Fornlämning materials, creature drops)
4. Advanced crafting chains produce powerful items (multi-step recipes)
5. The best resources require territorial control (defended mine, cleared Fornlämning)

### Mechanics
- **Resource Chains**: Wood → Planks → Treated Planks → Composite. Stone → Bricks → Reinforced Bricks → Foundation. Each tier unlocks new structures and tools.
- **Creature Harvesting**: Skogssnigel shell plates, Trana feathers, Lindorm scales, Mörker essence, Runsten fragments. Each drops from specific creature interactions (not just killing — lagom applies to harvesting too).
- **Farming**: Plant saplings (wood drops), grow crops (food alternatives to hunger decay), cultivate Lyktgubbe gardens (light sources).
- **Mining Depth**: Underground resources at different depths. Iron at 5-15 blocks deep, copper at 10-20, crystal at 20+. Requires light, structural support, air (future).
- **Trade**: Place a Monolith Market to exchange resources asynchronously with other players' worlds (stretch — ghost economy).

### Mobile Consideration
Resource management should be glanceable. The Bok's Listan page shows resources as a simple list with counts. Crafting chains should be visualized as trees, not grids. One-tap crafting for known recipes.

## eXterminate

**The world fights back, and you must answer.**

### Combat Loop — The Long Night
1. Night brings **Mörker** — the Swedish winter darkness given form
2. Expanding territory provokes **Runväktare** near Fornlämningar
3. Mining attracts **Lindormar** (wyrms drawn to vibrations)
4. Deep exploration encounters **Draugar** (the restless dead at burial mounds)
5. Massive building triggers **Jätten** (the giant tests your saga)

### Mechanics
- **Threat Escalation**: The more you carve into the world, the more the world pushes back. Building increases the local inscription level. The Swedish landscape doesn't want to be tamed — it tolerates lagom, punishes excess.
- **Light as Weapon**: In Sweden, surviving winter means surviving darkness. Torches damage Mörker. **Glödlykta** (ember lanterns) create mobile safe zones. Light management is the core combat strategy — you are literally fighting the long dark with warmth and craft.
- **Creature Weaknesses**: Each creature has vulnerabilities documented in the Kunskapen.
  - Mörker: light (they are the absence of it)
  - Lindormar: stone (they can't tunnel through it — build stone foundations)
  - Vittra: offerings (food placed at their mounds — respect, not violence)
  - Runväktare: patience (they only attack if you take from ruins)
  - Draugar: observation (face them — like facing your fears in the dark)
  - Näcken: iron offerings (from real folklore — throw iron in the water)
- **Territory Defense**: Build walls of **Falu red** blocks, light perimeters with torches and lanterns, and place rune wards (ᛉ Algiz — protection) to defend your stuga. Creatures path-find around obstacles. Strategic building is strategic survival.
- **Boss Events**: Jätten is a world event. It appears near the player's largest build and tests whether your saga is worthy of the land. Defeating it permanently changes the surrounding biome and yields the Runsten Seal.

### Mobile Consideration
Combat on mobile must be simple but tactical. Auto-targeting nearest enemy when attack button pressed. Swipe gestures for dodge/block. The Bok's "observe" mechanic for Draugar works perfectly on mobile — just keep the camera pointed at them.

## Pillar Interactions

The four pillars are not separate tracks — they feed each other:

```text
eXplore → discover rare resources → eXploit → craft better tools →
eXpand → build bigger settlements → attract stronger threats →
eXterminate → gain boss materials → unlock new biomes → eXplore
```

Every session, regardless of length, should touch at least two pillars. A 5-minute mobile session might be: mine resources (exploit) and fend off a night attack (exterminate). A 30-minute session might be: explore a new biome, discover a Fornlämning, fight a Runväktare, and haul loot home to expand a base.
