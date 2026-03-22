# Bok: The Builder's Tome — Game Design Specification

**Date:** 2026-03-20
**Status:** Approved
**Authors:** jbogaty + Claude

## 1. Game Identity

**Bok: The Builder's Tome** is a roguelike island-hopping voxel adventure. The player holds a magical book — the Builder's Tome — which serves as both their inventory and progression system. Each island conquered adds a new page to the Tome, granting permanent abilities.

**Genre:** Roguelike action-adventure with voxel world
**Art Style:** Stylized low-poly (Kenney/Quaternius aesthetic) — bright, colorful, readable
**Platforms:** Web, iOS, Android, Desktop (via Capacitor)
**Target Session:** 15-30 min per run, 1+ hour total content depth through replayability
**Multiplayer:** Single-player only. No network/multiplayer features in scope.
**Performance Targets:** 60 FPS on desktop/web, 30 FPS on mobile. Max 50 active entities per island. 8-chunk render distance (128 blocks). Particle budget: 200 active.

## 2. Core Loop

```
Hub Island → Set Sail → Explore Island → Boss Fight → Return/Push On → Hub
     ↑                                                         ↓
     └──────────────── death or victory ───────────────────────┘
```

1. **Hub Island** — Persistent home. Build structures, upgrade Tome, buy gear from NPC merchants, unlock new island types. Survives death.
2. **Set Sail** — Choose from unlocked island types. Each has a biome, difficulty tier, and boss.
3. **Explore & Fight** — Procedurally generated island with enemies, loot chests, mini-dungeons, environmental puzzles. Action combat.
4. **Boss Fight** — Unique boss with learnable attack patterns and phases. Defeating grants a Tome page (permanent ability).
5. **Return or Push On** — After clearing, return to Hub with loot OR sail to next (harder) island. Dying loses current-run gear but keeps permanent unlocks.

## 3. Progression Systems

### 3.1 Tome Pages (Permanent)
Boss drops. Each grants a new ability:
- Dash (i-frame movement)
- Ground Pound (AoE stun)
- Block Shield (summon voxel wall)
- Fire Lance (ranged projectile)
- Ice Path (create walkable bridge)
- Wind Jump (double jump)
- Shadow Step (short teleport)
- Stone Skin (temporary armor)

### 3.2 Gear (Per-Run)
Weapons, armor, consumables found on islands. Lost on death.
- Melee: swords, axes, hammers, daggers, spears
- Ranged: bows, crossbows, staffs
- Armor: light/medium/heavy sets per biome
- Consumables: health potions, buff elixirs, throwables

### 3.3 Hub Upgrades (Permanent)
Spend resources to build:
- **Armory** — Better starting gear options
- **Docks** — More island choices per run
- **Library** — Tome page upgrades (stronger abilities)
- **Market** — NPC shops appear on islands
- **Forge** — Craft gear between runs

### 3.4 Biome Unlocks (Permanent)
New island types discovered by:
- Defeating specific bosses
- Reaching certain run depths
- Completing challenges

## 4. Content Scope

### 4.1 Biomes (8 types)
| Biome | Terrain | Hazards | Unique Mechanic |
|-------|---------|---------|-----------------|
| Forest | Trees, clearings, streams | Thorns, falling trees | Dense canopy (limited visibility) |
| Desert | Dunes, oases, ruins | Quicksand, heat waves | Sandstorms (periodic) |
| Tundra | Snow, ice lakes, peaks | Thin ice, blizzards | Freezing meter |
| Volcanic | Lava flows, obsidian | Eruptions, fire geysers | Floor is lava (rising lava) |
| Swamp | Murky water, dead trees | Poison pools, fog | Visibility fog + ambush spawns |
| Crystal Caves | Geodes, crystal pillars | Falling crystals, lasers | Light puzzles (crystal reflections) |
| Sky Ruins | Floating platforms, clouds | Falling, wind gusts | Verticality + wind mechanics |
| Deep Ocean | Coral, underwater caves | Drowning, currents | Underwater combat + air management |

### 4.2 Enemies (16 types)
Enemies are biome-primary but shared types (Slime, Skeleton) can appear in multiple biomes with reskins. Each biome has 2 unique enemies minimum.

| Enemy | Primary Biome | AI Pattern | Special |
|-------|---------------|------------|---------|
| Slime | Forest (shared) | Wander → chase | Splits on death |
| Skeleton Archer | Forest (shared) | Patrol → ranged attack | Fires arrows |
| Sand Wraith | Desert | Burrow → emerge attack | Teleports via sand |
| Scorpion | Desert | Circle strafe → tail strike | Poison DoT |
| Frost Wolf | Tundra | Pack chase | Howl buffs nearby wolves |
| Ice Golem | Tundra | Slow chase → ground pound | Freezes on hit |
| Fire Imp | Volcanic | Flee → ranged fire | Explodes on death |
| Lava Elemental | Volcanic | Seek → engulf | Leaves fire trail |
| Swamp Lurker | Swamp | Hide → ambush | Invisible in water |
| Bog Witch | Swamp | Ranged poison → summon lurkers | Heals nearby enemies |
| Crystal Sentinel | Crystal Caves | Guard → laser beam | Reflects projectiles |
| Gem Spider | Crystal Caves | Ceiling drop → web | Slows player |
| Sky Hawk | Sky Ruins | Dive bomb → retreat | Aerial enemy |
| Wind Elemental | Sky Ruins | Ranged gust → push | Knocks player off platforms |
| Depth Crawler | Deep Ocean | Patrol → grab | Drags player down |
| Angler Fish | Deep Ocean | Lure → charge | Light lure in dark water |

### 4.3 Bosses (8 types)
One boss per biome, one Tome page per boss.

| Boss | Biome | Phases | Tome Drop |
|------|-------|--------|-----------|
| Ancient Treant | Forest | 3: root attacks → summon saplings → enrage | Dash |
| Pharaoh Construct | Desert | 3: sand waves → pillar summon → collapse | Ground Pound |
| Frost Wyrm | Tundra | 3: ice breath → tail sweep → blizzard | Ice Path |
| Magma King | Volcanic | 3: lava throw → floor eruption → meteor rain | Fire Lance |
| Mire Hag | Swamp | 3: poison rain → vine snare → swamp flood | Block Shield |
| Crystal Hydra | Crystal Caves | 3: beam attack → split heads → laser grid | Shadow Step |
| Storm Titan | Sky Ruins | 3: wind blast → lightning → platform destruction | Wind Jump |
| Abyssal Leviathan | Deep Ocean | 3: tentacle sweep → whirlpool → deep dive | Stone Skin |

### 4.4 Weapons (15+ types)
**Melee:**
- Wooden Sword, Iron Sword, Crystal Blade, Volcanic Edge, Frost Cleaver
- War Hammer, Battle Axe, Twin Daggers, Trident

**Ranged:**
- Short Bow, Crossbow, Fire Staff, Ice Wand, Lightning Rod, Crystal Sling

Each weapon has: base damage, attack speed, range, combo chain (3 hits), special property.

## 5. Technical Architecture

### 5.1 Three-Layer Integration

**Koota** — State layer (single source of truth for all entity data)
**Yuka** — AI layer (steering, FSM, goals, perception, pathfinding)
**JollyPixel** — Render layer (voxel world, game loop, scene graph, assets)

### 5.2 Technology Stack

| Layer | Technology |
|-------|-----------|
| Engine | @jolly-pixel/engine, @jolly-pixel/runtime |
| Voxels | @jolly-pixel/voxel.renderer |
| ECS State | koota |
| AI | yuka |
| Physics | @dimforge/rapier3d |
| 3D | three.js |
| Build | Vite + TypeScript (strict, ESM) |
| Platform | @capacitor/core + @capacitor-community/sqlite |
| Test | vitest + @vitest/browser |
| Lint | Biome 2.4 (format + lint + a11y) |

### 5.3 Frame Loop Data Flow

```
Runtime.update(dt)
├── 1. Koota: world.set(Time, { delta: dt })
├── 2. InputSystem: poll devices → write PlayerIntent traits
│       ├── Keyboard/Mouse → ActionMap → PlayerIntent (attack, dodge, parry, move)
│       ├── Gamepad → ActionMap → PlayerIntent
│       └── Touch (Capacitor) → VirtualControls → ActionMap → PlayerIntent
├── 3. Yuka: entityManager.update(dt)
│       ├── Steering → writes Velocity traits
│       ├── FSM → writes AIState traits
│       ├── Goals → writes Intent traits
│       └── Perception → writes Memory traits
├── 4. Koota systems (game logic queries)
│       ├── MovementSystem: query(Position, Velocity) → apply velocity
│       ├── CombatSystem: query(AttackIntent, Position) → resolve hits
│       ├── ProgressionSystem: query(LootPickup) → grant rewards
│       └── SpawnSystem: spawn/despawn entities
├── 5. Rapier: rapierWorld.step()
│       ├── Reads: Position from Koota → sets rigid body transforms
│       ├── Solves: collision detection + response
│       └── Writes: corrected Position back to Koota traits
│       Note: VoxelRenderer auto-builds chunk colliders for terrain.
│       Dynamic entities (player, enemies) use kinematic rigid bodies.
├── 6. JollyPixel Behaviors sync (Koota → Actor transforms)
│       ├── EnemyRenderSync: read Position/AIState → update Actor
│       ├── PlayerRenderSync: read Position → update camera + model
│       └── VoxelRenderer (chunks already managed)
└── 7. Renderer.render()
```

### 5.4 Input System

Platform-agnostic input via an ActionMap abstraction:

```typescript
// Action definitions (not raw keys)
type GameAction = 'moveForward' | 'moveBack' | 'moveLeft' | 'moveRight'
  | 'attack' | 'dodge' | 'parry' | 'interact' | 'tome' | 'pause'
  | 'hotbar1' | 'hotbar2' | 'hotbar3' | 'hotbar4' | 'hotbar5'
  | 'look' | 'jump' | 'sprint';

// InputSystem reads raw devices, writes Koota traits
// PlayerIntent trait: { action: GameAction, value: number, active: boolean }
// MovementIntent trait: { direction: Vector3, sprint: boolean }
// LookIntent trait: { deltaX: number, deltaY: number }
```

**Desktop:** WASD + mouse look (pointer lock). LMB attack, RMB parry, Space dodge, E interact, Tab tome.
**Mobile (Capacitor):** Left virtual joystick (movement), right touch zone (camera). Action buttons: Attack, Dodge, Parry, Interact. Tome swipe gesture.
**Gamepad:** Left stick move, right stick look. Face buttons: attack/dodge/parry/interact. Triggers: sprint/tome.

Input domain: `src/input/` with barrel export. Contains `ActionMap`, `KeyboardMouseDevice`, `TouchDevice`, `GamepadDevice`, `VirtualJoystick`.

### 5.5 Rapier3D Integration

Rapier owns collision resolution. It does NOT drive movement — Koota systems apply velocity, then Rapier corrects overlaps.

- **Terrain colliders**: VoxelRenderer's built-in `VoxelColliderBuilder` generates compound box colliders per chunk automatically when Rapier is passed to the VoxelRenderer constructor.
- **Entity colliders**: Kinematic rigid bodies for player/enemies. CombatSystem uses Rapier raycasts for hit detection (not position-distance queries).
- **Triggers**: Rapier sensors for loot pickup zones, boss arena boundaries, damage zones.
- **Frame position**: After Koota movement systems, before render sync (step 5 in frame loop).

### 5.6 Bridge Pattern (Three-Layer Sync)

```typescript
// === KOOTA ENTITY (data truth) ===
const enemy = world.spawn(
  Position({ x: 10, y: 0, z: 5 }),
  Velocity(),
  Health({ current: 50, max: 50 }),
  AIState({ state: 'patrol' }),
  EnemyType({ config: 'skeleton' }),
  YukaRef(),    // holds Yuka Vehicle reference
  ActorRef()    // holds JollyPixel Actor reference
);

// === YUKA → KOOTA (AI writes to state) ===
class AIBridge {
  syncToKoota(vehicle: Vehicle, entity: Entity) {
    // Steering → velocity
    entity.set(Velocity, { x: vehicle.velocity.x, y: vehicle.velocity.y, z: vehicle.velocity.z });
    // FSM → AI state
    entity.set(AIState, { state: vehicle.stateMachine.currentState?.name ?? 'idle' });
  }
  syncFromKoota(vehicle: Vehicle, entity: Entity) {
    // Position (after Rapier) → Yuka
    const pos = entity.get(Position);
    vehicle.position.set(pos.x, pos.y, pos.z);
  }
}

// === KOOTA → JOLLYPIXEL (state drives rendering) ===
// Note: RenderSyncBehavior was deleted (US-015). Render sync now uses
// a functional approach in gameLoop.ts — enemy mesh transforms are
// updated directly from Yuka vehicle positions each frame.
```

### 5.7 Domain Structure (Full)

```
src/
├── input/            Platform-agnostic input → Koota traits
│   ├── ActionMap.ts, KeyboardMouseDevice.ts, TouchDevice.ts, GamepadDevice.ts
│   └── index.ts      barrel export
├── # behaviors/     DELETED (US-015) — replaced by functional approach in gameLoop.ts
├── systems/          Koota query-based game systems
│   ├── combat/       CombatSystem, DamageCalculator, HitDetection, WeaponComboSystem
│   ├── progression/  RunManager, UnlockTracker, TomeProgression
│   ├── inventory/    Inventory, LootTable, CraftingSystem
│   ├── movement/     MovementSystem, CollisionResolver
│   ├── spawning/     EnemySpawner, LootSpawner, IslandPopulator
│   └── # audio/     DELETED (US-016) — live audio in src/audio/ using Tone.js
│   └── index.ts      barrel export per subdomain
├── ai/               Yuka integration layer
│   ├── steering/     Enemy movement behaviors
│   ├── fsm/          State machines for enemy/boss AI
│   ├── goals/        Goal-driven behaviors
│   ├── perception/   Vision, memory systems
│   ├── bridge.ts     Koota ↔ Yuka sync
│   └── index.ts      barrel export
├── generation/       Procedural generation (pure functions)
│   ├── IslandGenerator.ts
│   ├── TerrainBuilder.ts
│   ├── EnemyPlacer.ts
│   ├── LootPlacer.ts
│   ├── StructureGenerator.ts
│   └── index.ts      barrel export
├── content/          Data-driven game content (JSON + types)
│   ├── types.ts      Shared interfaces
│   ├── registry.ts   Runtime loader + validator
│   ├── biomes/       8 biome JSONs
│   ├── enemies/      16 enemy JSONs
│   ├── weapons/      15+ weapon JSONs
│   ├── bosses/       8 boss JSONs
│   ├── items/        Loot tables, recipes
│   └── hub/          Building configs, NPC configs
│   └── index.ts      barrel export
├── traits/           Koota trait definitions
│   ├── core.ts       Position, Velocity, Health, etc.
│   ├── combat.ts     AttackIntent, Hittable, WeaponStats
│   ├── ai.ts         AIState, YukaRef, Memory
│   ├── player.ts     IsPlayer, TomePages, RunGear
│   ├── world.ts      Time, GamePhase, IslandState
│   └── index.ts      barrel export
├── relations/        Koota relation definitions
│   ├── index.ts      ChildOf, Contains, FiredBy, Targeting, etc.
├── # ui/            DELETED (US-017) — replaced by React components:
├── components/       React UI components (daisyUI + Tailwind CSS 4)
│   ├── hud/          HealthBar, Hotbar, Minimap, DamageIndicator, BuildingInteraction, ContextIndicator
│   ├── modals/       PauseMenu, DeathScreen, VictoryScreen, TomePageBrowser
│   ├── transitions/  SailingTransition
│   └── ui/           TouchControls
├── # scenes/        DELETED (US-017) — replaced by React view routing:
├── app/              React app entry (App.tsx state machine: menu → hub → sailing → game)
├── views/            React view components
│   ├── menu/         MainMenuView
│   ├── game/         GameView (decomposed into hooks)
│   └── hub/          HubView (decomposed into hooks)
├── hooks/            React hooks (useGameLifecycle, useGameEvents, useGameHUD, etc.)
├── rendering/        Visual effects, custom renderers
│   ├── ParticleSystem.ts
│   ├── WeatherSystem.ts
│   ├── DayNightCycle.ts
│   ├── WaterRenderer.ts
│   └── index.ts      barrel export
├── persistence/      SQLite save/load
│   ├── Database.ts   @capacitor-community/sqlite wrapper
│   ├── SaveManager.ts
│   ├── migrations/   Schema migrations
│   └── index.ts      barrel export
├── shared/           Cross-cutting types, constants, event bus
│   ├── types.ts
│   ├── constants.ts
│   ├── EventBus.ts
│   └── index.ts      barrel export
├── audio/            Tone.js procedural SFX + music/atmosphere (live audio system)
├── engine/           Game engine modules (GameEngine.ts orchestrator + focused modules)
└── # main.ts        Entry is now src/app/index.tsx (React)
```

### 5.8 Module Contract

Every domain barrel export follows this pattern:

```typescript
/**
 * @module <domain-name>
 * @role <one sentence describing singular responsibility>
 * @input <what data/types this module consumes>
 * @output <what data/types this module produces>
 * @depends <which other domains it imports from>
 * @tested <test file name>
 */
export { ... } from './Implementation.ts';
export type { ... } from './types.ts';
```

Deep imports across domain boundaries are forbidden and enforced by:
- Biome 2.4 lint rules
- Claude pre-edit hooks (reject `from '../systems/combat/DamageCalculator'`)
- Claude post-edit hooks (verify barrel re-export exists)
- Custom `domain-reviewer` agent

## 6. Combat System

### 6.1 Action Combat
- **Dodge-roll**: i-frames (0.3s invincibility), cooldown (0.8s), stamina cost
- **Weapon combos**: 3-hit chains per weapon, defined in JSON (timing windows, damage multipliers per hit)
- **Block/parry**: timed parry (0.15s window) = counterattack opportunity, hold block = 50% damage reduction
- **Hit detection**: Koota queries — `query(AttackIntent, Position, WeaponStats)` vs `query(Hittable, Position, Health)`
- **Damage calc**: `(weaponBase × comboMultiplier × critMultiplier) - armorReduction`
- **Crit chance**: Yuka fuzzy logic based on weapon type + player skill + enemy state

### 6.2 Boss Phases
- Yuka CompositeGoal trees with health-threshold transitions
- Each phase: distinct attack patterns, arena changes, telegraphed moves
- 3 phases per boss at 100%/66%/33% health
- Brief invulnerability + cinematic during transitions

## 7. Procedural Generation

### 7.1 Island Generation Algorithm
Each island is generated from a `BiomeConfig` + `seed` + `difficulty` tuple.

1. **Terrain heightmap**: 2D simplex noise at 3 octaves, biome-specific amplitude/frequency. Output: `Uint8Array` heightmap.
2. **Feature placement**: Poisson disk sampling for structures (ruins, mini-dungeons, shrines). Distance constraints prevent overlap.
3. **Enemy placement**: Difficulty-scaled spawn points. Positions biased toward structures and paths. Output: `EnemySpawnPoint[]`.
4. **Loot placement**: Chests placed in mini-dungeons and hidden alcoves. Loot table weighted by difficulty tier. Output: `ChestPlacement[]`.
5. **Boss arena**: Fixed template per biome placed at island's far end. Arena is a pre-defined voxel structure loaded from JSON.

All generators are **pure functions** — same seed always produces same island. Fully testable without rendering.

### 7.2 Deterministic Seeding
- `xmur3` hash function converts string seed → 32-bit state
- `sfc32` PRNG generates deterministic sequence from state
- Each subsystem (terrain, enemies, loot) gets its own PRNG fork to ensure independence

## 8. Audio Design

### 8.1 Technology
JollyPixel's built-in `AudioLibrary` + `AudioBackground` for music. `GlobalAudio` for master volume. Web Audio API underneath.

### 8.2 Music
- **Hub Island**: Calm ambient loop (acoustic, warm)
- **Per-biome exploration**: Unique track per biome (8 tracks total), looping
- **Boss fight**: High-intensity track per boss (8 tracks), triggered on arena entry
- **Death screen**: Short somber sting
- **Victory**: Triumphant fanfare on boss defeat

### 8.3 Sound Effects
| Trigger | SFX |
|---------|-----|
| Sword swing (per combo hit) | Whoosh 1/2/3 |
| Weapon impact | Hit + material (flesh, stone, crystal) |
| Dodge roll | Swoosh |
| Parry (timed) | Metal clang + spark |
| Block (held) | Thud |
| Enemy death | Dissolve + type-specific |
| Loot pickup | Chime |
| Boss phase transition | Dramatic sting + roar |
| Footsteps | Surface-dependent (grass, stone, sand, water) |
| Ambient | Per-biome loop (birds, wind, lava, drips) |

### 8.4 Implementation
- SFX are preloaded per-scene via `AssetManager`
- Music crossfades on scene transitions (1s fade)
- Spatial audio for enemy sounds (Three.js PositionalAudio)
- Volume settings persisted in SQLite `settings` table

## 9. Persistence

### 9.1 @capacitor-community/sqlite
- Web: jeep-sqlite (WASM-based SQLite in browser)
- iOS/Android: native SQLite via Capacitor plugin
- Single abstraction layer in `src/persistence/`

### 9.2 Schema
```sql
-- Permanent progression
CREATE TABLE unlocks (id TEXT PRIMARY KEY, type TEXT, data JSON, unlocked_at INTEGER);
CREATE TABLE tome_pages (id TEXT PRIMARY KEY, ability TEXT, level INTEGER, unlocked_at INTEGER);
CREATE TABLE hub_state (building_id TEXT PRIMARY KEY, level INTEGER, data JSON);

-- Run history
CREATE TABLE runs (id INTEGER PRIMARY KEY, seed TEXT, biomes JSON, result TEXT, duration INTEGER, timestamp INTEGER);

-- Settings
CREATE TABLE settings (key TEXT PRIMARY KEY, value JSON);

-- Mid-run save (single slot)
CREATE TABLE save_state (id INTEGER PRIMARY KEY, koota_snapshot BLOB, yuka_snapshot BLOB, scene TEXT, timestamp INTEGER);
```

### 9.3 Serialization Strategy
- Koota traits: serialize via `world.query(...).readEach()` → JSON object per entity. Deserialize by spawning entities with saved trait values.
- Yuka AI state: built-in `toJSON()`/`fromJSON()` on StateMachine, Goal hierarchies, and Vehicle. Stored as JSON blob.
- Both serialized to SQLite `save_state` table as JSON text (not binary blob) for debuggability.
- Content validation uses **Zod** schemas — defined in `src/content/types.ts`, validated at build time and runtime load.

## 10. Scene Management

### 10.1 SceneDirector
The SceneDirector is a **custom FSM** (not Yuka's StateMachine). Yuka FSMs are reserved for AI entity behaviors. SceneDirector manages high-level game flow:

```
MainMenu → Hub → IslandSelect → Sailing → Island → BossArena → Results → Hub
```

Each scene implements: `enter()`, `update(dt)`, `exit()`. SceneDirector handles transitions, loading screens, and cleanup.

## 11. Testing Strategy

- **Vitest + @vitest/browser** for all tests
- **Generation**: seed → deterministic island output (pure function tests)
- **Combat**: damage calc, combo timing, hit detection (unit tests)
- **Content validation**: JSON schema tests for all content files
- **AI**: Yuka FSM transitions, steering output verification
- **Koota**: trait CRUD, query results, relation integrity
- **Integration**: scene lifecycle, save/load round-trip, SQLite operations
- **Each domain**: tests live alongside code, test the barrel-exported public API

## 12. Enforcement & Agentic Infrastructure

### 12.1 Claude Hooks (settings.json)
- **pre-edit**: Reject imports bypassing barrel exports
- **post-edit**: Verify new files have barrel re-export
- **pre-commit**: Run vitest on changed domains

### 12.2 Custom Agents (.claude/agents/)
- **content-author**: Creates biome/enemy/weapon JSON from templates, validates schema
- **domain-reviewer**: Reviews for barrel export violations, SRP breaches
- **test-enforcer**: Ensures public API coverage before merge

### 12.3 Root Documentation
- **AGENTS.md**: Domain map, agent roles, import rules
- **CLAUDE.md**: Build commands, architecture invariants, testing commands
- **ARCHITECTURE.md**: Domain boundaries, data flow, dependency rules
- **DESIGN.md**: This game design (player-facing)
- **CONTRIBUTING.md**: How to add content, create new domains
- **README.md**: Project overview, setup, running
- **SECURITY.md**: Input validation, SQLite safety, Capacitor permissions
- **.github/copilot-instructions.md**: Points to AGENTS.md

### 12.4 Biome 2.4 Lint Rules
- Barrel export enforcement via `domain-reviewer` agent and Claude hooks
- Biome handles formatting, import ordering, a11y checks, and TypeScript lint rules
- Content JSON schema validation at import time via Zod
