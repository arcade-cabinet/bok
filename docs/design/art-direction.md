# Art Direction

## Visual Identity

Bok's aesthetic is **ancient manuscript meets living world**. The game looks like a voxel world drawn in ink on parchment that has come to life. This is expressed through:

1. **Voxels** — the world is blocky, but not Minecraft-copy blocky. Blocks have noise-textured faces, subtle color variation, and procedural detail that suggests handcraft.
2. **Palette** — warm, muted, literary. No neon. No pure white. Everything looks like it was drawn with natural pigments.
3. **Light** — golden hour as the baseline. The world is warmest at the safest times. Night is deep ink-blue, not grey.
4. **UI** — parchment textures, serif fonts (Cinzel), ink-weight borders. Glass panels with blur, not flat boxes.

## Color Palette

| Token | Hex | Use |
|-------|-----|-----|
| Parchment | `#e0d5c1` | UI backgrounds, blank pages, safe spaces |
| Ink | `#1a1a2e` | Text, darkness, deep shadows, the unknown |
| Gold | `#c9a84c` | Highlights, crafted items, discovery, value |
| Ember | `#a3452a` | Danger, fire, damage, hostile creatures |
| Moss | `#3a5a40` | Nature, growth, healing, vegetation |
| Sky | `#87ceeb` | Daytime, openness, possibility |
| Night | `#050510` | Night sky, void, deepest darkness |
| Stone | `#6b6b6b` | Neutral, foundations, Remnants |

These are CSS custom properties in `src/index.css`, used consistently throughout UI and available for shader tinting.

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

### Creature Color Assignments
| Creature | Primary | Secondary | Emissive |
|----------|---------|-----------|----------|
| Dustmotes | — | — | Warm yellow `#ffd700` |
| Thornbacks | Moss `#3a5a40` | Stone `#6b6b6b` | — |
| Papyrus Cranes | Parchment `#e0d5c1` | Ink `#1a1a2e` | — |
| Inklings | Ink `#1a1a2e` | — | Ember red `#ff4444` (eyes) |
| Glyphwardens | Stone `#6b6b6b` | Gold `#c9a84c` | Ember `#a3452a` (eyes) |
| Bindlings | Ink `#2a2a3e` | Moss `#3a5a40` | — |
| Pagewyrms | Parchment `#c9b896` | Ember `#a3452a` | — |
| Hollowfolk | — (wireframe) | — | Ink `#1a1a2e` (anti-emissive) |
| The Colophon | World blocks | — | Gold `#c9a84c` (core) |

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
