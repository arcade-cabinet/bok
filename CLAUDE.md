# Claude Code Instructions

Read [AGENTS.md](AGENTS.md) for all project context, architecture rules, and design principles. That file references the `docs/` directory for domain-specific details.

## Required Reading (MANDATORY -- every session)

1. **`AGENTS.md`** -- Project overview, architecture, commands, rules
2. **`docs/memory-bank/AGENTS.md`** -- Memory bank protocol, session context (when it exists)

Read these before doing any substantive work.

## Quick Reference

- **What is Bok?** A mobile-first 4X voxel survival game rooted in Swedish folklore. "Bok" = book + beech tree + rune-carving. The world is a living saga. Building-block aesthetic, Scandinavian landscape, Nordic creatures.
- **Stack**: Jolly Pixel + Koota ECS + React 19 + Three.js + Capacitor SQLite
- **Lint/Format**: `pnpm biome check --write .` (tabs, double quotes, semicolons)
- **Type check**: `pnpm tsc -b`
- **Dev**: `pnpm dev`
- **Build**: `pnpm build`
- **Test**: `pnpm test` (Vitest unit) / `pnpm test-ct` (Playwright CT)

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/lint-and-test` | Run full Biome lint + tsc + Vitest suite |
| `/update-docs` | Update memory bank with session state |
| `/quality-check` | Check LOC limits, lint, types |

## Common Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Vite dev server
pnpm build            # tsc -b && vite build
pnpm typecheck        # tsc -b --dry (type check only)
pnpm lint             # biome check .
pnpm lint:fix         # biome check --write .
pnpm test             # vitest run (all unit tests)
pnpm test:watch       # vitest (watch mode)
pnpm test-ct          # playwright component tests
```

## Current Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | React 19 | UI layer, component model |
| 3D Engine | Jolly Pixel 2.5 / 3.3 | Scene rendering, actors, behaviors |
| Voxel Renderer | @jolly-pixel/voxel.renderer 1.4 | Voxel world rendering |
| ECS | Koota 0.6 | Entity-component-system (traits, systems) |
| Physics | Rapier3D 0.14 | Rigid body physics |
| State | Koota traits (runtime) | All gameplay state in ECS |
| Persistence | SQLite (sql.js + Capacitor) | Save/load, voxel deltas |
| Styling | Tailwind CSS 4 + DaisyUI 5 | UI component library |
| Bundler | Vite 8 | Fast dev server, HMR |
| Language | TypeScript 5.9 | Strict mode |
| Lint/Fmt | Biome 2.4 | Single tool for lint + format |
| Package Mgr | pnpm | Fast, strict |
| Testing | Vitest 4 (unit) + Playwright CT 1.58 (component) | TDD approach |
| Mobile Native | Capacitor 8 | PWA + native bridge |
| 3D Math | Three.js 0.182 | Used only inside Behaviors |

## Project Structure

```
bok/
├── CLAUDE.md                        # This file
├── AGENTS.md                        # Multi-agent orchestration guide
├── docs/                            # Game design, architecture, world docs
│   ├── README.md                    # Documentation index
│   ├── IMPLEMENTATION_PLAN.md       # 6-phase roadmap
│   ├── architecture/                # ECS, rendering, persistence, structures
│   ├── design/                      # Mobile-first, diegetic UI, art direction
│   ├── gameplay/                    # 4X pillars, crafting, progression
│   ├── world/                       # Lore, creatures, biomes
│   └── memory-bank/                 # Session context protocol
├── src/
│   ├── main.tsx                     # React entry point
│   ├── App.tsx                      # Root component, phase management
│   ├── index.css                    # Tailwind 4 + design tokens
│   ├── test-utils.ts                # Shared test utilities
│   ├── ecs/
│   │   ├── traits/index.ts          # All Koota trait definitions
│   │   ├── inventory.ts             # Inventory helpers
│   │   └── systems/                 # ~70+ ECS systems (one file per system)
│   │       ├── index.ts             # System barrel export
│   │       ├── creature-ai*.ts      # 9 creature AI variants
│   │       ├── creature-spawner*.ts # Spawn systems (passive/neutral/hostile)
│   │       ├── rune-*.ts            # Rune inscription, index, data
│   │       ├── light*.ts            # Light sources, propagation
│   │       ├── mining.ts            # Block mining
│   │       ├── cooking.ts           # Cooking system
│   │       ├── eating.ts            # Food consumption
│   │       ├── survival.ts          # Hunger, health, stamina
│   │       ├── quest.ts             # Quest tracking
│   │       ├── exploration.ts       # Fog of war, discovery
│   │       └── *.test.ts            # Adjacent test files
│   ├── engine/
│   │   ├── game.ts                  # GameBridge, initGame, destroyGame
│   │   ├── input-handler.ts         # Keyboard/mouse/touch input
│   │   ├── creature-parts.ts        # Building-block creature assembly
│   │   ├── creature-part-defs*.ts   # Part definitions (hostile/neutral)
│   │   ├── procedural-anim.ts       # Procedural animation system
│   │   ├── ik-solver.ts             # Inverse kinematics
│   │   ├── spring-physics.ts        # Spring-based physics
│   │   └── behaviors/               # Jolly Pixel Behaviors (visual only)
│   │       ├── ViewModelBehavior.ts
│   │       ├── CreatureRendererBehavior.ts
│   │       ├── EnemyRendererBehavior.ts
│   │       ├── BlockHighlightBehavior.ts
│   │       ├── CelestialBehavior.ts
│   │       ├── ParticlesBehavior.ts
│   │       └── AmbientParticlesBehavior.ts
│   ├── world/
│   │   ├── blocks.ts                # Block/item/recipe definitions
│   │   ├── block-definitions.ts     # Block face definitions
│   │   ├── biomes.ts                # Biome definitions
│   │   ├── noise.ts                 # Simplex noise + seed generation
│   │   ├── terrain-generator.ts     # Chunk terrain generation
│   │   ├── tileset-generator.ts     # Procedural block textures
│   │   ├── tileset-tiles.ts         # Tile definitions
│   │   ├── cave-generator.ts        # Cave system generation
│   │   ├── landmark-generator.ts    # Landmark placement
│   │   ├── tree-generator.ts        # Tree structure generation
│   │   ├── voxel-helpers.ts         # Global voxel accessor bridge
│   │   └── world-utils.ts           # Shared world utilities
│   ├── persistence/
│   │   └── db.ts                    # SQLite persistence layer
│   ├── ui/
│   │   ├── screens/                 # Full-screen states
│   │   │   ├── TitleScreen.tsx
│   │   │   ├── BokScreen.tsx        # The Bok (birch-bark book UI)
│   │   │   ├── DeathScreen.tsx
│   │   │   ├── NewGameModal.tsx
│   │   │   └── RuneCanvas.tsx
│   │   ├── hud/                     # In-game overlays
│   │   │   ├── Crosshair.tsx
│   │   │   ├── HotbarDisplay.tsx
│   │   │   ├── VitalsBar.tsx
│   │   │   ├── TimeDisplay.tsx
│   │   │   ├── QuestTracker.tsx
│   │   │   ├── MobileControls.tsx
│   │   │   ├── BokIndicator.tsx
│   │   │   ├── DamageVignette.tsx
│   │   │   ├── HungerOverlay.tsx
│   │   │   └── UnderwaterOverlay.tsx
│   │   ├── components/              # Reusable UI components
│   │   │   ├── BokCodex.tsx         # Codex page (knowledge)
│   │   │   ├── BokLedger.tsx        # Ledger page (inventory)
│   │   │   ├── BokMap.tsx           # Map page (atlas)
│   │   │   ├── BokSaga.tsx          # Saga page (journal)
│   │   │   ├── BokPage.tsx          # Shared page layout
│   │   │   ├── CraftingMenu.tsx     # Crafting interface
│   │   │   └── RuneWheel.tsx        # Rune selection wheel
│   │   └── hooks/
│   │       └── useMapGestures.ts    # Pinch/pan map gestures
│   └── .claude/
│       ├── agents/                  # Agent definitions
│       └── commands/                # Slash command definitions
├── public/                          # Static assets
├── biome.json                       # Linter/formatter config
├── vitest.config.ts                 # Test runner config
├── playwright-ct.config.ts          # Component test config
├── vite.config.ts                   # Bundler config
├── capacitor.config.ts              # Capacitor native config
└── tsconfig.json                    # TypeScript config
```

## Architecture Patterns

### ECS State Ownership (Koota)

All gameplay state lives in Koota ECS traits. The rendering layer reads from ECS, never owns game state.

```typescript
// Good: query traits directly
const health = entity.get(Health);

// Bad: storing game state in React
const [health, setHealth] = useState(100); // WRONG
```

Systems are pure functions: `(world, dt, ...sideEffects) => void`. They run every frame in the game loop inside `GameBridge.update()`.

### Side-Effect Pattern

ECS systems never import Three.js. When a system needs to affect the visual world (spawn particles, remove a block), it calls a side-effect callback passed in by the GameBridge.

### Library Spheres of Influence

| Library | Owns | Does NOT Touch |
|---------|------|----------------|
| **Koota** | All gameplay state (traits, systems) | Three.js, DOM, React |
| **Jolly Pixel** | Scene graph, actors, behaviors, rendering | ECS mutations, persistence |
| **React** | UI overlays, HUD, menus, screens | Three.js objects, ECS systems |
| **Three.js** | 3D math, meshes, materials, cameras | Used only inside Behaviors |
| **SQLite** | Save/load, voxel deltas, player state | Runtime game state |
| **Tailwind/DaisyUI** | CSS utility classes, component styles | Inline styles (use sparingly) |

### State Split: ECS vs SQLite

- **Koota (ECS):** Runtime game state -- entity positions, health, hunger, inventory, creature AI. Lives in memory.
- **SQLite:** Persistent state -- voxel modifications, player progress, world seed, save slots. Serialized to disk.
- **Rule:** If it changes every frame, it belongs in ECS. If it persists across sessions, it belongs in SQLite.

## Key Files to Read First

When starting any work session, read these files in order:

1. `AGENTS.md` -- Full project context and architecture rules
2. `docs/README.md` -- Documentation index
3. `src/ecs/traits/index.ts` -- All ECS trait definitions
4. `src/ecs/systems/index.ts` -- System barrel export and execution order
5. `src/engine/game.ts` -- GameBridge, initGame, destroyGame
6. `src/App.tsx` -- Root component, phase management
7. `src/world/blocks.ts` -- Block/item/recipe definitions
8. `src/persistence/db.ts` -- SQLite persistence layer
9. `src/engine/input-handler.ts` -- Input system
10. `src/engine/creature-parts.ts` -- Building-block creature assembly

## Key Docs

| What | Where |
|------|-------|
| World/lore/metaphors | `docs/world/lore.md` |
| Creature design | `docs/world/creatures.md` |
| Biome definitions | `docs/world/biomes.md` |
| 4X game pillars | `docs/gameplay/4x-pillars.md` |
| Crafting system | `docs/gameplay/crafting.md` |
| Progression/quests | `docs/gameplay/progression.md` |
| Mobile-first design | `docs/design/mobile-first.md` |
| Diegetic UI principles | `docs/design/diegetic-ui.md` |
| Art direction | `docs/design/art-direction.md` |
| ECS architecture | `docs/architecture/ecs.md` |
| Rendering pipeline | `docs/architecture/rendering.md` |
| Structures & runes | `docs/architecture/structures.md` |
| Save/load system | `docs/architecture/persistence.md` |
| Implementation roadmap | `docs/IMPLEMENTATION_PLAN.md` |

## Rules

1. **Mobile-first** -- every feature must work on touch before mouse/keyboard
2. **ECS owns state** -- rendering reads from Koota, never owns game state
3. **Building-block creatures from Swedish folklore** -- Morker, Vittra, Lindormar, etc. Multi-part, procedurally animated
4. **Side-effect pattern** -- ECS systems never import Three.js; use callbacks
5. **Run `pnpm biome check --write .` and `pnpm tsc -b` before committing**
6. **Read the relevant docs/ files before making changes in that domain**
7. **Max ~200 LOC per file** -- decompose aggressively, extract utilities and sub-components
8. **Never use `Math.random()`** -- use `worldRng()` for game logic, `cosmeticRng()` for visuals (both in `src/world/noise.ts`)

## Testing

949 unit tests across 50 test files. 104 Playwright CT tests across 14 component test files.

Write tests first for:
- Pure utility functions (grid math, RNG, noise)
- ECS systems (mock world, verify state changes)
- Persistence layer (verify serialization roundtrips)
- Component rendering (Playwright CT for all `.tsx` components)

Test files live adjacent to source: `*.test.ts` for unit tests, `*.ct.tsx` for component tests.

```bash
# Run all unit tests
pnpm test

# Watch mode
pnpm test:watch

# Run component tests
pnpm test-ct

# Run a specific test file
pnpm test -- mining
```

## Performance Budgets

| Metric | Target |
|--------|--------|
| FPS (mobile) | >= 55 |
| FPS (desktop) | >= 60 |
| Initial bundle (gz) | < 500 KB |
| Time to interactive | < 3s |
| Memory (mobile) | < 100 MB |
| Draw calls | < 50 |

## Mobile-First Development Checklist

Before merging any UI change, verify:

- [ ] Renders correctly at 375px width (iPhone SE portrait)
- [ ] Touch targets >= 44px
- [ ] No overlap with bottom action bar or mobile controls
- [ ] No horizontal scroll on mobile
- [ ] Text readable without zooming (minimum 14px body)
- [ ] Dialogs don't extend beyond viewport
- [ ] Canvas has `touch-action: none`
- [ ] Animations respect `prefers-reduced-motion`
- [ ] FPS >= 55 on mid-range mobile
- [ ] Passive event listeners for all pointer handlers

## Agent Definitions (`.claude/agents/`)

| Agent | Role |
|-------|------|
| `ecs-architect` | ECS systems, Koota traits, game loop, system execution order |
| `scene-engineer` | Jolly Pixel behaviors, Three.js rendering, creatures, animations |
| `ui-developer` | React UI, HUD, diegetic design, mobile-first, Playwright CT |
| `world-builder` | Terrain, biomes, blocks, noise, caves, landmarks, trees |
| `doc-keeper` | Documentation, memory-bank, AGENTS.md, docs/ maintenance |
