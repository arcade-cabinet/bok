# Diegetic Interface Design

## What is Diegetic UI?

A diegetic interface is one that exists **within the game world**. The player character can see and interact with it, not just the player. In Bok, the goal is to eliminate as much non-diegetic (floating, game-y) UI as possible, replacing it with information conveyed through the world itself.

> The best UI is no UI. The second best UI is one the character can touch.

## The Spectrum

| Type | Description | Bok Example |
|------|-------------|-------------|
| **Diegetic** | Exists in-world, character sees it | The Bok (physical book), workstation interfaces, wall inscriptions |
| **Spatial** | Exists in-world, character doesn't see it | Block highlight wireframe, creature health indicators |
| **Meta** | Exists outside world, tied to game state | Damage vignette, underwater tint, screen desaturation |
| **Non-diegetic** | Floating UI | Hotbar, vitals bars, quest text (minimize these) |

## Current State → Target State

### Health
- **Current**: Red bar in bottom HUD (non-diegetic)
- **Target**: Screen edge desaturation + heartbeat audio cue (meta). At critical health: tunnel vision, monochrome, screen cracks. The player *feels* damage, not reads a number.

### Hunger
- **Current**: Orange bar in bottom HUD (non-diegetic)
- **Target**: Character movement slows. World colors desaturate (meta). Stomach rumble audio. At critical: blur at screen edges, unsteady camera bob.

### Stamina
- **Current**: Blue bar in bottom HUD (non-diegetic)
- **Target**: Heavy breathing audio. Sprint particles dim. At critical: forced walk speed, camera shake smooths to a stumble rhythm. Recovery: deep breath audio, color returns.

### Time of Day
- **Current**: Text label "Day X — Phase" (non-diegetic)
- **Target**: **The sky itself** (diegetic). Sun position, moon position, star visibility, sky color gradient. Supplemented by shadow direction. No text needed — the player learns to read the sky.

### Mining Progress
- **Current**: Circular ring around crosshair (non-diegetic)
- **Target**: **Block crack overlay** (spatial). The targeted block visually cracks as mining progresses — texture distortion, particle chips, sound escalation. Completion is the block shattering, not a bar filling.

### Quest Progress
- **Current**: Text in top-right HUD (non-diegetic)
- **Target**: **The Bok's Chronicle page** (diegetic). Quest info is written in the player's book. Environmental hints replace objective markers: "gather wood" is communicated by the spawn shrine being made of stone (contrast implies need for wood). Lore inscriptions hint at next steps.

### Inventory
- **Current**: Grid overlay in crafting menu (non-diegetic)
- **Target**: **The Bok's Ledger page** (diegetic). Opening the Bok shows a hand-drawn inventory on parchment. Items are ink illustrations. Counts are tally marks. The Bok is a physical object the player holds up.

### Enemy Awareness
- **Current**: Enemies visible in 3D world, no indicators
- **Target**: **Environmental tells** (spatial/diegetic). Inklings dim nearby light (spatial). Pagewyrms cause ground tremors (camera shake + audio). Hollowfolk dim ambient sound. The player detects enemies through the world's behavior, not through UI markers.

## The Bok (The Book)

The central UI element is the **Bok** itself — a physical book the player carries. Opening it is a full-screen experience with tabbed pages:

### Atlas (Map)
- Parchment background with ink-drawn terrain
- Only shows explored areas (fog of war = blank parchment)
- Landmarks drawn as small illustrations (not icons)
- Player position shown as an ink blot
- No grid, no coordinates — just the drawn landscape
- Pinch to zoom on mobile

### Ledger (Inventory)
- Items as ink illustrations on parchment
- Quantities as tally marks (||||| = 5)
- Drag to hotbar from here
- Organized by material type, not grid position

### Codex (Knowledge)
- Creature entries: hand-drawn illustration, behavior notes, weaknesses
- Starts blank, fills in through observation and combat
- Recipe entries: ingredient diagrams, discoverable
- Lore entries: transcribed inscriptions from Remnants

### Chronicle (Journal)
- Auto-written narrative of player actions
- "Day 3 — Found the northern ruin. The Glyphwarden stirred."
- Quest hints woven into narrative prose
- Reading the Chronicle IS reading the quest log

## Transition Plan

The shift from non-diegetic to diegetic should be **gradual**:

1. **Phase 1 (Now)**: Keep current HUD. Add meta effects (damage vignette exists, extend to hunger/stamina).
2. **Phase 2**: Add The Bok as inventory replacement. Keep hotbar as the one non-diegetic concession (it's the bridge between the Bok and the world).
3. **Phase 3**: Replace vitals bars with meta effects. Add block crack overlay for mining.
4. **Phase 4**: Add environmental enemy tells. Remove remaining non-diegetic elements except hotbar.

The **hotbar** is the one permanent non-diegetic element. Even the most hardcore diegetic games need a way to show what's in your hands. The hotbar stays, but it should look like it belongs — parchment-textured slots with ink-drawn item icons.

## Mobile-Specific Diegetic Considerations

On mobile, diegetic UI has an advantage: **no cursor**. The player touches the world directly. This makes spatial UI feel more natural — you're touching blocks, not clicking them. The Bok can be opened with a swipe gesture, as if physically flipping it open.

The trade-off: meta effects (screen tints, vignettes) must be subtle on small screens. A full-screen red vignette that works on a 27" monitor can be overwhelming on a 6" phone. Scale effect intensity by screen size.
