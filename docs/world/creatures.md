# Creatures of Bok

## Design Philosophy

Creatures in Bok are **not boxes**. They are articulated, multi-part beings built from procedural geometry and animated with IK, sine curves, and behavioral state machines. Every creature should:

1. **Look like it belongs** — no floating cubes. Segmented bodies, limbs, joints.
2. **Behave believably** — herding, fleeing, stalking, sleeping, nesting. Not just chasing.
3. **Fit the metaphor** — they are fragments of the broken text, living punctuation of the world.
4. **Serve the 4X loop** — some are threats (eXterminate), some are resources (eXploit), some guard secrets (eXplore), some contest territory (eXpand).

## Construction Method

All creatures are built from **primitive geometry composition** at runtime:
- Capsules, spheres, boxes, cones combined into articulated rigs
- Procedural animation (no skeletal animation files needed)
- Color palettes per species with noise variation per individual
- IK-driven legs that adapt to terrain
- Sine-wave locomotion for serpentine/aquatic creatures

This keeps the voxel aesthetic while going far beyond boxes.

---

## Tier 1 — Ambient Life (Passive)

### Dustmotes
Small floating orbs of warm light that drift near the ground at dusk and dawn. They scatter when approached, reform when left alone. Purely atmospheric — they make the world feel alive. Built from a single sphere with additive blending and a point light.

### Thornbacks
Low, armadillo-like creatures with a segmented shell of angular plates. They graze on grass blocks, replacing them with dirt over time. Harmless unless cornered — when threatened, they curl into a ball (sphere collider) and become immovable. Shell fragments are a crafting material.

- **Body**: 5-segment capsule spine, each segment slightly smaller
- **Shell**: Angular box plates along the spine, tilted outward
- **Legs**: 6 short IK legs (insectoid gait cycle)
- **Behavior**: Wander, graze, curl when threatened, sleep at night

### Papyrus Cranes
Tall, elegant wading birds found near water. Long neck (chain of small segments), angular wings that fold. They fish in shallow water and flee on approach. Feathers are a rare crafting material for arrows/gliders.

- **Body**: Elongated capsule torso
- **Neck**: 8-segment chain with IK toward water surface
- **Wings**: Flat triangle meshes, fold/unfold animation
- **Legs**: 2 tall stilts with reverse-knee IK
- **Behavior**: Wade, fish, flee, flock (3-5 group, Boids alignment)

---

## Tier 2 — Territorial (Neutral-Hostile)

### Glyphwardens
Tall, monolithic sentinel creatures found near Remnant ruins. They stand motionless like statues until the player enters their territory, then slowly turn to face them. If the player takes blocks from their ruin, they attack — slow but devastating. They are the world protecting its own history.

- **Body**: Tall rectangular column (2 blocks wide, 4 tall)
- **Head**: Flat slab with two glowing ember slots (eyes)
- **Arms**: 2 segmented stone limbs, each ending in a flat blade
- **Legs**: None — they slide/hover just above ground
- **Behavior**: Dormant near ruins, activate on theft, slam attack (ground AOE), return to post
- **Drops**: Glyph Fragments (advanced crafting material)

### Bindlings
Spider-like creatures that build web structures between trees and in caves. They don't attack unprovoked but will swarm if their web is disturbed. Their webs slow movement. At night, they actively hunt smaller creatures.

- **Body**: Central sphere with angular carapace (octahedron)
- **Legs**: 8 IK legs, procedural walking on terrain
- **Mandibles**: 2 small cone shapes that open/close
- **Web**: Line geometry between anchor points (creates actual collision zones)
- **Behavior**: Build webs (place line geometry), patrol web, swarm if web broken, hunt at night

---

## Tier 3 — Predators (Hostile)

### Inklings
The primary night threat. Small, fast, pack hunters made of living shadow. They spawn in groups of 3-5 and chase the player in coordinated flanking patterns. In torchlight, they shrink and take damage. In darkness, they grow stronger.

- **Body**: Amorphous blob — sphere mesh with vertex displacement noise
- **Eyes**: 2-4 small emissive red points
- **Limbs**: None visible — they flow/ooze along the ground
- **Trail**: Dark particle trail behind them
- **Behavior**: Pack hunting (designated alpha, flanking patterns), light-averse (flee torches), grow in darkness (scale multiplier based on ambient light), dissolve in sunlight
- **Sound concept**: Whispered syllables, like words being spoken backwards

### Pagewyrms
Large serpentine creatures that tunnel through soft terrain (dirt, sand, grass — not stone). They breach the surface near the player, arcing overhead before diving back in. They destroy blocks as they tunnel, reshaping the landscape.

- **Body**: 12-segment chain of capsules, each slightly narrower toward the tail
- **Head**: Cone with a ring of small spike geometries (teeth)
- **Segments**: Follow-the-leader physics (each segment follows the previous)
- **Behavior**: Tunnel underground (remove blocks in path), breach near player, arc attack, dive back. Avoid stone. Leave tunnels behind (environmental storytelling). Attracted to vibrations (mining).
- **Drops**: Wyrm Segments (used for advanced tools)

### Hollowfolk
Night-only spectral humanoids. They don't chase — they stand at the edge of torchlight and watch. If the player turns away, they advance. If looked at, they freeze. Weeping Angels mechanic. They deal massive damage on contact but are trivially avoided if you watch them.

- **Body**: Humanoid wireframe — no fill, just edges of a low-poly human shape
- **Head**: Featureless sphere with two dark voids for eyes
- **Posture**: Hunched, arms reaching forward
- **Effect**: Slight screen distortion in their proximity (shader post-process)
- **Behavior**: Spawn at night far from light, advance only when not observed (dot product of player look direction vs. direction to entity), freeze when watched, teleport away at dawn
- **Sound concept**: Silence. They make no sound. The ambient sound dims near them.

---

## Tier 4 — Bosses / World Events

### The Colophon
A massive creature that appears when the player has written extensively into the world (placed 1000+ blocks). It is the world's immune response to being overwritten. A towering figure made of terrain blocks — literally assembled from the world around it. It tears up the ground to rebuild itself when damaged.

- **Body**: Humanoid assembled from world blocks (grass, stone, dirt, wood)
- **Scale**: 8 blocks tall, 4 wide
- **Arms**: Columns of stacked blocks that swing
- **Regeneration**: Pulls blocks from nearby terrain to heal (visible — you see the ground being consumed)
- **Weakness**: Its core (exposed when staggered) is a single Glyph block
- **Behavior**: Appears near player's largest build, attacks structures first, then player. Defeating it yields the **Colophon Seal** — allows permanent structures that won't decay.

---

## Ecosystem Interactions

Creatures don't exist in isolation:
- **Inklings** prey on **Dustmotes** (extinguishing ambient light, making areas darker)
- **Thornbacks** dig up terrain that **Pagewyrms** have tunneled, partially filling holes
- **Bindlings** catch **Dustmotes** in webs (glowing webs at night — beautiful, dangerous)
- **Glyphwardens** are immune to all creature attacks (they are the world's guardians)
- **Papyrus Cranes** flee when **Inklings** appear (early warning system for the player)

## Implementation Priority

1. **Inklings** — replace current box enemies, primary night threat
2. **Dustmotes** — ambient life, make the world feel alive
3. **Thornbacks** — first neutral creature, introduces ecosystem
4. **Glyphwardens** — dungeon guardians, introduces Remnants
5. **Pagewyrms** — terrain destruction, high-impact encounter
6. **Bindlings** — environmental hazards, web mechanics
7. **Papyrus Cranes** — water biome life, flocking AI
8. **Hollowfolk** — horror element, unique mechanic
9. **The Colophon** — endgame boss event
