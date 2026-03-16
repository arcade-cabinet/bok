# Biomes and Terrain

## Current Biomes

The terrain generator uses 2D simplex noise to create height variation, with biome selection based on elevation and proximity to water.

| Biome | Condition | Surface | Subsurface | Features |
|-------|-----------|---------|------------|----------|
| Plains | Height 11-20 | Grass | Dirt (4 deep) → Stone | Trees |
| Beach | Height 9-11 | Sand | Sand → Stone | Near water |
| Mountains | Height > 21 | Snow | Stone | High elevation |
| Ocean | Height < 10 | Water | Sand → Stone | Water fill |

## Planned Biomes

### The Margin (Starting Biome)
The safe zone. Gentle terrain, scattered trees, shallow water. The spawn shrine sits here. Creatures are passive (Dustmotes, Thornbacks). This is where the player learns to write.

### The Manuscript (Temperate Forest)
Dense tree coverage, rolling hills, frequent Remnant ruins. Bindlings weave between trees. Glyphwardens guard the ruins. Resources are plentiful but territory is contested. This is where the player begins to expand.

### The Redaction (Desert/Badlands)
Stripped terrain — sand, exposed stone, deep canyons. The world looks like it was *erased*. Pagewyrms tunnel freely through the soft ground. Rare ores exposed in canyon walls. Water is scarce. This is where the player exploits.

### The Palimpsest (Swamp/Wetlands)
Terrain that has been written and rewritten — layers of different blocks visible in cross-section. Shallow water everywhere. Papyrus Cranes wade. Bioluminescent Dustmotes make it beautiful and eerie. Ancient structures half-submerged. Resources are unique (mossy variants, waterlogged wood).

### The Blot (Corrupted Zone)
Terrain tainted by Ink — dark blocks, inverted colors, no natural light penetration. Inklings are native here (no day/night cycle restriction). Hollowfolk wander even in light. The most dangerous biome, but contains the rarest materials. This is where the player exterminates.

### The Colophon's Wake (Post-Boss)
After defeating The Colophon, the terrain around the battle site transforms — new block types appear, the terrain smooths, and a new biome emerges that reflects the player's building style. Unique to each world.

## Terrain Generation Architecture

```
Seed → Simplex Noise → Height Map → Biome Selection → Block Placement → Tree/Feature Generation
```

Each chunk (16x16x32) is generated independently. The noise function is deterministic from the seed, so any chunk can be regenerated identically.

### Noise Layers (Current)
- **Continental**: Single octave, large scale — determines base elevation
- **Erosion**: Planned — fine-grained noise for surface detail

### Noise Layers (Planned)
- **Continental**: Base elevation (scale 200)
- **Erosion**: Surface roughness (scale 50)
- **Temperature**: North/south gradient + noise (biome selection)
- **Moisture**: East/west gradient + noise (biome selection)
- **Cave**: 3D noise for underground caverns (scale 30)
- **Ore**: 3D noise for mineral deposits (scale 15)

## Landmarks

Procedurally placed structures that serve as navigation aids and exploration targets:

- **Cairns**: Small stone stacks on hilltops. Visible from distance. Mark biome boundaries.
- **Remnant Towers**: Tall structures that pierce above tree canopy. Contain lore and loot.
- **Wells**: Water sources in dry biomes. Attract creatures. Social hubs.
- **Monoliths**: Single tall stone blocks in open terrain. Inscribed with lore. Fast-travel anchors.

## Underground

Currently the world is solid stone below the surface layer. Planned underground features:

- **Caves**: 3D noise carving. Connected cave networks with their own ecosystems.
- **Ore veins**: Iron, copper, crystal — depth-dependent rarity.
- **Underground water**: Flooded cave sections. Swimming + mining.
- **Deep Remnants**: The most intact fragments of the original text, deep underground.
