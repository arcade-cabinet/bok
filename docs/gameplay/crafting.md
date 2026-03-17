# Crafting System

## Recipe Count

34 recipes across 4 tiers (source: `src/world/blocks.ts` `RECIPES` array):

| Tier | Workstation | Recipe Count |
|------|------------|-------------|
| 0 — Hand | None | 8 |
| 1 — Bench | Crafting Bench | 6 |
| 2 — Forge | Forge | 14 |
| 3 — Scriptorium | Scriptorium | 6 |

## Workstation Blocks

| Block | Block ID | Crafted At | Cost |
|-------|----------|-----------|------|
| Crafting Bench | 35 | Hand (tier 0) | 4 Planks + 2 Wood |
| Forge | 36 | Crafting Bench (tier 1) | 8 Stone + 4 Iron Ore + 2 Torch |
| Scriptorium | 37 | Forge (tier 2) | 4 Treated Planks + 2 Crystal + 1 Rune Stone |

## Recipe Tables

### Tier 0 — Hand (always available)

| Recipe | Cost | Result |
|--------|------|--------|
| Wood Planks x4 | 1 Wood | Block |
| Torches x4 | 1 Wood | Block |
| Stone Bricks x4 | 4 Stone | Block |
| Mystic Glass x1 | 1 Sand | Block |
| Wooden Axe | 3 Wood | Tool |
| Wooden Pickaxe | 5 Wood | Tool |
| Cooked Meat | 1 Raw Meat + 1 Torch | Food |
| Crafting Bench | 4 Planks + 2 Wood | Workstation block |

### Tier 1 — Crafting Bench

| Recipe | Cost | Result |
|--------|------|--------|
| Stone Pickaxe | 5 Stone | Tool |
| Stone Sword | 2 Wood + 3 Stone | Tool |
| Lantern | 1 Glass + 1 Iron Ore | Light item |
| Forge | 8 Stone + 4 Iron Ore + 2 Torch | Workstation block |
| Treated Planks x4 | 4 Planks + 1 Peat | Building material |
| Crystal Dust x4 | 1 Crystal | Material |

### Tier 2 — Forge

| Recipe | Cost | Result |
|--------|------|--------|
| Iron Pickaxe | 5 Iron Ore + 2 Wood | Tool |
| Iron Axe | 3 Iron Ore + 2 Wood | Tool |
| Iron Sword | 4 Iron Ore + 1 Wood | Tool |
| Ember Lantern | 2 Glass + 2 Iron Ore + 1 Copper Ore | Light item |
| Reinforced Bricks x4 | 4 Stone Bricks + 2 Iron Ore | Building material |
| Scriptorium | 4 Treated Planks + 2 Crystal + 1 Rune Stone | Workstation block |
| Chisel | 3 Iron Ore + 1 Crystal | Tool |
| Iron Helmet | 5 Iron Ore + 1 Copper Ore | Armor |
| Iron Chestplate | 8 Iron Ore + 2 Copper Ore | Armor |
| Iron Greaves | 6 Iron Ore + 1 Copper Ore | Armor |
| Näcken Shell Plate | 3 Iron Ore + 2 Copper Ore + 1 Crystal | Creature-drop armor |
| Lindorm Scale Mail | 5 Iron Ore + 3 Stone + 1 Crystal | Creature-drop armor |
| Mörker Cloak | 2 Iron Ore + 3 Peat + 1 Crystal | Creature-drop armor |
| Runväktare Runeguard | 4 Iron Ore + 1 Rune Stone + 2 Crystal | Creature-drop armor |

### Tier 3 — Scriptorium

| Recipe | Cost | Result |
|--------|------|--------|
| Crystal Lens | 2 Glass + 1 Crystal | Material |
| Glyph Lamp | 1 Crystal Lens + 2 Crystal + 1 Iron Ore | Light item |
| Enchanted Chisel | 1 Chisel + 2 Crystal + 1 Rune Stone | Tool |
| Bok Binding | 4 Treated Planks + 2 Crystal + 1 Copper Ore | Bok upgrade |
| Lore Ink | 2 Crystal Dust + 1 Peat + 1 Cranberry | Bok upgrade |
| Rune Seal | 4 Rune Stone + 2 Crystal + 2 Iron Ore | Territory block |

## Design Principles

### 1. Crafting is Physical
Crafting happens at **workstations placed in the world**, not in a floating menu. Workstations are blocks the player must build and stand near.

- **Hand Crafting**: Only the simplest recipes (planks, torches, basic tools). Available anywhere.
- **Crafting Bench**: Most stone tools, lighting, and intermediate materials.
- **Forge**: All iron tools, armor, and the Scriptorium itself.
- **Scriptorium**: Enchanted tools, Bok upgrades, Rune Seals, and Glyph Lamps.

### 2. Recipes are Discovered, Not Given
The player starts knowing only hand-craft recipes. New recipes are discovered through:
- **Exploration**: Lore inscriptions in Fornlämningar contain recipe blueprints
- **Experimentation**: Combining unusual materials at a workstation (guided hints in Kunskapen)
- **Creature Study**: Filling a creature's Kunskapen entry reveals recipes using its drops

### 3. Resource Chains Have Depth
Tier 0 materials transform into tier 1, which combine into tier 2:

```text
Wood → Planks → Treated Planks (planks + peat)
Stone → Bricks → Reinforced Bricks (bricks + iron)
Sand → Glass → Crystal Lens (glass + crystal)
Crystal → Crystal Dust → Lore Ink (dust + peat + cranberry)
```

### 4. Tool Durability
Tools wear out over use, creating a maintenance loop. Durability is tracked in `src/ecs/systems/tool-durability.ts`:
- Wood tools: 50 uses
- Stone tools: 150 uses
- Iron tools: 500 uses

## Crafting UI Direction

The crafting menu should evolve from the current overlay to a **page in the Bok** (the player's book). Opening the Bok shows available recipes on parchment-textured pages, with ink illustrations of the items. Unavailable recipes show as faded/incomplete drawings that fill in as materials are gathered.

On mobile, crafting should support:
- One-tap craft for known recipes with sufficient materials
- Swipe between recipe categories (pages of the Bok)
- Long-press for recipe details
- Drag from Bok to hotbar for equipped items
