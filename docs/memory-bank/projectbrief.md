---
title: Project Brief
domain: memory-bank
status: current
last-verified: 2026-03-16
summary: "Core identity -- Swedish folklore 4X voxel survival, Bok = book + beech + rune"
---

# Project Brief -- Bok

## Identity

- **Name:** Bok
- **Tagline:** "The world is a living saga"
- **Genre:** Mobile-first 4X voxel survival
- **Platform:** Mobile-first PWA (portrait) + desktop browser
- **Core metaphor:** "Bok" = book + beech tree + rune-carving. The Swedish word *bok* means both "book" and "beech tree," and the English word "book" derives from Proto-Germanic *boko* (beech) because runes were carved into beech bark. The book IS the tree.

## Premise

You awaken on stone in a land that feels like Scandinavia dreaming of itself. The world was once a complete saga -- a finished story told by ancient builders. But the telling unraveled. The runes scattered. What remains are runestones that hint at structure, creatures that move like living kennings, and a landscape trying to remember the poem it once was.

> *"En varld minns de som formar den."* -- "A world remembers those who shape it."

## Swedish Folklore Foundation

Creatures are drawn from Swedish and Norse folklore, not generic fantasy. They are part of the landscape:

| Creature | Origin | Role |
|----------|--------|------|
| **Morker** | Darkness embodied | Hostile, fears light, hunts at night |
| **Vittra** | Underground folk | Neutral, territorial, debuff aura |
| **Lindormar** | Serpent-worms | Boss, tunnel through terrain |
| **Draugar** | Undead walkers | Hostile, gaze mechanic |
| **Tomte** | House gnome | Companion, rune teacher |
| **Nacken** | Water spirit | Neutral, music aura |
| **Trana** | Crane | Passive, flock boids |
| **Lyktgubbe** | Will-o'-wisp | Passive, drifting light |
| **Runvaktare** | Rune guardian | Boss, protects runestones |
| **Jatten** | Giant | Boss, multi-phase fight |

Full bestiary: `docs/world/creatures.md`

## 4X Pillars

Every feature must serve at least one pillar:

- **eXplore** -- Fog-of-war, 6 biomes, landmarks, runestones, day/night cycle
- **eXpand** -- Building, settlement founding, workstations, shelter, territory
- **eXploit** -- Crafting, rune inscription, resource processing, cooking
- **eXterminate** -- Creature combat, boss fights, settlement defense, inscription level scaling

Details: `docs/gameplay/4x-pillars.md`

## 6 Biomes

| Biome | Swedish Name | Terrain |
|-------|-------------|---------|
| Meadow | Angen | Grass, wildflowers, birch |
| Beech Forest | Bokskogen | Dense beech canopy, moss |
| Mountains | Fjallen | Snow, ice, exposed stone |
| Archipelago | Skargarden | Islands, water, rocky shores |
| Bog | Myren | Peat, mushrooms, fog |
| Corruption | Blothogen | Soot, corrupted stone, dead trees |

Details: `docs/world/biomes.md`

## Core Swedish Concepts

- **Allemanstratten** (Right to Roam) -- No locked zones, no level gates. Danger scales with distance.
- **Lagom** (Just Enough) -- Inscription level penalizes overbuilding. Modest structures are strategic.
- **Fika** (Ritual Pause) -- 5-15 minute sessions. Open, do one meaningful thing, close.
- **Slojd** (Craft) -- The player is a crafter. The world is their workbench.

Details: `docs/world/lore.md`

## The Bok (Diegetic Journal)

The player's inventory/journal is a physical birch-bark book called the Bok. Its pages:

- **Kartan** (The Map) -- Explored terrain as ink on birch bark
- **Listan** (The Ledger) -- Inventory as tally marks on parchment
- **Kunskapen** (The Knowledge) -- Creature codex, recipes, rune meanings
- **Sagan** (The Saga) -- Quest progress written as narrative prose

## Creature Aesthetic

Building-block creatures inspired by Scandinavian wooden toys -- articulated, multi-part, procedurally animated. Never a single box mesh. Multi-bone hierarchies with IK solvers and spring physics.

Details: `docs/world/creatures.md`, `docs/design/art-direction.md`

## Computational Rune System

Runes inscribed on block faces are not just decorations -- they carry signals through conducting blocks. The system is Turing-complete:

- **Emitters:** Kenaz (heat), Sowilo (light)
- **Interactions:** Jera (transform), Fehu (collect), Ansuz (detect), Thurisaz (damage)
- **Protection:** Algiz (ward), Mannaz (calm), Berkanan (growth)
- **Computation:** Naudiz (NOT), Isa (DELAY), Hagalaz (AND)
- **Self-modifying circuits** enable full computational power

Details: `docs/gameplay/4x-pillars.md`

## Target Session Length

5-15 minutes. Micro-goals always within 1-2 minutes. Auto-save on app background.
