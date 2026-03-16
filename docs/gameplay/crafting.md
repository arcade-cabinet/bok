# Crafting System

## Current Recipes

| Recipe | Cost | Result | Type |
|--------|------|--------|------|
| Planks | 1 Wood | 4 Planks | Block |
| Torches | 1 Wood | 4 Torches | Block |
| Stone Bricks | 4 Stone | 4 Stone Bricks | Block |
| Mystic Glass | 1 Sand | 1 Glass | Block |
| Wooden Axe | 3 Wood | 1 Axe | Item (tool) |
| Wooden Pickaxe | 5 Wood | 1 Pickaxe | Item (tool) |
| Stone Pickaxe | 5 Stone | 1 Pickaxe | Item (tool) |
| Stone Sword | 2 Wood, 3 Stone | 1 Sword | Item (tool) |

## Design Principles

### 1. Crafting is Physical
Crafting should happen at **workstations placed in the world**, not in a floating menu. The current E-key crafting menu is a temporary scaffold. The vision:

- **Hand Crafting**: Only the simplest recipes (planks, torches). Available anywhere.
- **Crafting Bench**: Placed block. Most tool and block recipes.
- **Forge**: Placed block. Metal items, smelting.
- **Scriptorium**: Placed block. Knowledge items, Bok upgrades.

### 2. Recipes are Discovered, Not Given
The player starts knowing only hand-craft recipes. New recipes are discovered through:
- **Exploration**: Lore inscriptions in Remnants contain recipe blueprints
- **Experimentation**: Combining unusual materials at a workstation (guided hints in Codex)
- **Creature Study**: Filling a creature's Codex entry reveals recipes using its drops

### 3. Resource Chains Have Depth
Tier 0 materials transform into tier 1, which combine into tier 2:

```
Wood → Planks → Treated Planks (planks + resin)
Stone → Bricks → Reinforced Bricks (bricks + iron)
Sand → Glass → Crystal Lens (glass + crystal)
```

### 4. Tool Durability (Future)
Tools should wear out over use, creating a maintenance loop:
- Wood tools: 50 uses
- Stone tools: 150 uses
- Iron tools: 500 uses
- Crystal tools: 1000 uses + special effects

## Planned Recipe Categories

### Building Materials
- Treated Planks (weather-resistant)
- Reinforced Bricks (blast-resistant)
- Mossy variants (decorative)
- Composite blocks (mixed materials)

### Light Sources
- Torches (4 block radius, temporary)
- Lanterns (8 block radius, permanent, portable)
- Ember Lantern (12 block radius, damages Inklings)
- Glyph Lamp (20 block radius, attracts Dustmotes)

### Tools
- Axes (wood/stone/iron/crystal) — tree harvesting
- Pickaxes (wood/stone/iron/crystal) — stone/ore mining
- Swords (stone/iron/crystal) — combat damage
- Shovel (wood/stone/iron) — soft block speed
- Chisel (iron/crystal) — decorative block shaping (future)

### Armor (Future)
- Thornback Shell Plate Armor (physical defense)
- Wyrm Scale Mail (underground vision)
- Inkling Cloak (reduced detection at night)
- Glyph Runeguard (structure damage resistance)

### Knowledge Items
- Codex Pages (creature observations)
- Lore Fragments (world history)
- Glyph Stamps (structure blueprints)
- Monolith Inscriptions (fast-travel anchors)

## Crafting UI Direction

The crafting menu should evolve from the current overlay to a **page in the Bok** (the player's book). Opening the Bok shows available recipes on parchment-textured pages, with ink illustrations of the items. Unavailable recipes show as faded/incomplete drawings that fill in as materials are gathered.

On mobile, crafting should support:
- One-tap craft for known recipes with sufficient materials
- Swipe between recipe categories (pages of the Bok)
- Long-press for recipe details
- Drag from Bok to hotbar for equipped items
