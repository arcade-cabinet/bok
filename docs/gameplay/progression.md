# Progression System

## Philosophy

Progression in Bok is **emergent, not prescribed**. There is no level system, no XP bar, no skill tree. Instead, progression comes from three sources:

1. **Knowledge** — what the player has discovered (Kunskapen entries, lore, recipes)
2. **Materials** — what the player has gathered and crafted (tool tiers, block types)
3. **Territory** — what the player has built and defended (settlement size, inscription level)

## 5-Act Progression Arc

Source: `src/ecs/systems/progression-arc.ts`

Acts are computed dynamically from `ProgressionState` — they are not time-gated. Each act requires the previous act's gate plus its own conditions.

| Act | Name | Inscription Threshold | Conditions |
|-----|------|-----------------------|-----------|
| I | Awakening | 0 | — |
| II | The Margin | 10 | Shelter built |
| III | Beyond the Margin | 100 | Workstation + 2+ biomes discovered |
| IV | The Inscription | 300 | Runväktare defeated + hamlet settlement |
| V | Jätten | 1000 | Boss defeated |

### Act I — Awakening
- **Objective**: Survive the first night — build a shelter before darkness falls.
- **Saga prose**: "The wanderer opened their eyes to a strange land. With bare hands and birch bark, the first chapter begins."

### Act II — The Margin
- **Objective**: Establish your base. Craft a workstation and fill your first Kunskapen entry.
- **Saga prose**: "Walls rose, a workbench took shape. The margin of the wild grew smaller — the wanderer claims a foothold."

### Act III — Beyond the Margin
- **Objective**: Explore a second biome. Find a Fornlämning and defeat its Runväktare.
- **Saga prose**: "New lands beckoned beyond the familiar hills. At the old ruins, a Runväktare stood guard over forgotten knowledge."

### Act IV — The Inscription
- **Objective**: Grow your settlement to hamlet size. The Jätten stirs.
- **Saga prose**: "Stone by stone, a hamlet emerged. The runes carved deep enough that the earth itself took notice — the Jätten stirs."

### Act V — Jätten
- **Objective**: Confront the Jätten and earn the Runsten Seal.
- **Saga prose**: "The ancient giant fell. The Runsten Seal was earned, and the wanderer's saga etched forever into the world's memory."

## Inscription Level

Source: `src/ecs/systems/inscription-level.ts`

The world tracks how much the player has modified it:

```
inscription_level = (blocks_placed × 1) + (blocks_mined × 0.5) + (structures_built × 10)
```

### Creature Thresholds

| Level | Event |
|-------|-------|
| 100 | Runväktare wake — patrol near landmarks |
| 300 | Lindormar attracted — mining vibrations draw them |
| 1000 | Jätten stirs from its mountain |

### Spawn Rate Multipliers

| Level Range | Spawn Multiplier |
|------------|-----------------|
| 0–49 | 1.0× |
| 50–199 | 1.2× |
| 200–499 | 1.5× |
| 500+ | 2.0× |

The player is literally writing themselves into the world's story, and the world responds proportionally.

## Tomte Tutorial (Act I)

Source: `src/ecs/systems/tomte-ai.ts`, `src/ecs/systems/tomte-spawn.ts`

The Tomte is a gnome companion that guides Act I. It is a singleton entity — only one Tomte exists at a time.

**Lifecycle:**
- Spawns immediately on fresh game (or on first structure built)
- Despawns after 3 rune inscriptions are discovered

**Behavior states:**
- When player is within 8 blocks: Idle state — shows hint text "The Tomte watches with keen eyes…"
- When player is farther: wanders toward player with slight random drift

**Hint system:** `getTomteHint()` returns the current hint string for display in `TomteHint.tsx`.

## Quest System

The current quest system (`src/ecs/systems/quest.ts`) is a tutorial scaffold:

| Step | Objective | Purpose |
|------|-----------|---------|
| 0 | Gather 5 Wood | Teaches mining |
| 1 | Craft Wood Axe | Teaches crafting |
| 2 | Mine 10 Stone | Teaches tool efficiency |
| 3 | Build & Survive | Open-ended |

This will evolve into a discovery-driven system where quest hints are woven into the Sagan (journal) as narrative prose.

## Crafting Tiers

| Tier | Materials | Unlocks | Workstation |
|------|-----------|---------|-------------|
| 0 — Hand | Wood, Stone | Basic tools, planks, torches | None |
| 1 — Bench | Planks, Bricks, Glass | Improved tools, basic furniture | Crafting Bench |
| 2 — Forge | Iron, Coal, Treated Wood | Metal tools, light sources, armor | Forge |
| 3 — Scriptorium | Crystal, Rune Stone, Peat | Enchanted tools, Bok upgrades, Rune Seals | Scriptorium |

Each workstation is a physical block placed in the world. The player must be near it to access its recipes. See [crafting.md](crafting.md) for the full recipe list.
