# Creatures of Bok

## Design Philosophy

Creatures in Bok draw from **Swedish and Norse folklore**, built with **building-block construction** — composed of geometric primitives that snap together like a tactile toy. They should feel like something you could build from wooden blocks on a table, yet move with life and purpose.

Every creature should:

1. **Feel Scandinavian** — rooted in folklore, climate, and landscape. No generic fantasy.
2. **Look like building blocks** — composed of geometric primitives (boxes, capsules, cones, spheres) that read as assembled parts. Visible joints. Satisfying proportions.
3. **Behave believably** — herding, fleeing, stalking, sleeping, nesting. Ecosystems, not spawn points.
4. **Fit the metaphor** — they are fragments of the old saga, living kennings of the world.
5. **Serve the 4X loop** — some are threats (eXterminate), some are resources (eXploit), some guard secrets (eXplore), some contest territory (eXpand).

## Construction Method

All creatures are built from **primitive geometry composition** at runtime — like snapping Lego bricks together:

- **Body blocks**: Boxes, capsules, rounded boxes for torso/segments
- **Limb chains**: Linked capsules with IK for legs, necks, tails
- **Detail pieces**: Cones for horns/beaks, spheres for eyes/joints, flat planes for ears/wings
- **Procedural animation**: Code-driven movement — no animation files
- **Material variation**: Each individual has slight color/scale noise (±5-10%)

The aesthetic is **handcrafted wooden toy meets living creature**. Think Scandinavian design objects (Dala horses, wooden puzzles) that have come to life.

---

## Tier 1 — Ambient Life (Passive)

### Lyktgubbe (Will-o'-the-Wisps)

*From Swedish folklore: the lantern-carriers, lights that lead travelers astray in marshes.*

Small floating orbs of warm light that drift near the ground at skymning (twilight) and morgon (dawn). They scatter when approached, reform when left alone. In Swedish tradition, they mark the graves of unbaptized children or lost treasures. In Bok, they mark places where the old saga is close to the surface.

- **Build**: Single glowing sphere (additive blend) with a point light
- **Color**: Warm amber `#ffd700`, shifts to cool blue `#88ccff` over deep water
- **Behavior**: Drift in slow sine patterns, scatter on approach (burst velocity, reform), cluster near Runsten and water. Sometimes they lead — following one might lead to a ruin or a hazard.
- **Purpose**: Atmosphere, navigation hints, light source near landmarks

### Skogssnigel (Forest Snails)

*Inspired by the quiet, slow-paced life of Swedish forest floors.*

Chunky, low creatures with a segmented shell of angular plates — like a stack of wooden blocks on a rounded base. They graze on grass blocks, slowly converting them to mycel (mushroom blocks) over time. Harmless unless cornered — when threatened, they retract into their shell and become an immovable block. Shell fragments are a crafting material.

- **Build**: Base capsule (body) + 5 stacked box segments (shell, each slightly rotated)
- **Legs**: 4 short stubby capsules with simple IK
- **Shell**: Angular plates in moss-green `#3a5a40` and stone-grey `#6b6b6b`
- **Behavior**: Wander (very slow), graze, retract when threatened (becomes a static block), sleep at night against trees
- **Drops**: Shell Plates (crafting material for armor)

### Tranor (Cranes)

*Sweden's iconic cranes — they gather at Lake Hornborga every spring in one of Europe's great wildlife spectacles.*

Tall, elegant wading birds found near water. Long neck (chain of block-like segments), angular folding wings. They fish in shallow water and flee on approach. Travel in flocks of 3-5, honking in formation.

- **Build**: Elongated box torso, 8-segment block chain neck (each segment a small rounded box), cone beak
- **Wings**: Flat box panels (fold against body, unfold on flight — simple rotation)
- **Legs**: 2 tall thin capsules with reverse-knee IK, standing in water
- **Color**: Parchment body `#e0d5c1`, ink-black wingtips `#1a1a2e`, red crown spot
- **Behavior**: Wade, fish (neck IK dips into water), flee (unfold wings, honk, take off in V-formation with flock — Boids), return to water at dawn
- **Drops**: Crane Feathers (crafting material for glider, arrows)

---

## Tier 2 — Territorial (Neutral-Hostile)

### Vittra (Underground Folk)

*From Swedish folklore: the invisible people who live in mounds and underground. Disturb their home and they bring sickness and misfortune.*

Small, hunched humanoid figures that live in underground warrens near Fornlämningar (ruins). They are invisible until the player breaks blocks near their home — then they shimmer into visibility, angry. They don't deal direct damage but inflict **otur** (bad luck) — increased hunger decay, reduced tool durability, creatures aggro from further away. Leaving offerings (food items placed near their mound) appeases them.

- **Build**: Small humanoid (1 block tall) — box torso, sphere head, stubby limbs. Simple, toy-like.
- **Visual**: Semi-transparent when passive, solid when aggravated. Earthy colors — brown, grey, moss.
- **Behavior**: Invisible in warrens. Appear when home disturbed. Hover near player, inflicting debuffs. Appeased by food offerings. Retreat underground at dawn.
- **Mechanic**: Anti-greed mechanic. Punishes mindless strip-mining near ruins. Rewards respectful play (lagom).

### Näcken (The Water Spirit)

*From Swedish folklore: the beautiful, dangerous fiddler who sits on rocks in streams and plays music that lures people into the water.*

A humanoid figure that sits on rocks near deep water, playing an instrument. Approaching it directly is dangerous — the music debuff disorients (camera sway, reversed controls for 3 seconds). But if the player throws a piece of iron into the water (an offering from the real folklore), Näcken teaches a rune — unlocking a recipe or lore entry.

- **Build**: Humanoid sitting pose — box torso, capsule limbs, sphere head with flowing hair (chain of small boxes trailing behind, physics-driven)
- **Instrument**: Small box + thin box (fiddle shape)
- **Visual**: Translucent green-blue, emissive. Sits on a specific stone block near water.
- **Behavior**: Sits and plays (procedural arm animation). Lures player with particle trail. Punishes direct approach. Rewards iron offering. One per world region — rare.
- **Purpose**: Exploration reward, lore delivery, teaches respect for water

### Runväktare (Rune Wardens)

*The guardians of the old saga. Standing stones that remember what they protect.*

Tall, monolithic sentinel figures found near Runsten (runestones) and Fornlämningar (ruins). They stand motionless like the standing stones that dot the Swedish countryside. Their surfaces are inscribed with runes that glow faintly. If the player takes blocks from their ruin, they activate — slow but devastating. They are the world protecting its own history.

- **Build**: Tall rectangular column (2 blocks wide, 4 tall) — like a standing stone. Flat slab head with two ember-glowing slots (eyes). 2 segmented stone limb-arms ending in flat blades.
- **Rune detail**: Small emissive planes on body surface showing rune symbols
- **Legs**: None — they glide/hover just above ground
- **Color**: Stone `#6b6b6b` with gold `#c9a84c` rune glow
- **Behavior**: Dormant near ruins (appear as scenery). Activate when player mines ruin blocks. Slam attack (ground AOE, screen shake). Return to post if player retreats far enough. Can be permanently calmed by placing a rune offering.
- **Drops**: Runsten Fragments (advanced crafting — rune inscription tools)

---

## Tier 3 — Predators (Hostile)

### Mörker (The Darkness)

*Not a specific folklore creature but the universal Scandinavian experience: the deep, pressing darkness of winter nights that feels alive.*

The primary night threat. Not individual creatures but a **collective presence** — small, fast shadow-forms that spawn in groups of 3-5 and hunt in coordinated packs. In torchlight they shrink and burn. In darkness they swell and strengthen. They are the long Swedish winter night given form.

- **Build**: Amorphous — sphere mesh with vertex displacement noise. No defined shape. 2-4 small emissive red points (eyes) that shift position. Dark particle trail.
- **Color**: Deep ink `#1a1a2e`, eyes ember `#ff4444`
- **Behavior**: Pack hunting with alpha/flanking AI. Light-averse (take damage in torch radius, flee from fire). Scale multiplier based on ambient light (bigger in darkness). Dissolve at dawn. Hunt lyktgubbar (extinguishing ambient light, making areas darker — ecological chain).
- **Sound**: Whispered Swedish — fragments of words, like a saga being told backwards
- **Weakness**: Light. Torches, lanterns, fire. The deeper mechanic: mörker are the absence of story. Light — knowledge, craft, warmth — defeats them.

### Lindorm (Wyrm)

*From Swedish folklore: the serpent-dragon of Scandinavian legend, depicted on runestones coiled around the edges of the carved text.*

Large serpentine creatures that tunnel through soft terrain (dirt, sand, grass — not stone). They breach the surface near the player, arcing overhead before diving back in. They destroy blocks as they tunnel, reshaping the landscape — literally **unwriting** what was written.

- **Build**: 12-segment chain of rounded boxes, each slightly narrower toward tail. Head is a larger box with cone snout and small horn cones. Each segment a distinct building-block piece.
- **Surface**: Etched with rune-like patterns (small emissive lines on geometry)
- **Color**: Pale birch-bark `#c9b896` with ember `#a3452a` rune markings
- **Behavior**: Tunnel underground (remove blocks in path), breach near player (arc attack), dive back. Avoid stone (can't tunnel through it). Leave permanent tunnels behind (environmental storytelling). Attracted to vibrations (mining activity).
- **Drops**: Lindorm Scales (armor crafting), Lindorm Fang (weapon crafting)

### Draugar (The Restless Dead)

*From Norse mythology: the undead who guard their burial mounds, possessing superhuman strength.*

Night-only spectral humanoids that emerge from burial mounds. They don't chase — they stand at the edge of torchlight and watch. If the player turns away, they advance. If looked at, they freeze. When you face them, they are just standing stones. When you look away, they move.

- **Build**: Humanoid wireframe — visible edges only, no fill. Low-poly blocky humanoid shape. Featureless box head with two dark voids where eyes should be.
- **Visual**: Semi-transparent. Slight screen distortion (chromatic aberration) in proximity. Snow/frost particles around them.
- **Behavior**: Spawn at night near burial mounds (generated terrain features). Advance only when not observed (dot product check of player look direction). Freeze when watched. Deal massive damage on contact. Teleport back to mound at dawn.
- **Sound**: Silence. They make no sound. The ambient audio dims near them. The absence of sound is the warning.

---

## Tier 4 — Legendary / World Events

### Jätten (The Giant)

*From Swedish folklore: the giants who shaped the landscape, throwing boulders that became islands, carving valleys with their footsteps.*

A massive creature that appears when the player has carved extensively into the world (inscription level 1000+). It is the world's response to being overwritten — a giant assembled from the terrain itself. It tears up the ground to rebuild its body when damaged. Defeating it doesn't destroy it — it yields the **Runsten Seal**, accepting the player as a saga-worthy builder.

- **Build**: Humanoid assembled from world blocks (birch wood, stone, dirt, moss). 8 blocks tall, 4 wide. Arms are columns of stacked blocks that swing. Legs leave footprint craters.
- **Core**: A single glowing runsten block visible in its chest when staggered
- **Regeneration**: Pulls blocks from nearby terrain to heal (visible — you see the ground being consumed into its body)
- **Behavior**: Appears near player's largest build. Attacks structures first (testing the player's work), then player. Not purely hostile — if the player's structures pass its "test" (enclosed, lit, warded), it may simply inspect and leave. Defeating it yields the **Runsten Seal** (permanent structures, no decay).
- **Lore**: The jättar were the original builders. Your saga must prove worthy of their land.

### Norrsken (The Northern Lights)

*Not a creature but a world event — the aurora borealis as a living phenomenon.*

When norrsken appear in the night sky, the world changes:
- All creatures become passive (mesmerized by the lights)
- Rare resources briefly surface (glowing blocks visible on terrain)
- The Bok's Kartan reveals nearby unexplored landmarks
- Rune inscriptions on runstones glow brighter and become readable from further away

Norrsken last 60 seconds and occur randomly (5% chance per night). They are the world **choosing** to reveal itself — a gift of information and safety in the dangerous night.

- **Visual**: Animated ribbon of light across the sky (green `#88ff88`, purple `#aa66cc`, blue `#66aaff` — cycling). Particle streamers. Everything below tinted with shifting aurora color.

---

## Ecosystem Interactions

Creatures don't exist in isolation. They form a **Swedish woodland ecosystem**:

- **Mörker** prey on **Lyktgubbar** (extinguishing ambient light → areas get darker → mörker get stronger)
- **Skogssniglar** graze on terrain that **Lindormar** have tunneled through, slowly filling holes with mycel
- **Tranor** flee when **Mörker** appear (honking — early warning system for the player)
- **Vittra** debuff the player near **Fornlämningar**, while **Runväktare** provide physical defense
- **Näcken** appears only where **Tranor** congregate (both are water creatures — ecological signal)
- **Draugar** emerge from mounds that **Skogssniglar** have grown mycel over (time-based spawning)
- **Norrsken** pacifies everything — the brief Swedish summer night of peace

## The Swedish Folklore Ladder

The creature progression mirrors how Scandinavians relate to their folklore landscape:

1. **First, the friendly signs** — Lyktgubbar (lights), Skogssniglar (slow forest life), Tranor (cranes). The world is welcoming.
2. **Then, the warnings** — Vittra (don't disturb the mounds), Näcken (respect the water). The world has rules.
3. **Then, the threats** — Mörker (winter darkness), Lindormar (ancient serpents), Draugar (the restless dead). The world defends itself.
4. **Finally, the reckoning** — Jätten (the giant that shaped the land). Can your saga stand alongside the old one?

## Implementation Priority

1. **Mörker** — replace current box enemies, primary night threat (pack AI, light-averse)
2. **Lyktgubbar** — ambient life, navigation hints, atmosphere
3. **Skogssniglar** — first neutral creature, ecosystem foundation
4. **Runväktare** — ruin guardians, introduces Fornlämningar
5. **Lindormar** — terrain destruction, high-impact encounter
6. **Tranor** — water biome life, flocking AI, early warning
7. **Vittra** — underground folk, anti-greed mechanic
8. **Draugar** — horror element, unique observation mechanic
9. **Näcken** — rare encounter, lore delivery, rune teacher
10. **Jätten** — endgame world event
11. **Norrsken** — periodic world event, reward mechanic
