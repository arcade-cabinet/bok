# The Four Pillars — 4X in a Voxel World

Bok is a **4X survival game** disguised as a voxel sandbox. The four pillars are not menus or modes — they are emergent from the world's systems interacting.

## eXplore

**The world rewards curiosity.**

### Discovery Loop
1. Player sees something unfamiliar on the horizon (Remnant tower, biome boundary, creature behavior)
2. Player travels to investigate (risk: distance from base, resource consumption)
3. Player discovers something valuable (lore fragment, rare resource, crafting knowledge, creature observation)
4. Discovery is recorded in the Bok (the player's book/journal) and persists

### Mechanics
- **Fog of War**: The Bok's Atlas page starts blank. Explored terrain is remembered. Unexplored terrain is parchment-colored void.
- **Remnant Ruins**: Procedurally generated structures containing lore inscriptions, rare blocks, creature nests, and crafting stations. Each ruin has a Glyphwarden that must be dealt with.
- **Creature Observation**: Watching creatures without disturbing them fills in their Codex entry. Codex entries reveal weaknesses, drop tables, behavioral patterns.
- **Biome Transitions**: Each biome has unique resources, creatures, and environmental hazards. The player must adapt their tools and tactics per biome.
- **Landmarks**: Monoliths serve as fast-travel anchors once inscribed (player places a glyph). Cairns mark biome boundaries. Wells are social/resource hubs.

### Mobile Consideration
Exploration must feel rewarding in short sessions. The mobile player might explore for 5 minutes on a bus. Landmarks should be visible within 2-3 chunks. Biome transitions should be noticeable quickly.

## eXpand

**What you build matters to the world.**

### Settlement Loop
1. Player establishes a base (places blocks in a cluster)
2. Base attracts Dustmotes (ambient light, makes area safer)
3. Extended base attracts passive creatures (Thornbacks graze nearby)
4. Large enough structures attract Papyrus Cranes, reduce Inkling spawn radius
5. Eventually, the settlement becomes a Remnant of its own — other players' worlds might generate ruins inspired by your structures (stretch goal)

### Mechanics
- **Territory**: Blocks placed by the player define territory. Creatures respond to territory differently — some avoid it, some are attracted.
- **Structure Recognition**: The game recognizes basic structures (walls, roofs, enclosed spaces). Enclosed spaces provide shelter bonuses (hunger decay reduction, stamina regen boost).
- **Workstations**: Crafting stations placed in the world expand available recipes. Anvil for tools, Loom for textiles, Kiln for ceramics. Each station is a physical block, not a menu.
- **Decay and Maintenance**: Structures slowly decay if unvisited. The player must maintain their builds or the world reclaims them. The Colophon Seal (boss drop) stops decay.
- **Light Radius**: Torches and light sources expand the safe zone. Inklings won't spawn within torch radius. Building a well-lit perimeter is strategic.

### Mobile Consideration
Building in a voxel game on mobile requires careful UX. Block placement should have snap-to-grid assistance, undo support, and template/blueprint modes for repeating structures. One-tap placement of known patterns.

## eXploit

**Resources have depth, not just quantity.**

### Resource Loop
1. Surface resources are common but low-tier (wood, stone, dirt, sand)
2. Crafting transforms resources into higher-tier materials (planks, glass, bricks)
3. Rare resources require exploration (cave ores, Remnant materials, creature drops)
4. Advanced crafting chains produce powerful items (multi-step recipes)
5. The best resources require territorial control (defended mine, cleared Remnant)

### Mechanics
- **Resource Chains**: Wood → Planks → Treated Planks → Composite. Stone → Bricks → Reinforced Bricks → Foundation. Each tier unlocks new structures and tools.
- **Creature Harvesting**: Thornback shell plates, Papyrus Crane feathers, Wyrm segments, Inkling essence, Glyph fragments. Each drops from specific creature interactions (not just killing).
- **Farming**: Plant saplings (wood drops), grow crops (food alternatives to hunger decay), cultivate Dustmote gardens (light sources).
- **Mining Depth**: Underground resources at different depths. Iron at 5-15 blocks deep, copper at 10-20, crystal at 20+. Requires light, structural support, air (future).
- **Trade**: Place a Monolith Market to exchange resources asynchronously with other players' worlds (stretch — ghost economy).

### Mobile Consideration
Resource management should be glanceable. The Bok's Ledger page shows resources as a simple list with counts. Crafting chains should be visualized as trees, not grids. One-tap crafting for known recipes.

## eXterminate

**The world fights back, and you must answer.**

### Combat Loop
1. Night brings Inklings — the baseline threat
2. Expanding territory provokes Glyphwardens near ruins
3. Mining attracts Pagewyrms
4. Deep exploration encounters Hollowfolk
5. Massive building triggers The Colophon

### Mechanics
- **Threat Escalation**: The more the player writes into the world, the more the world pushes back. Building increases the local "inscription level" which controls spawn rates and creature tiers.
- **Light as Weapon**: Torches damage Inklings. Fire arrows disperse packs. The Ember Lantern (crafted) creates a mobile safe zone. Light management is combat strategy.
- **Creature Weaknesses**: Each creature has specific vulnerabilities documented in the Codex.
  - Inklings: light
  - Pagewyrms: stone (they can't tunnel through it)
  - Bindlings: fire (burns webs)
  - Glyphwardens: patience (they only attack if you take blocks)
  - Hollowfolk: observation (just look at them)
- **Territory Defense**: Place walls, light perimeters, and traps to defend settlements. Creatures path-find around obstacles. Strategic building is strategic defense.
- **Boss Events**: The Colophon is a world event, not a dungeon. It appears near the player's builds and must be dealt with in the open world. Defeating it permanently changes the biome.

### Mobile Consideration
Combat on mobile must be simple but tactical. Auto-targeting nearest enemy when attack button pressed. Swipe gestures for dodge/block. The Bok's "observe" mechanic for Hollowfolk works perfectly on mobile — just keep the camera pointed at them.

## Pillar Interactions

The four pillars are not separate tracks — they feed each other:

```
eXplore → discover rare resources → eXploit → craft better tools →
eXpand → build bigger settlements → attract stronger threats →
eXterminate → gain boss materials → unlock new biomes → eXplore
```

Every session, regardless of length, should touch at least two pillars. A 5-minute mobile session might be: mine resources (exploit) and fend off a night attack (exterminate). A 30-minute session might be: explore a new biome, discover a Remnant, fight a Glyphwarden, and haul loot home to expand a base.
