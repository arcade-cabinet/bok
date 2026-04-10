---
title: Design
updated: 2026-04-09
status: current
domain: product
---

# Design — Bok: The Builder's Tome

## Identity

**Bok: The Builder's Tome** is a voxel exploration-adventure with infinite procedurally generated worlds. Players explore, build, fight, and discover across many unique islands, each with its own character.

- **Genre:** Open-world voxel adventure with roguelike progression
- **Art Style:** CubeWorld voxel aesthetic — cohesive, colorful, readable (Kenney/Quaternius asset library)
- **Session:** 15–30 min per run, 1+ hour total content through replayability
- **Multiplayer:** Single-player only

## Core Loop

```
Hub Island → Set Sail → Explore Island → Boss Fight → Return/Push On → Hub
     ^                                                                   |
     +---------------------------- death or victory --------------------+
```

1. **Hub Island** — Permanent home. Build structures, upgrade Tome, buy gear from NPC merchants.
2. **Set Sail** — Walk to a dock and choose an unlocked island.
3. **Explore & Fight** — Procedurally generated island with enemies, loot, landmarks, boss.
4. **Boss Fight** — Learnable attack patterns, 3 phases, grants a Tome page on defeat.
5. **Return or Push On** — Return to Hub with loot OR sail to the next island. Death loses run gear but keeps Tome pages.

## Progression Systems

### Tome Pages (Permanent — survive death)

One per biome boss. Example pages: Dash, Ground Pound, Block Shield, Fire Lance, Ice Path, Wind Jump, Shadow Step, Stone Skin.

### Gear (Per-Run — lost on death)

Weapons, armor, consumables found on islands. Melee: swords, axes, hammers, daggers, spears. Ranged: bows, staffs, wands.

### Hub Upgrades (Permanent)

Five upgradeable buildings: Armory (starting gear), Docks (more island choices), Library (Tome upgrades), Market (island shops), Forge (crafting between runs).

## Diegetic Design Principle

Everything is in the world — no external menus for island selection. The player physically walks to a dock on the Hub, reads the signpost, and sails. Locked islands show a "Come Back Later" parchment note on the dock. This is the core UX philosophy.

## Island Biomes

Eight biomes, each with unique terrain, block palette, enemies, and boss:

| Biome | Character |
|-------|-----------|
| Forest | Dense, verdant, mysterious |
| Desert | Vast, ancient, scorching |
| Tundra | Harsh, pristine, isolated |
| Volcanic | Dangerous, dramatic, fiery |
| Swamp | Murky, treacherous, hidden |
| Crystal Caves | Magical, glowing, otherworldly |
| Sky Ruins | Floating, ancient, vertiginous |
| Deep Ocean | Dark, alien, crushing |

Each island generated from `seed + biomeId` — deterministic, infinite, unique.

## Visual Identity

- **Theme:** `parchment` — a custom daisyUI v5 theme using OKLCH colors
- **Primary bg:** `#fdf6e3` (parchment), **ink:** `#2c1e16`, **gold:** `#c4a572`
- **Fonts:** Cinzel (headings), Crimson Text (body), Cormorant Garamond (lore), JetBrains Mono (code)
- All fonts self-hosted via `@fontsource/*` — no CDN dependency

## Modes

- **Survival** — Goals, boss gate, dock unlocks, gear lost on death
- **Creative** — No goals, all docks open, build freely

## What Bok Is NOT

- Not a multiplayer game
- Not a permadeath roguelike (Tome pages are permanent)
- Not a narrative game (world and lore are environmental, not cutscene-driven)
- Not a mobile-first design (desktop is primary, mobile is first-class but not sole target)
