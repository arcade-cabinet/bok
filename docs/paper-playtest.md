# Paper Playtest — Full Player Experience Walkthrough

Every moment from first launch through completing multiple islands.
For each step: what the player SEES, DOES, and what FEEDBACK they get.
Mark issues with ❌ and what needs fixing.

---

## Phase 1: First Launch

### Step 1.1: Title Screen
**SEES:** BOK title, subtitle, animated parchment background, "New Game" and "Inscriptions" buttons
**DOES:** Clicks "New Game"
**FEEDBACK:** Panel slides in with seed input and mode toggle
**STATUS:** ✅ Working — verified on iOS

### Step 1.2: New Game Setup
**SEES:** "Begin a New Tale" heading, seed input ("Brave Dark Fox"), Survival/Creative toggle, Begin button
**DOES:** Optionally changes seed, selects mode, clicks Begin
**FEEDBACK:** Game creates save in SQLite, transitions to hub
**STATUS:** ✅ Working — but Begin button had race condition (fixed)

---

## Phase 2: Hub Island (First Visit)

### Step 2.1: Hub Load
**SEES:** Green/olive voxel terrain, blue sky, HUD (resources, Menu button), crosshair
**DOES:** Looks around
**FEEDBACK:** 60 FPS, smooth camera, terrain extends to horizon
**STATUS:** ✅ Working

### Step 2.2: Orientation
**SEES:** ???
**DOES:** Where do I go? What am I looking at?
❌ **ISSUE: No visual landmarks.** The hub is just flat terrain. No buildings visible. No docks visible from spawn. No Guide NPC visible. Player has NO IDEA what to do or where to go.

**NEEDS:**
- Spawn facing the Guide NPC who is VISIBLE (3D character model)
- Guide NPC has a floating name label visible from distance
- "Walk to a dock to set sail" text in HUD is too subtle
- Buildings (Armory, Library, Forge) need to be visible voxel structures
- Docks need to be visible from the center (wood planks extending into water at edges)

### Step 2.3: Guide NPC Interaction
**SEES:** ??? (NPC is invisible — no model loaded)
**DOES:** Walks near the NPC position — dialogue opens
❌ **ISSUE: NPC is invisible.** The npcEntities system spawns colored box meshes for NPCs, not Character models. The Guide should be a Character_Male_1.gltf or Character_Female_1.gltf model.
❌ **ISSUE: NPC dialogue is generic.** The Guide says the same thing regardless of progression state. Should give contextual advice: "Head east to the Whispering Woods dock" on first visit, "The desert dock is now open!" after beating the forest boss.

### Step 2.4: Finding Docks
**SEES:** Wood plank blocks extending from shore with stone signposts
**DOES:** Walks to a dock
**FEEDBACK:** Floating label shows island name with biome-colored background
❌ **ISSUE: Signpost labels may not be visible from center.** Player needs to walk all the way to the edge to find them. Need visual indicators — maybe a colored banner pole visible from distance.
❌ **ISSUE: "Come Back Later" notice for locked docks is fine but the parchment style doesn't contrast enough.** Needs more visual punch.

### Step 2.5: Setting Sail
**SEES:** "Set Sail to Whispering Woods" button when near forest dock
**DOES:** Clicks button
**FEEDBACK:** View transitions to SailingTransition (boat animation, "Sailing to Whispering Woods...")
**STATUS:** ✅ Flow works — verified concept

---

## Phase 3: Forest Island (First Island)

### Step 3.1: Island Load
**SEES:** Forest-biome terrain (should be different colors/blocks than hub)
**DOES:** Looks around
❌ **ISSUE: Where's the HUD?** Goal tracker should show objectives immediately. Health bar, stamina, hotbar should all be visible.
❌ **ISSUE: No tutorial hint.** First-time player on first island should get contextual hints: "Press left-click to attack", "Press R to change block type", "Walk near glowing structures to discover landmarks"
❌ **ISSUE: What tool am I holding?** The center-mounted weapon model (Sword_Wood.gltf) loads but it's tiny and positioned weirdly. Player doesn't know what they're equipped with.

### Step 3.2: Tool/Weapon Display
**SEES:** Small sword model at bottom-right of screen
**DOES:** Nothing — can't tell what it is
❌ **ISSUE: Tool display needs redesign.** The weapon should be prominently visible in the lower center, clearly a SWORD. When switching to a pickaxe for mining, it should visually change.
❌ **ISSUE: No way to SWITCH tools on mobile.** Desktop has 1-5 keys for hotbar. Mobile has no hotbar interaction. Need swipe-to-cycle or tap-on-hotbar-slot.

### Step 3.3: Exploring
**SEES:** Green terrain with trees (voxel trees from ChunkWorld, maybe 3D trees from props)
**DOES:** Walks forward
❌ **ISSUE: Movement feels okay with smooth acceleration BUT no jump mechanic.** Player gets stuck on 1-block height differences. The auto-platforming handles 1-block steps but not 2-block walls. Player NEEDS a jump to navigate terrain.
❌ **ISSUE: No sprint visual feedback.** Holding Shift sprints but there's no FOV change, no speed lines, no visual cue that you're faster.

### Step 3.4: First Enemy Encounter
**SEES:** Enemy model (Hedgehog.gltf for slime, Skeleton.gltf for skeleton) with green forest tint
**DOES:** Approaches, clicks to attack
**FEEDBACK:** Sword swing sound, hit flash on enemy, damage number floats up, enemy health decreases
❌ **ISSUE: Can't see enemy health bar.** No health bar above enemies. Player doesn't know if the enemy has 5 HP or 50 HP left. Need floating health bars above enemies.
❌ **ISSUE: Enemy name not shown.** Is this a "Slime"? A "Forest Guardian"? No identification.

### Step 3.5: Combat
**SEES:** Enemy chasing, red vignette on damage, health bar decreasing
**DOES:** Attacks, dodges (Space), blocks (RMB)
**FEEDBACK:** Hit sounds, dodge whoosh, stamina decreasing, combo damage numbers
❌ **ISSUE: Dodge doesn't VISUALLY move the player.** The i-frames work but there's no dodge-roll animation or movement burst. Player doesn't FEEL the dodge.
❌ **ISSUE: Block has no visual indicator.** Holding RMB blocks but there's no shield-up animation or stance change.

### Step 3.6: Enemy Death
**SEES:** Enemy shrinks and fades over 0.5s, red particle burst
**DOES:** Nothing — automatic
**FEEDBACK:** Enemy death sound, particle effect, "+1 Kill" goal progress (if shown), loot drops
❌ **ISSUE: Loot drops are tiny colored cubes.** Should use Collectible models (apple, cheese, etc.) or at least have a pickup glow effect.

### Step 3.7: Breaking Blocks
**SEES:** Crosshair on a block, progress bar below crosshair while holding click
**DOES:** Holds left-click on a block
**FEEDBACK:** Progress bar fills based on tool speed, block breaks, "+1 Wood" notification
❌ **ISSUE: Which blocks can I break?** No visual indicator of what's breakable vs decoration. The ghost wireframe only shows PLACEMENT, not the target block highlight.
❌ **ISSUE: No block-break particle effect.** Block just disappears. Should have particles matching block color.

### Step 3.8: Placing Blocks
**SEES:** Ghost wireframe at placement position
**DOES:** Right-clicks to place
**FEEDBACK:** Block appears, placement sound, resource consumed from inventory
❌ **ISSUE: Where's my block inventory?** The hotbar shows "Stone [Cube]" but there's no visual inventory count. Player doesn't know how many blocks they have.
❌ **ISSUE: Shape selection is T key — not discoverable on mobile.** Need a shape selector in the HUD.

### Step 3.9: Finding a Shrine (Landmark)
**SEES:** Stone pillar structure with flower in center, purple diamond on minimap
**DOES:** Walks near it
**FEEDBACK:** "Landmark Discovered!" event, goal tracker updates
❌ **ISSUE: Shrines are hard to spot.** They're small stone structures. Need a glow effect or particle trail to draw the eye from distance.

### Step 3.10: Goal Completion
**SEES:** All 3 goals checked off in the tracker
**DOES:** Looks for the boss
**FEEDBACK:** "The path to the boss is open" message
❌ **ISSUE: Where IS the boss?** No indicator pointing to the boss location. No compass, no directional hint. Player is lost in an infinite world looking for a single enemy.

### Step 3.11: Boss Fight
**SEES:** Giant model (1.5x scale) with forest-green tint
**DOES:** Attacks, dodges phases
**FEEDBACK:** Phase transitions with speed/scale changes, boss telegraph events
❌ **ISSUE: Boss health bar is in the corner (EngineState.bossHealthPct).** Should be a prominent bar at the top of the screen. Boss name should be displayed.
❌ **ISSUE: Phase transitions have no dramatic moment.** No brief invulnerability, no camera shake, no "THE TREANT ENRAGES" text.

### Step 3.12: Boss Defeat → Victory
**SEES:** "A NEW PAGE IS WRITTEN" screen, tome ability card
**DOES:** Clicks "Return to Hub" or "Continue Voyage"
**FEEDBACK:** Run recorded, tome page unlocked, next biome dock unlocked
**STATUS:** ✅ Flow exists

---

## Phase 4: Return to Hub → Next Island

### Step 4.1: Hub with Progress
**SEES:** Hub island, now with desert dock unlocked
**DOES:** Walks to desert dock
❌ **ISSUE: Guide NPC should have NEW dialogue.** "Congratulations! The Sunscorched Dunes are now accessible. Visit the western docks."
❌ **ISSUE: No visual change on the unlocked dock.** The "Come Back Later" sign should be removed and replaced with the island name signpost. There should be a celebratory visual — maybe a new banner unfurling.

### Step 4.2: Desert Island
**SEES:** Sandy terrain, cacti, different sky color, sandstorm weather
**DOES:** Explores a COMPLETELY DIFFERENT world
**FEEDBACK:** Different music, different enemies (sand wraith, scorpion), different resources
❌ **ISSUE: Does the desert actually LOOK different?** The biome-specific blocks, sky color, fog color, and weather should make it unmistakably NOT the forest. Need to verify visually.

---

## Summary of Critical UX Issues

### MUST FIX (Player can't play without these):
1. ❌ NPC models — invisible, need CubeWorld Character GLTFs
2. ❌ Jump mechanic — can't navigate terrain
3. ❌ Enemy health bars — can't gauge fight difficulty
4. ❌ Boss location indicator — lost in infinite world
5. ❌ Tool switching on mobile — can't change tools

### SHOULD FIX (Game feels amateur without these):
6. ❌ Sprint visual feedback (FOV change)
7. ❌ Dodge movement burst
8. ❌ Block stance visual
9. ❌ Loot drop models (not cubes)
10. ❌ Target block highlight (not just placement ghost)
11. ❌ Block inventory count in HUD
12. ❌ Shape selector on mobile
13. ❌ Shrine glow/particle effect
14. ❌ Boss health bar at top of screen
15. ❌ Phase transition dramatic moment
16. ❌ Guide NPC contextual dialogue
17. ❌ Dock visual indicators from distance
18. ❌ Spawn orientation (face toward Guide)
