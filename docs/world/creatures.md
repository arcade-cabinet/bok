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

## Implementation Status

| Creature | Tier | AI System | Spawning | Rendering |
|----------|------|-----------|----------|-----------|
| Tomte | Tutorial | `tomte-ai.ts` + `tomte-spawn.ts` | Yes — post-structure | Pending |
| Lyktgubbe | 1 Passive | `creature-ai-passive.ts` + `yuka-states-passive.ts` | Yes — twilight/dawn | Pending |
| Skogssnigle | 1 Passive | `creature-ai-passive.ts` + `yuka-states-passive.ts` | Yes — daytime biome-gated | Pending |
| Trana | 1 Passive | `creature-ai-passive.ts` + `yuka-states-passive.ts` | Yes — daytime flocks | Pending |
| Vittra | 2 Neutral | `creature-ai-vittra.ts` + `yuka-states-neutral.ts` | Yes — inscription-gated | Pending |
| Nacken | 2 Neutral | `creature-ai-nacken.ts` + `yuka-states-neutral.ts` | Yes — inscription-gated | Pending |
| Runvaktare | 2 Neutral | `creature-ai-runvaktare.ts` | Yes — inscription-gated | Pending |
| Morker | 3 Hostile | `creature-ai-hostile.ts` + `yuka-states-morker.ts` | Yes — night packs | Pending |
| Lindorm | 3 Hostile | `creature-ai-lindorm.ts` | Yes — inscription-gated | Pending |
| Draug | 3 Hostile | `creature-ai-draugar.ts` | Yes — inscription-gated | Pending |
| Jatten | 4 Boss | `creature-ai-jatten.ts` | Yes — inscription-gated | Pending |
| Norrsken | 4 Event | `season-effects.ts` + `NorrskenEvent` trait | Yes — random night event | Pending |

All AI systems have unit tests. Rendering (visual mesh assembly via `CreatureRendererBehavior`) is pending for all species.

---

## Tutorial Companion — Tomte

*Swedish household spirit. A gnome that lives on a farm and protects those who respect the old ways.*

The Tomte is a **singleton tutorial guide** — one per world, passive, despawns automatically once the player no longer needs it. It does not drop anything and cannot be harmed.

### Lifecycle

**Spawn condition:** Player builds their first structure (`InscriptionLevel.structuresBuilt >= 1`). Spawns 5 blocks diagonally from the player at surface level. Implemented in `tomte-spawn.ts` (`REQUIRED_STRUCTURES = 1`).

**Despawn condition:** Player inscribes 3 or more runes (`countRuneInscriptions(runeFaces.faces) >= 3`). The Tomte silently departs — no combat, no death particles. Implemented in `tomte-spawn.ts` (`REQUIRED_INSCRIPTIONS = 3`).

**Note:** The `creature-spawner.ts` version uses `discoveredRunes` (proxied from `totalBlocksMined`) and despawns with particles as a fallback path. The authoritative lifecycle is in `tomte-spawn.ts`.

### Behavior

State machine: Idle ↔ Wander (loose follow toward player)

- Within 8 blocks of player: enters Idle state, displays hint: *"The Tomte watches with keen eyes…"*
- Beyond 8 blocks: enters Chase state, wanders loosely toward player (speed 0.8 m/s, direction refreshes every 4 seconds with ±25% random drift)
- Subject to gravity — lands on solid surfaces

### Hint System

`TomteHint` is a singleton trait (`text: string, visible: boolean`) on the player entity. `getTomteHint()` in `tomte-ai.ts` returns the current hint string. UI reads this trait to display the speech bubble.

---

## Tier 1 — Ambient Life (Passive)

### Lyktgubbe (Will-o'-the-Wisps)

*From Swedish folklore: the lantern-carriers, lights that lead travelers astray in marshes.*

Small floating orbs of warm light that drift near the ground at skymning (twilight) and morgon (dawn). They scatter when approached, reform when left alone. In Bok, they mark places where the old saga is close to the surface.

- **Build**: Single glowing sphere (additive blend) with a point light
- **Color**: Warm amber `#ffd700`, shifts to cool blue `#88ccff` over deep water
- **Behavior**: Drift in slow sine patterns, scatter on approach (burst velocity, reform), cluster near Runsten and water. Sometimes lead — following one might reveal a ruin or hazard.
- **Spawn**: Twilight/dawn only. Biome-gated (`isLyktgubbeBiome`). Spawn chance 0.015/frame, at 15 blocks from player.
- **Ecosystem**: Mörker hunts Lyktgubbar within 8 blocks (extinguish range). When a Lyktgubbe is extinguished, ambient light drops, which strengthens Mörker.
- **Purpose**: Atmosphere, navigation hints, light source near landmarks

### Skogssnigle (Forest Snails)

*Inspired by the quiet, slow-paced life of Swedish forest floors.*

Chunky, low creatures with a segmented shell of angular plates — like a stack of wooden blocks on a rounded base. They graze on grass blocks, slowly converting them to mycel (mushroom blocks) over time.

- **Build**: Base capsule (body) + 5 stacked box segments (shell, each slightly rotated)
- **Legs**: 4 short stubby capsules with simple IK
- **Shell**: Angular plates in moss-green `#3a5a40` and stone-grey `#6b6b6b`
- **Behavior**: Wander (very slow, 0.4 m/s), graze, retract when threatened (becomes a static block), sleep at night against trees
- **Spawn**: Daytime only, biome-gated (`isSnailBiome`). Spawn chance 0.008/frame, at 18 blocks from player.
- **Ecosystem**: Grazes grass blocks for 8 seconds (`GRAZE_TRANSFORM_INTERVAL`) then transforms block below to Mycel. During Norrsken, stops grazing (all interactions pacified).
- **Drops**: Shell Plates (crafting material for armor)

### Tranor (Cranes)

*Sweden's iconic cranes — they gather at Lake Hornborga every spring.*

Tall, elegant wading birds found near water. Long neck, angular folding wings. Fish in shallow water and flee on approach. Travel in flocks of 3-5, honking in formation.

- **Build**: Elongated box torso, 8-segment block chain neck, cone beak
- **Wings**: Flat box panels (fold against body, unfold on flight)
- **Legs**: 2 tall thin capsules with reverse-knee IK, standing in water
- **Color**: Parchment body `#e0d5c1`, ink-black wingtips `#1a1a2e`, red crown spot
- **Behavior**: Wade, fish, flee (unfold wings, honk, take off in V-formation — Boids), return to water at dawn
- **Spawn**: Daytime only. Spawn in flocks of 3 (`TRANA_FLOCK_SIZE`). Biome-gated (`isTranaBiome`). Suppressed during seasonal migration (`tranaMigrating` flag from `SeasonState`). Spawn chance 0.006/frame.
- **Ecosystem**: Flees Mörker within 18 blocks (`MORKER_FLEE_RANGE`) — acts as player early-warning system. Not yet implemented: Nacken co-presence signal.
- **Drops**: Crane Feathers (crafting material for glider, arrows)

---

## Tier 2 — Territorial (Neutral-Hostile)

### Vittra (Underground Folk)

*From Swedish folklore: the invisible people who live in mounds and underground.*

Small, hunched humanoid figures that live near Fornlämningar (ruins). Invisible until the player breaks blocks near their home, then they shimmer into visibility and apply **otur** (bad luck) — increased hunger decay.

- **Build**: Small humanoid (1 block tall) — box torso, sphere head, stubby limbs
- **Visual**: Semi-transparent when passive, solid when aggravated. Earthy colors — brown, grey, moss.
- **Behavior**: Invisible in warrens. Appear when home disturbed. Hover near player, inflicting otur debuff (multiplies `hunger.decayRate`). Appeased by food offerings. Retreat underground at dawn.
- **Spawn**: Inscription-gated (requires mid-tier inscription level). Spawn chance 0.006/frame.
- **Mechanic**: Anti-greed mechanic. Punishes mindless strip-mining near ruins. Rewards respectful play (lagom).

### Nacken (The Water Spirit)

*From Swedish folklore: the beautiful, dangerous fiddler who lures people into the water.*

A humanoid figure that sits on rocks near deep water, playing an instrument. Approaching directly triggers music disorientation (camera shake). Throwing iron into water teaches a rune.

- **Build**: Humanoid sitting pose — box torso, capsule limbs, sphere head with flowing hair (chain of small boxes, physics-driven)
- **Visual**: Translucent green-blue, emissive. Sits on a specific stone block near water.
- **Behavior**: Sits and plays (procedural arm animation). Lures player with particle trail. Punishes direct approach. Rewards iron offering. One per world region — rare.
- **Spawn**: Inscription-gated. Spawn chance 0.002/frame.
- **Purpose**: Exploration reward, lore delivery, teaches respect for water

### Runvaktare (Rune Wardens)

*The guardians of the old saga. Standing stones that remember what they protect.*

Tall, monolithic sentinel figures found near Runsten and Fornlämningar. Stand motionless until the player mines ruin blocks, then activate — slow but devastating.

- **Build**: Tall rectangular column (2 blocks wide, 4 tall). Flat slab head with two ember-glowing slots (eyes). 2 segmented stone limb-arms ending in flat blades.
- **Color**: Stone `#6b6b6b` with gold `#c9a84c` rune glow
- **Behavior**: Dormant near ruins (appear as scenery). Activate when player mines ruin blocks. Slam attack (ground AOE, screen shake). Return to post if player retreats far enough. Can be permanently calmed by placing a rune offering.
- **Spawn**: Inscription-gated. Spawn chance 0.005/frame.
- **Drops**: Runsten Fragments (advanced crafting — rune inscription tools)

---

## Tier 3 — Predators (Hostile)

### Morker (The Darkness)

*Not a specific folklore creature but the universal Scandinavian experience: the deep, pressing darkness of winter nights that feels alive.*

The primary night threat. Small, fast shadow-forms that spawn in groups of 3-5 and hunt in coordinated packs (via Yuka FSM). In torchlight they shrink and burn. In darkness they swell and strengthen.

- **Build**: Amorphous — sphere mesh with vertex displacement noise. 2-4 small emissive red points (eyes). Dark particle trail.
- **Color**: Deep ink `#1a1a2e`, eyes ember `#ff4444`
- **Behavior**: Pack hunting with Yuka FSM (`yuka-states-morker.ts`). Light-averse (take damage in torch radius, flee from fire). Blocked from spawning near active light sources. Dissolve at dawn.
- **Spawn**: Night only. Packs of `PACK_MIN`–`PACK_MAX`. Blocked by nearby light sources (`isSpawnBlockedByLight`). Reduced in player shelters (`ShelterState.morkerSpawnMult`) and by season (`SeasonState.morkerMult`). Spawn chance 0.01/frame.
- **Ecosystem**: Hunts Lyktgubbar (extinguishes within 8 blocks). Triggers Trana flight within 18 blocks. Pacified by Norrsken.
- **Sound**: Whispered Swedish — fragments of words, like a saga being told backwards

### Lindorm (Wyrm)

*From Swedish folklore: the serpent-dragon of Scandinavian legend, depicted on runestones.*

Large serpentine creatures that tunnel through soft terrain. They breach the surface near the player, arcing overhead before diving back in. Destroy blocks as they tunnel.

- **Build**: 12-segment chain of rounded boxes, each slightly narrower toward tail. Head is a larger box with cone snout and small horn cones.
- **Color**: Pale birch-bark `#c9b896` with ember `#a3452a` rune markings
- **Behavior**: Tunnel underground (remove blocks in path), breach near player (arc attack), dive back. Avoid stone. Leave permanent tunnels. Attracted to vibrations (mining activity).
- **Spawn**: Inscription-gated. Spawn chance 0.004/frame.
- **Drops**: Lindorm Scales (armor crafting), Lindorm Fang (weapon crafting)

### Draug (The Restless Dead)

*From Norse mythology: the undead who guard their burial mounds.*

Night-only spectral humanoids that emerge from burial mounds. Stand at the edge of torchlight and watch. Advance when player looks away, freeze when observed.

- **Build**: Humanoid wireframe — visible edges only, no fill. Featureless box head with two dark voids.
- **Visual**: Semi-transparent. Slight screen distortion (chromatic aberration) in proximity.
- **Behavior**: Spawn at night near burial mounds. Advance only when not observed (dot product check of player look direction). Freeze when watched. Deal massive damage on contact. Teleport to mound at dawn.
- **Spawn**: Inscription-gated. Spawn chance 0.007/frame.

---

## Tier 4 — Legendary / World Events

### Jatten (The Giant)

*From Swedish folklore: the giants who shaped the landscape.*

A massive creature that appears when the player has carved extensively into the world (high inscription level). Assembled from the terrain itself. Defeating it yields the **Runsten Seal**.

- **Build**: Humanoid assembled from world blocks (birch wood, stone, dirt, moss). 8 blocks tall, 4 wide.
- **Core**: A single glowing runsten block visible in its chest when staggered
- **Regeneration**: Pulls blocks from nearby terrain to heal (visible — the ground is consumed into its body)
- **Behavior**: Appears near player's largest build. Attacks structures first, then player. If structures pass its "test" (enclosed, lit, warded), it may simply inspect and leave.
- **Spawn**: Inscription-gated, highest threshold. Spawn chance 0.001/frame.

### Norrsken (The Northern Lights)

*Not a creature but a world event — the aurora borealis as a living phenomenon.*

When Norrsken appear, all ecosystem predator-prey interactions cease (`allPacified = true` from `computeEcosystemInteractions`). The pacification lingers 5 seconds after the event ends (`NORRSKEN_PACIFY_DURATION = 5`).

- **Event state**: `NorrskenEvent` trait (singleton) tracks `active`, `timer`, `dayTriggered`
- **Ecosystem effect**: Sets `pacifyTimer = 0` in `ecosystem.ts`, suppressing all hunt targets and Trana flee responses
- **Duration**: 60 seconds. Triggers randomly at night (5% chance per night, once per `dayCount`)
- **Visual**: Animated ribbon of light across the sky (green `#88ff88`, purple `#aa66cc`, blue `#66aaff` — cycling). Everything below tinted with shifting aurora color.

---

## Ecosystem Interactions

Creatures form a **Swedish woodland ecosystem**. The table below shows what is coded vs. what remains design-only.

| Interaction | Status | Details |
|-------------|--------|---------|
| Morker hunts Lyktgubbe | **Coded** | `findMorkerHuntTargets` — extinguishes within 8 blocks (`HUNT_EXTINGUISH_RANGE`) |
| Trana flees Morker | **Coded** | `findTranaFleeTargets` — flee triggered within 18 blocks (`MORKER_FLEE_RANGE`) |
| Skogssnigle grazes grass | **Coded** | `findGrazingSnails` — transforms grass→Mycel after 8 seconds (`GRAZE_TRANSFORM_INTERVAL`) |
| Norrsken pacifies all | **Coded** | `isNorrskenPacified` — lingers 5 seconds after event ends |
| Nacken near Trana signal | **Not coded** | Design intent only — both water creatures, no implementation |
| Draug spawns over Snail mycel | **Not coded** | Design intent only — time-based mound spawning not implemented |
| Vittra + Runvaktare territory combo | **Not coded** | Documented as design; no cross-creature interaction |
| Lindorm tunnels filled by Snail | **Not coded** | Design intent only |

---

## The Swedish Folklore Ladder

The creature progression mirrors how Scandinavians relate to their folklore landscape:

1. **First, the friendly signs** — Tomte (tutorial guide), Lyktgubbar (lights), Skogssniglar (slow forest life), Tranor (cranes). The world is welcoming.
2. **Then, the warnings** — Vittra (don't disturb the mounds), Nacken (respect the water). The world has rules.
3. **Then, the threats** — Morker (winter darkness), Lindormar (ancient serpents), Draugar (the restless dead). The world defends itself.
4. **Finally, the reckoning** — Jatten (the giant that shaped the land). Can your saga stand alongside the old one?
