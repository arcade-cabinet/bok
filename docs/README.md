# Bok Documentation

> "The world is a living saga, written in rune and root."

Bok is a mobile-first 4X voxel survival game rooted in Swedish folklore and craft.
"Bok" = book + beech tree + rune-carving. Building-block aesthetic, Scandinavian
landscape, creatures from Nordic tradition. Target sessions: 5-20 minutes.

---

## Quick Start

```bash
pnpm install
pnpm dev
```

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production (tsc + vite) |
| `pnpm preview` | Preview production build |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test-ct` | Run Playwright component tests |
| `pnpm lint` | Lint with Biome |
| `pnpm lint:fix` | Lint + auto-fix with Biome |
| `pnpm typecheck` | TypeScript type check only |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [ECS Architecture](architecture/ecs.md) | Koota traits, systems, execution order, side-effect pattern |
| [Rendering Pipeline](architecture/rendering.md) | Jolly Pixel engine, behaviors, Three.js integration |
| [Persistence](architecture/persistence.md) | SQLite save/load, voxel delta tracking, save slots |
| [Structures & Runes](architecture/structures.md) | Workstations, shelters, territory, light zones, runic computation |
| [Mobile-First](design/mobile-first.md) | Touch input, performance budgets, session design |
| [Diegetic UI](design/diegetic-ui.md) | World-based feedback over floating HUD elements |
| [Art Direction](design/art-direction.md) | Palette, textures, lighting, building-block aesthetic |
| [4X Pillars](gameplay/4x-pillars.md) | Explore, Expand, Exploit, Exterminate game pillars |
| [Crafting](gameplay/crafting.md) | Recipes, workstations, resource tiers |
| [Progression](gameplay/progression.md) | Quests, unlocks, inscription levels |
| [Lore](world/lore.md) | Swedish folklore, core metaphors, world concepts |
| [Creatures](world/creatures.md) | 11 species, building-block design, procedural animation |
| [Biomes](world/biomes.md) | 6 Swedish landscape biomes |
| [Implementation Plan](IMPLEMENTATION_PLAN.md) | 6-phase development roadmap |

---

## Architecture

Technical architecture and system design documentation.

- [ECS Architecture](architecture/ecs.md) -- Koota integration, trait definitions, system
  execution order, the side-effect pattern for bridging ECS to rendering
- [Rendering Pipeline](architecture/rendering.md) -- Jolly Pixel engine setup, behavior
  system, voxel renderer, creature rendering, procedural animation
- [Persistence](architecture/persistence.md) -- SQLite via sql.js and Capacitor,
  voxel delta storage, save/load flow, database schema
- [Structures & Runes](architecture/structures.md) -- Workstation types, shelter
  mechanics, territory control, light zone propagation, runic inscription system

## Design

Visual design, interaction design, and UI philosophy.

- [Mobile-First](design/mobile-first.md) -- Touch-first input design, 375px minimum
  viewport, performance budgets, session length targets, passive event listeners
- [Diegetic UI](design/diegetic-ui.md) -- Principles for world-integrated feedback:
  damage shown through vignettes not numbers, time shown by sky not clocks,
  inventory is a physical birch-bark book
- [Art Direction](design/art-direction.md) -- Building-block aesthetic, Scandinavian
  color palette, procedural textures, lighting moods, creature visual language

## Gameplay

Game mechanics, systems, and progression design.

- [4X Pillars](gameplay/4x-pillars.md) -- How every feature maps to one of the four
  pillars: eXplore (fog of war, landmarks), eXpand (territory, structures),
  eXploit (mining, crafting, runes), eXterminate (creatures, Draugar, bosses)
- [Crafting](gameplay/crafting.md) -- Recipe system, workstation requirements,
  resource tiers, cooking, tool creation
- [Progression](gameplay/progression.md) -- Quest system, inscription level,
  codex completion, area unlocks, creature observation

## World

Lore, creatures, and biome definitions.

- [Lore](world/lore.md) -- Swedish folklore foundation, core metaphors (bok = book =
  beech = rune-carved bark), cultural concepts (allemansratten, lagom, fika, slojd),
  the world as a living saga
- [Creatures](world/creatures.md) -- 11 creature species from Swedish folklore:
  Morker (shadow wolves), Vittra (underground fae), Lindormar (serpents),
  Draugar (undead), Nacken (water spirits), Trana (cranes), and more.
  All built from geometric primitives, procedurally animated
- [Biomes](world/biomes.md) -- 6 Swedish landscapes: Angen (meadow), Bokskogen
  (beech forest), Fjallen (mountains), Skargarden (archipelago), Myrmarken
  (marshlands), Granitodden (granite cliffs)

## Memory Bank

- [Memory Bank Protocol](memory-bank/AGENTS.md) -- Session context protocol for
  maintaining continuity across agent sessions (when configured)

## Plans

- [Implementation Plan](IMPLEMENTATION_PLAN.md) -- 6-phase roadmap from foundation
  through world generation, creatures, crafting, 4X systems, and polish

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | React | 19 |
| 3D Engine | Jolly Pixel | 2.5 / 3.3 |
| Voxel Renderer | @jolly-pixel/voxel.renderer | 1.4 |
| ECS | Koota | 0.6 |
| Physics | Rapier3D | 0.14 |
| Persistence | sql.js + Capacitor SQLite | 1.14 / 8.x |
| Styling | Tailwind CSS + DaisyUI | 4 / 5 |
| Bundler | Vite | 8 |
| Language | TypeScript | 5.9 |
| Lint/Fmt | Biome | 2.4 |
| Package | pnpm | -- |
| Testing | Vitest + Playwright CT | 4.x / 1.58 |
| Mobile | Capacitor | 8 |
| 3D Math | Three.js | 0.182 |

---

## Project Structure

```text
bok/
  CLAUDE.md                       AI assistant context
  AGENTS.md                       Multi-agent orchestration guide
  docs/                           This documentation
  src/
    main.tsx                      React entry point
    App.tsx                       Root component, phase management
    index.css                     Tailwind 4 + design tokens
    ecs/
      traits/index.ts             All Koota trait definitions
      inventory.ts                Inventory system helpers
      systems/                    ~70+ ECS systems (one file per system)
        index.ts                  Barrel export + execution order
        creature-ai*.ts           9 creature AI variants (per-species)
        creature-spawner*.ts      Spawn systems by threat level
        rune-*.ts                 Rune inscription, indexing, data
        light*.ts                 Light sources and propagation
        mining.ts                 Block mining
        cooking.ts                Cooking system
        eating.ts                 Food consumption
        survival.ts               Health, hunger, stamina
        quest.ts                  Quest tracking
        exploration.ts            Fog of war, discovery
    engine/
      game.ts                     GameBridge -- init, update, destroy
      input-handler.ts            Unified keyboard/mouse/touch input
      creature-parts.ts           Building-block creature assembly
      creature-part-defs*.ts      Part definitions (hostile/neutral)
      procedural-anim.ts          Procedural animation system
      ik-solver.ts                Inverse kinematics for creatures
      spring-physics.ts           Spring-based physics simulation
      behaviors/                  Jolly Pixel Behaviors (visual only)
        ViewModelBehavior.ts      Player view model
        CreatureRendererBehavior.ts  Creature mesh rendering
        EnemyRendererBehavior.ts  Enemy mesh rendering
        BlockHighlightBehavior.ts Block selection highlight
        CelestialBehavior.ts      Sun/moon celestial bodies
        ParticlesBehavior.ts      Game particles (damage, mining)
        AmbientParticlesBehavior.ts  Ambient atmosphere particles
    world/
      blocks.ts                   Block/item/recipe definitions
      block-definitions.ts        Block face definitions
      biomes.ts                   Biome definitions and parameters
      noise.ts                    Simplex noise + worldRng/cosmeticRng
      terrain-generator.ts        Chunk-based terrain generation
      tileset-generator.ts        Procedural block texture atlas
      tileset-tiles.ts            Individual tile drawing functions
      cave-generator.ts           Underground cave system generation
      landmark-generator.ts       Landmark placement logic
      tree-generator.ts           Tree structure generation
      voxel-helpers.ts            Global voxel accessor bridge
      world-utils.ts              Shared world utilities
    persistence/
      db.ts                       SQLite persistence layer
    ui/
      screens/                    Full-screen states
        TitleScreen.tsx           Main menu
        BokScreen.tsx             The Bok (birch-bark book interface)
        DeathScreen.tsx           Death/respawn screen
        NewGameModal.tsx          New game creation
        RuneCanvas.tsx            Rune drawing canvas
      hud/                        In-game overlays
        Crosshair.tsx             Center crosshair
        HotbarDisplay.tsx         Item hotbar
        VitalsBar.tsx             Health/hunger/stamina bars
        TimeDisplay.tsx           Day/night/season indicator
        QuestTracker.tsx          Active quest display
        MobileControls.tsx        Touch joystick + buttons
        BokIndicator.tsx          Bok book access indicator
        DamageVignette.tsx        Screen-edge damage effect
        HungerOverlay.tsx         Hunger warning overlay
        UnderwaterOverlay.tsx     Underwater visual effect
      components/                 Reusable UI components
        BokCodex.tsx              Codex page (knowledge/bestiary)
        BokLedger.tsx             Ledger page (inventory)
        BokMap.tsx                Map page (atlas/exploration)
        BokSaga.tsx               Saga page (journal/quests)
        BokPage.tsx               Shared Bok page layout
        CraftingMenu.tsx          Crafting interface
        RuneWheel.tsx             Rune selection wheel
      hooks/
        useMapGestures.ts         Pinch/pan gesture handling
  public/                         Static assets
```
