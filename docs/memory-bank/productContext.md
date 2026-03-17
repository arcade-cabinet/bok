---
title: Product Context
domain: memory-bank
status: current
last-verified: 2026-03-16
summary: "Why Bok exists, target audience, diegetic UX philosophy, session design"
---

# Product Context -- Bok

## Why This Exists

Bok blends survival-craft gameplay with Swedish folklore in a way no existing game does. The voxel genre is dominated by Minecraft clones with generic fantasy settings. Bok differentiates through:

- **Deep folklore integration** -- Not cosmetic theming. Swedish mythology informs mechanics, creatures, progression, and world structure.
- **Mobile-first design** -- Full 4X survival on a phone, not a desktop port crammed onto a small screen.
- **Computational runes** -- A Turing-complete inscription system that emerges from placing runes on block faces.
- **Diegetic everything** -- No floating HUD numbers. The world itself communicates.

## Target Audience

Mobile gamers who enjoy Minecraft, Terraria, or Valheim but want:
- Shorter sessions (5-15 min vs. hours)
- Deeper lore and worldbuilding
- Touch-native controls (not virtual joystick overlays)
- A world that feels authored, not just generated

## Competitive Landscape

| Game | Overlap | Bok Differentiator |
|------|---------|-------------------|
| **Minecraft** | Voxel building, survival | Folklore depth, mobile-first, computational runes, diegetic UI |
| **Terraria** | 2D survival crafting | 3D voxels, Swedish setting, shorter sessions |
| **Valheim** | Norse mythology, survival | Mobile-first, building-block aesthetic, computational systems |
| **Hytale** | Voxel RPG | Folklore over generic fantasy, mobile-first, rune computation |

## UX Philosophy: Diegetic Over Non-Diegetic

The core UX principle is that the world itself is the interface. Every piece of information the player needs should come from the world, not from floating UI elements.

| Information | Non-Diegetic (avoid) | Diegetic (prefer) |
|-------------|---------------------|-------------------|
| Health | Numeric HP bar | Red vignette, heartbeat, screen desaturation |
| Hunger | Hunger meter | Color desaturation, slower movement |
| Time | Clock widget | Sky color, shadow direction, creature behavior |
| Quests | Quest tracker popup | Saga entries in the Bok journal |
| Map | Floating minimap | Ink-on-birch-bark map in the Bok |
| Inventory | Slot grid overlay | Tally marks on parchment in the Bok |
| New knowledge | Notification badge | Berkanan rune (birch) glows on the Bok indicator |

Vitals bars exist as an accessibility toggle (press V) for players who need explicit numbers.

Details: `docs/design/diegetic-ui.md`

## Session Design

- **Micro-goals:** Always within 1-2 minutes (mine 5 stone, craft a tool, explore one chunk)
- **Auto-save:** Triggers on app background, chunk boundary crossing, and periodic timer
- **Resume:** Player returns to exact state -- position, inventory, time of day, active quest
- **Session arc:** Open -> orient (sky tells time, Bok indicator shows unread) -> act (one goal) -> close
- **No death penalty:** Death respawns at last shelter with inventory intact. The saga records the death.

## Mobile-First Constraints

- **Portrait orientation** primary (landscape supported but not optimized for)
- **Touch is primary input** -- mouse/keyboard secondary
- **One-thumb reachable** action buttons
- **No hover states** in gameplay (touch has no hover)
- **Performance budget:** 60fps on mid-range phones (target: iPhone 12 / Pixel 6 equivalent)
- **Battery conscious:** Reduce GPU work when app is backgrounded

Details: `docs/design/mobile-first.md`

## The Bok as Central UI

Opening the Bok pauses the world. It is the one "non-diegetic concession" but presented as a physical object the character carries. All management (inventory, map, codex, quests) happens inside the Bok's pages. This keeps the in-game HUD minimal -- just a Berkanan rune indicator and optional vitals bars.
