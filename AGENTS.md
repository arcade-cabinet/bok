# Agent Instructions for Bok

> Bok is a mobile-first 4X voxel survival game rooted in Swedish folklore and craft. "Bok" = book, beech tree, and rune-carving — the world is a living saga. Building-block aesthetic, Scandinavian landscape, creatures from Nordic tradition. Read the docs before changing the code.

## Required Reading

Before making any change, understand the relevant domain:

| Domain | Document | Read When |
|--------|----------|-----------|
| **World concept** | [docs/world/lore.md](docs/world/lore.md) | Any gameplay, narrative, or UX work |
| **Creatures** | [docs/world/creatures.md](docs/world/creatures.md) | Enemy, creature, or ecosystem work |
| **Biomes** | [docs/world/biomes.md](docs/world/biomes.md) | Terrain, world generation, or biome work |
| **4X Pillars** | [docs/gameplay/4x-pillars.md](docs/gameplay/4x-pillars.md) | Any feature design or gameplay system |
| **Progression** | [docs/gameplay/progression.md](docs/gameplay/progression.md) | Quests, unlocks, crafting tiers |
| **Crafting** | [docs/gameplay/crafting.md](docs/gameplay/crafting.md) | Recipes, workstations, resources |
| **Mobile-First** | [docs/design/mobile-first.md](docs/design/mobile-first.md) | Any UI, input, or performance work |
| **Diegetic UI** | [docs/design/diegetic-ui.md](docs/design/diegetic-ui.md) | Any HUD, menu, or feedback work |
| **Art Direction** | [docs/design/art-direction.md](docs/design/art-direction.md) | Visuals, colors, creatures, lighting |
| **ECS** | [docs/architecture/ecs.md](docs/architecture/ecs.md) | Any ECS trait, system, or entity work |
| **Rendering** | [docs/architecture/rendering.md](docs/architecture/rendering.md) | Any Three.js, Jolly Pixel, or visual work |
| **Persistence** | [docs/architecture/persistence.md](docs/architecture/persistence.md) | Save/load, database, delta tracking |

## Core Principles

### 1. Mobile-First
Every feature starts with "how does this work on a phone?" Touch is primary input. Sessions are short. Performance budget is tight. See [mobile-first.md](docs/design/mobile-first.md).

### 2. Diegetic Over Non-Diegetic
Prefer world-based feedback over floating UI. Damage is felt through screen effects, not read from numbers. Time is shown by the sky, not a clock. See [diegetic-ui.md](docs/design/diegetic-ui.md).

### 3. The World is a Swedish Saga
Everything connects to the core metaphor. "Bok" = book = beech tree = rune-carved bark. Creatures are from Swedish folklore (Mörker, Vittra, Lindormar, Draugar). Biomes are Swedish landscapes (Ängen, Bokskogen, Fjällen, Skärgården). Building is rune-carving. The player's inventory is a physical birch-bark book called the Bok. Swedish concepts (allemansrätten, lagom, fika, slöjd) inform gameplay design. See [lore.md](docs/world/lore.md).

### 4. 4X Underpinning
Every feature should serve at least one pillar: eXplore, eXpand, eXploit, eXterminate. If a feature doesn't serve a pillar, question whether it belongs. See [4x-pillars.md](docs/gameplay/4x-pillars.md).

### 5. Creatures Are Building Blocks, Not Boxes
Creatures are assembled from geometric primitives like Scandinavian wooden toys — articulated, multi-part, procedurally animated. They draw from Swedish folklore (Mörker, Vittra, Lindormar, etc.), not generic fantasy. Never add a creature as a single box mesh. See [creatures.md](docs/world/creatures.md).

## Architecture Rules

### ECS State Ownership
- **All gameplay state lives in Koota ECS traits.** The rendering layer reads from ECS, never owns game state.
- **Systems are pure functions.** They take `(world, dt, ...sideEffects)` and mutate ECS state. They never import Three.js.
- **Side effects bridge ECS to rendering.** When a system needs to affect the visual world (spawn particles, remove a block), it calls a side-effect callback passed in by the GameBridge.

### File Organization
```
src/
├── ecs/
│   ├── traits/index.ts     — All trait definitions (single file)
│   └── systems/*.ts         — One file per system
├── engine/
│   ├── game.ts              — GameBridge, initGame, destroyGame
│   ├── input-handler.ts     — Keyboard/mouse/touch input
│   └── behaviors/*.ts       — Jolly Pixel Behaviors (visual only)
├── world/
│   ├── blocks.ts            — Block/item/recipe definitions
│   ├── noise.ts             — Simplex noise + seed generation
│   ├── terrain-generator.ts — Chunk terrain generation
│   ├── tileset-generator.ts — Procedural block textures
│   └── voxel-helpers.ts     — Global voxel accessor bridge
├── persistence/
│   └── db.ts                — SQLite persistence layer
├── ui/
│   ├── screens/*.tsx         — Full-screen states (title, death)
│   ├── hud/*.tsx             — In-game overlays
│   └── components/*.tsx      — Reusable UI components
├── App.tsx                   — Root component, phase management, save/load wiring
└── main.tsx                  — React entry point
```

### Adding a New ECS System
1. Create `src/ecs/systems/my-system.ts`
2. Export from `src/ecs/systems/index.ts`
3. Call it in `GameBridge.update()` in `src/engine/game.ts` (order matters — see [ecs.md](docs/architecture/ecs.md))
4. If it needs rendering interaction, use the side-effect pattern

### Adding a New Creature
1. Design it per the guidelines in [creatures.md](docs/world/creatures.md) — multi-part, procedurally animated
2. Add ECS traits if needed (or extend EnemyState)
3. Add spawn/AI logic in the enemy system
4. Create a Behavior in `src/engine/behaviors/` for its visual representation
5. Wire the Behavior in GameBridge

### Adding a New Block
1. Add to `BlockId` enum and `BLOCKS` array in `src/world/blocks.ts`
2. Add face definitions to `createBlockDefinitions()`
3. Add texture drawing function in `src/world/tileset-generator.ts`
4. Update tileset grid dimensions if needed (COLS/ROWS)
5. Add to `Inventory` trait if mineable
6. Add recipes if craftable

## Code Standards

- **TypeScript strict mode** — no `any` unless truly necessary (cast through `unknown`)
- **Biome** for formatting and linting — `npx biome check --write .`
- **Tabs** for indentation, **double quotes**, **always semicolons**
- **No unused imports** — Biome enforces this
- **120 char line width**
- Prefer `const` over `let`. Never use `var`.
- Use `type` imports for type-only imports: `import type { Foo } from ...`

## Build & Dev

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server
npm run build        # tsc -b && vite build
npm run typecheck    # tsc -b --dry (type check only)
npm run lint         # biome check .
npm run lint:fix     # biome check --write .
```

## CI/CD

- **CI** (`ci.yml`): Runs on PRs to main — typecheck, lint, build
- **CD** (`cd.yml`): Runs on push to main — build + deploy to GitHub Pages
- **Dependabot**: Weekly npm + GitHub Actions updates
- **Automerge**: Minor/patch dependabot PRs auto-squash-merge
