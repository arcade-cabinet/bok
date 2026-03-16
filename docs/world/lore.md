# The World of Bok

## The Name

**Bok** means *book* in Swedish. The world of Bok is a living text — a story that writes itself through the actions of those who inhabit it. Every block placed is a word. Every structure is a sentence. Every settlement is a chapter. The land remembers.

> "A world remembers those who shape it."

This is not a tagline. It is the core metaphor that governs every design decision.

## The Premise

You awaken on stone, surrounded by torchlight. You have no memory. The land stretches endlessly, carved by forces older than memory. There are no quest givers, no tutorials delivered by NPCs, no floating text explaining the rules. There is only the world, and what you choose to write into it.

The world of Bok was once a complete text — a finished story. But something unraveled it. The pages scattered. The words became terrain. The punctuation became ore. The sentences became rivers. What remains are fragments: ruins that hint at structure, creatures that behave like living grammar, and a landscape that feels like it's trying to remember what it was.

## Core Metaphors

### The Unwritten World

The terrain is the blank page. Untouched land is raw potential — procedurally generated, wild, unstructured. When the player builds, they are *writing* — imposing meaning on chaos. When they mine, they are *editing* — reshaping what exists. The world tracks every modification as a **delta** from the original generation. Your story is the diff.

### Memory and Forgetting

The world remembers what you build (voxel deltas persisted to SQLite). But it also *forgets* — abandoned structures slowly reclaim to wilderness. Unvisited chunks may shift. The tension between building something permanent and the world's tendency toward entropy is the fundamental survival loop.

### The Bok (The Book)

The player's inventory screen is not a grid floating in space — it is the **Bok** itself, a physical book the player carries. Opening it pauses the world. Its pages contain:
- **The Atlas** — discovered terrain, landmarks, the map
- **The Ledger** — inventory, resources, what you carry
- **The Codex** — recipes, knowledge, creature observations
- **The Chronicle** — quest progress, achievements, the story so far

The Bok is the only non-diegetic concession, and even it is presented as an in-world object.

### Ink and Light

The color palette reflects the metaphor:
- **Parchment** (`#e0d5c1`) — the blank page, the UI background, safety
- **Ink** (`#1a1a2e`) — the written word, darkness, depth, the unknown
- **Gold** (`#c9a84c`) — knowledge, discovery, crafted things, value
- **Ember** (`#a3452a`) — danger, fire, urgency, the creatures of night
- **Moss** (`#3a5a40`) — growth, nature reclaiming, the wild world
- **Sky** (`#87ceeb`) — possibility, openness, the unwritten
- **Night** (`#050510`) — the void, the space between words, threat

## The Creatures

Creatures in Bok are not generic mobs. They are **living fragments of the broken text** — pieces of the story that became autonomous. See [creatures.md](./creatures.md) for the full bestiary.

The key principle: every creature should feel like it belongs to this world's metaphor. They are not "enemies" in the traditional sense — they are forces of the world asserting itself against the player's attempts to write over it.

## The Ruins

Scattered across the world are **Remnants** — structures that predate the player. They are fragments of the "original text" — buildings that were once written and still partially exist. They contain:
- Rare resources not found in the wild
- Creature nests (higher danger, higher reward)
- Lore fragments (text inscribed on walls, readable)
- Crafting stations for advanced recipes

Remnants generate at world creation based on the seed, like terrain. They are the world's backstory made physical.

## Time and Seasons

The day/night cycle (240 seconds per day) is a *rhythm of writing*:
- **Morning** — the fresh page. Creatures retreat. Resources respawn.
- **Midday** — the productive hours. Building, crafting, exploring.
- **Dusk** — the warning. The ink begins to spread.
- **Night** — the world writes back. Creatures emerge. The dark is alive.

Future: seasons that change the world over longer cycles — shifting biomes, migrating creatures, growing/dying vegetation.

## Sound and Music

The world of Bok should sound like pages turning in wind, ink scratching on paper, the creak of leather binding. Combat should sound like tearing — ripping pages. Building should sound like writing — the satisfying scratch of pen on parchment. The ambient soundscape should feel like being inside a vast, ancient library that has become overgrown.
