# Art Direction

## Visual Identity

Bok's aesthetic is **Swedish craft tradition meets building-block playground**. The game looks like a handcrafted wooden diorama of Scandinavia — birch bark, rune stones, and evergreen forests rendered in chunky, tactile blocks. Think Dala horse meets Lego meets Viking runestone.

1. **Voxels as building blocks** — the world is blocky in the way Scandinavian wooden toys are blocky. Satisfying, tactile, handcrafted. Blocks have noise-textured faces with subtle wood-grain and stone-crack detail that suggests they were carved, not generated.
2. **Palette** — Scandinavian natural pigments. Birch white, pine green, granite grey, amber gold. Muted, warm, grounded. No neon. No pure white. Falu red (`#8b2500`) for structures, like the iconic Swedish red cottages.
3. **Light** — the famous Scandinavian light. Long golden hours. Blue twilight that lingers. Deep winter-night blue, never grey-black. Aurora greens and purples at night.
4. **UI** — birch-bark textures, rune-inspired borders, serif fonts (Cinzel). Glass panels with blur, not flat boxes. Every UI element should feel like it was carved from wood or drawn on bark.

## Color Palette

Grounded in the Swedish landscape and craft tradition:

| Token | Hex | Swedish Source | Use |
|-------|-----|----------------|-----|
| Björk (Birch) | `#e0d5c1` | Birch bark | UI backgrounds, safe spaces, the Bok |
| Bläck (Ink) | `#1a1a2e` | Iron gall ink on parchment | Text, darkness, the unknown |
| Guld (Gold) | `#c9a84c` | Amber, mead, candlelight | Discovery, craft, value, rune glow |
| Glöd (Ember) | `#a3452a` | Hearthfire, Falu red | Danger, fire, hostile creatures, structures |
| Mossa (Moss) | `#3a5a40` | Forest floor, lichen | Nature, growth, healing |
| Himmel (Sky) | `#87ceeb` | Summer sky over Gotland | Daytime, openness, possibility |
| Natt (Night) | `#050510` | Midwinter darkness | Night sky, void, the space between |
| Sten (Stone) | `#6b6b6b` | Granite, runestones | Foundations, landmarks, endurance |
| Falu | `#8b2500` | Falu red paint (iconic Swedish cottage red) | Player-built structures, warmth, home |
| Norrsken (Aurora) | `#88ff88` | Northern lights | Rare events, enchantment, wonder |

These are CSS custom properties in `src/index.css`, used consistently throughout UI and available for shader tinting. The addition of **Falu** and **Norrsken** extends the palette for Swedish-specific elements.

## Block Textures

All block textures are **procedurally generated at runtime** on a canvas (`src/world/tileset-generator.ts`). This means:
- No texture file dependencies
- Consistent style guaranteed
- Easy to add new blocks
- Variation through noise seeding

### Texture Style Guide
- **Noise**: Every surface has subtle noise variation (3-15% color deviation)
- **No outlines**: Blocks don't have black outlines. Depth is conveyed through lighting.
- **Warm bias**: Even stone and dirt skew slightly warm (add +5-10 to red channel)
- **Transparent blocks**: Glass, water, leaves use alpha. Glass has a subtle refraction shimmer.

## Creature Design Language

See [creatures.md](../world/creatures.md) for individual designs. General principles:

### Construction
- **Primitives**: Spheres, capsules, boxes, cones composed into articulated forms
- **No quads/sprites**: Creatures are 3D geometry, not billboarded sprites
- **Scale variation**: Each individual has ±10% size variation (multiply uniform scale by 0.9-1.1)
- **Color variation**: Each individual has ±5% hue shift from base species color

### Animation
- **Procedural only**: No skeletal animation files. All movement is code-driven:
  - IK for legs (ground adaptation)
  - Sine waves for breathing/idle
  - Follow-the-leader for segments (Pagewyrm)
  - Spring physics for floppy parts (Crane neck, Bindling legs)
- **State-driven**: Each animation state (idle, walk, chase, attack, flee) has a procedural behavior, blended on transition

### Creature Color Assignments (Swedish Folklore)

| Creature | Primary | Secondary | Emissive |
|----------|---------|-----------|----------|
| Lyktgubbar | — | — | Amber `#ffd700` / Blue `#88ccff` over water |
| Skogssniglar | Mossa `#3a5a40` | Sten `#6b6b6b` | — |
| Tranor | Björk `#e0d5c1` | Bläck `#1a1a2e` (wingtips) | Red crown spot |
| Vittra | Earth brown `#8b7355` | Mossa `#3a5a40` | — (semi-transparent) |
| Näcken | — | — | Water green-blue `#44aaaa` |
| Runväktare | Sten `#6b6b6b` | Guld `#c9a84c` (runes) | Glöd `#a3452a` (eyes) |
| Mörker | Bläck `#1a1a2e` | — | Glöd red `#ff4444` (eyes) |
| Lindormar | Björk `#c9b896` | Glöd `#a3452a` (rune marks) | — |
| Draugar | — (wireframe) | — | Frost blue `#aaccee` |
| Jätten | World blocks | — | Guld `#c9a84c` (core runsten) |
| Norrsken | — | — | Green/purple/blue cycling |

## Lighting Model

### Day Phases
| Phase | Ambient | Sun | Sky | Fog |
|-------|---------|-----|-----|-----|
| Dawn (0.0-0.25) | 0.2→0.35 warm | 0→1.2 | Ink→Ember→Sky | Night→Day |
| Midday (0.25-0.75) | 0.35 white | 1.2 warm white | Sky blue | Blue-grey |
| Dusk (0.75-1.0) | 0.35→0.05 | 1.2→0 ember | Sky→Ember→Ink | Day→Night |
| Night (dark) | 0.05 blue tint | 0 | Ink/Night | Dark blue |

### Point Lights
- **Torches**: Warm orange, 4 block radius, flicker (noise-based intensity)
- **Ember Lantern**: Deep orange, 12 block radius, steady
- **Glyph Lamp**: Gold, 20 block radius, pulse
- **Dustmotes**: Soft yellow, 2 block radius, drift

## Typography

| Use | Font | Weight | Tracking |
|-----|------|--------|----------|
| Title/Headers | Cinzel | Black (900) | Wide (0.2em+) |
| Body/HUD | Inter | Regular-Semibold | Normal |
| Code/Data | JetBrains Mono | Regular | Normal |
| Bok pages | Cinzel | Regular (400) | Slightly wide |

## Screen Composition

### Playing State
- **80%+ viewport**: The 3D world fills the screen
- **Bottom edge**: Hotbar + vitals (thin strip)
- **Top corners**: Time + quest (text only, small, fades)
- **Center**: Crosshair (desktop only, minimal)

### Bok Open
- **Full screen**: Parchment background with page content
- **Tab navigation**: Bottom edge page tabs
- **Close**: Tap outside, swipe down, or ESC/E key

The goal: when playing, the screen should look like a **window into a world**, not a dashboard with a 3D viewport embedded in it.
