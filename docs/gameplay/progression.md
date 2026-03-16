# Progression System

## Philosophy

Progression in Bok is **emergent, not prescribed**. There is no level system, no XP bar, no skill tree. Instead, progression comes from three sources:

1. **Knowledge** — what the player has discovered (Kunskapen entries, lore, recipes)
2. **Materials** — what the player has gathered and crafted (tool tiers, block types)
3. **Territory** — what the player has built and defended (settlement size, inscription level)

## Current Quest System

The existing quest system is a tutorial scaffold:

| Step | Objective | Purpose |
|------|-----------|---------|
| 0 | Gather 5 Wood | Teaches mining |
| 1 | Craft Wood Axe | Teaches crafting |
| 2 | Mine 10 Stone | Teaches tool efficiency |
| 3 | Build & Survive | Open-ended |

This should evolve into a **discovery-driven** system.

## Planned Progression Arc

### Act I — Awakening (First Day)

- **Goal**: Survive the first night
- **Discovers**: Basic mining, crafting, block placement, day/night cycle
- **Threats**: Mörker (weak initial spawns)
- **Milestone**: Build first shelter (enclosed space detected)

### Act II — The Margin (Days 2-4)

- **Goal**: Establish a base, explore the starting biome
- **Discovers**: Tool tiers, food systems, creature observation, the Bok journal
- **Threats**: Mörker grow in number, Näcken contest territory
- **Milestone**: Craft first workstation, fill first Kunskapen entry

### Act III — Beyond the Margin (Days 5-15)

- **Goal**: Explore a second biome, find first Fornlämning
- **Discovers**: Biome-specific resources, Runväktare, advanced recipes, lore fragments
- **Threats**: Runväktare at ruins, Vittra in forests, Lindormar in soft terrain
- **Milestone**: Defeat first Runväktare, read first lore inscription

### Act IV — The Inscription (Days 15-30)
- **Goal**: Build a significant settlement, attract ecosystem
- **Discovers**: Territory effects, creature ecosystems, deep mining, rare materials
- **Threats**: Draugar at night, creature raids on settlement
- **Milestone**: Settlement reaches "hamlet" size, inscription level triggers Jätten warning

### Act V — Jätten (Days 30+)
- **Goal**: Confront Jätten, earn permanent building rights
- **Discovers**: Boss mechanics, post-boss biome transformation
- **Threats**: Jätten itself
- **Milestone**: Runsten Seal obtained, new biome unlocked

## Inscription Level

The world tracks how much the player has modified it:

```
inscription_level = total_blocks_placed + (total_blocks_mined * 0.5) + (structures_built * 10)
```

This drives:
- Creature spawn rates and tier
- Fornlämningar activation (Runväktare wake at inscription level 100+)
- Jätten trigger (inscription level 1000+)
- Environmental changes (more Lyktgubbar near builds at low levels, Mörker at high levels)

The player is literally writing themselves into the world's story, and the world responds proportionally.

## Crafting Tiers

| Tier | Materials | Unlocks | Workstation |
|------|-----------|---------|-------------|
| 0 — Hand | Wood, Stone | Basic tools, planks, torches | None (crafting menu) |
| 1 — Bench | Planks, Bricks, Glass | Improved tools, basic furniture | Crafting Bench |
| 2 — Forge | Iron, Coal, Treated Wood | Metal tools, light sources, mechanisms | Forge |
| 3 — Scriptorium | Crystal, Glyph Fragments, Ink | Enchanted tools, Bok upgrades, fast travel | Scriptorium |
| 4 — Scriptorium II | Runsten Seal, Rare Crystals | Permanent structures, biome shaping | Scriptorium |

Each workstation is a physical block placed in the world. The player must be near it to access its recipes.