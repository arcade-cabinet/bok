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
| **Structures** | [docs/architecture/structures.md](docs/architecture/structures.md) | Workstations, shelter, territory, light zones, decay |
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
```text
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

### Formatting & Language
- **TypeScript strict mode** — no `any` unless truly necessary (cast through `unknown`)
- **Biome** for formatting and linting — `pnpm biome check --write .`
- **Tabs** for indentation, **double quotes**, **always semicolons**
- **No unused imports** — Biome enforces this
- **120 char line width**
- Prefer `const` over `let`. Never use `var`.
- Use `type` imports for type-only imports: `import type { Foo } from ...`

### File Size & Decomposition
- **Max ~200 LOC per file.** If a file exceeds 200 lines, decompose it. Extract utilities, sub-components, or split responsibilities.
- **No monolith components.** Every React component should do one thing. Extract sub-components, custom hooks, and utilities aggressively.
- **App.tsx is the ceiling** — it's the only file allowed to be large (as the root orchestrator). Every other file should be focused and small.

### Separation of Concerns
- **`.tsx` files = UI rendering only.** No game logic, no ECS queries, no physics, no pathfinding in `.tsx` files. They receive data via props and emit events via callbacks.
- **`.ts` files = logic and state.** ECS systems, game bridge, persistence, world generation — all pure TypeScript with no JSX.
- **Koota (ECS) owns ALL gameplay state.** No React `useState` for game state. React state is only for UI state (which menu is open, which tab is active).
- **Jolly Pixel owns ALL rendering.** Behaviors manage Three.js objects. React never creates or manipulates Three.js objects directly.
- **Side-effect callbacks bridge ECS → rendering.** ECS systems never import Three.js. When a system needs visual feedback, it calls a callback that the GameBridge provides.

### Library Spheres of Influence
| Library | Owns | Does NOT Touch |
|---------|------|----------------|
| **Koota** | All gameplay state (traits, systems) | Three.js, DOM, React |
| **Jolly Pixel** | Scene graph, actors, behaviors, rendering | ECS mutations, persistence |
| **React** | UI overlays, HUD, menus, screens | Three.js objects, ECS systems |
| **Three.js** | 3D math, meshes, materials, cameras | Used only inside Behaviors |
| **SQLite** | Save/load, voxel deltas, player state | Runtime game state |
| **Tailwind/DaisyUI** | CSS utility classes, component styles | Inline styles (use sparingly) |

### Testing
- **Playwright Component Testing (CT)** for all React components — visual testing of individual components in isolation before full e2e.
- **Test files live next to source:** `Component.ct.tsx` beside `Component.tsx`.
- **Run component tests:** `pnpm test-ct`
- **Write tests before or alongside new UI components** — TDD for UI.
- **Every `.tsx` component should have a `.ct.tsx` test** covering: renders correctly, handles props, responds to user interaction, accessibility attributes.

### PRNG
- **Never use `Math.random()` anywhere.** Use `worldRng()` for deterministic game logic (terrain, spawns, drops). Use `cosmeticRng()` for non-deterministic visual-only effects (particles, screen shake).
- Both RNGs are defined in `src/world/noise.ts`.

### Accessibility
- All interactive elements must have `type="button"` on `<button>` elements.
- Decorative elements get `aria-hidden="true"`.
- Modal overlays get `role="dialog"` and `aria-modal="true"`.
- Support `prefers-reduced-motion` via CSS (already global in index.css).
- Never lock viewport zoom (`user-scalable=no`).

## Build & Dev

```bash
pnpm install          # Install dependencies
pnpm dev              # Vite dev server
pnpm build            # tsc -b && vite build
pnpm typecheck        # tsc -b --dry (type check only)
pnpm lint             # biome check .
pnpm lint:fix         # biome check --write .
```

## CI/CD

- **CI** (`ci.yml`): Runs on PRs to main — typecheck, lint, build, component tests
- **CD** (`cd.yml`): Runs on push to main — typecheck, lint, build + deploy to GitHub Pages
- **Dependabot**: Weekly pnpm + GitHub Actions updates
- **Automerge**: Minor/patch dependabot PRs auto-squash-merge
