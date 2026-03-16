---
title: Tech Context
domain: memory-bank
status: current
last-verified: 2026-03-16
summary: "Tech stack, versions, build tools, known pitfalls, Node 24 requirement"
---

# Tech Context -- Bok

## Core Stack

| Technology | Version | Role |
|-----------|---------|------|
| Koota | 0.6.5 | ECS framework -- trait-based, `world.query().updateEach()` |
| Jolly Pixel Engine | 2.5+ | Actor/Behavior model, scene management |
| Jolly Pixel Voxel Renderer | 1.4+ | Voxel engine integration |
| React | 19.2 | UI framework (overlays only, not game state) |
| Three.js | 0.182 | 3D engine (used only inside Behaviors) |
| Capacitor SQLite | 8.x | Native mobile persistence |
| sql.js | 1.14 | WASM SQLite for web persistence |
| Rapier 3D | 0.14 | Physics (via `@dimforge/rapier3d-compat`) |
| Tailwind CSS | 4.x | Utility-first CSS |
| DaisyUI | 5.x | Tailwind component library |

## Build & Dev Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **Vite** | 8.0.0 | Bundler + dev server (uses Rolldown -- bleeding edge) |
| **pnpm** | 9.5 | Package manager (NOT npm or yarn) |
| **Biome** | 2.4.7 | Linter + formatter (tabs, double quotes, semicolons, 120 char width) |
| **TypeScript** | 5.9.3 | Type checking via `pnpm tsc -b` |
| **Vitest** | 4.1+ | Unit test runner |
| **Playwright** | 1.58.2 | CT + E2E test runner |
| **@vitejs/plugin-react** | 6.0 | React fast-refresh for Vite |
| **Node.js** | 24 | Runtime (pinned in `.node-version`) |

## Commands

```bash
pnpm dev              # Vite dev server
pnpm build            # tsc -b && vite build
pnpm test             # Vitest unit tests (run)
pnpm test:watch       # Vitest watch mode
pnpm test-ct          # Playwright component tests
pnpm lint             # Biome check (lint only)
pnpm lint:fix         # Biome check --write (auto-fix)
pnpm typecheck        # tsc -b --dry
```

## Node.js Version Requirement

**Node 24 is required.** `.node-version` is pinned to `24`. Node 18 causes:
- Vitest failures (missing APIs)
- Build failures
- Incorrect module resolution

Verify with: `node --version` (must show v24.x)

## Koota ECS Patterns

```typescript
// Trait definition
const Health = trait({ current: 100, max: 100 });

// System reads/writes
world.query(Health, Position).updateEach(([health, pos], entity) => {
  health.current -= damage;
});

// Spawning
world.spawn(Health, Position({ x: 0, y: 0, z: 0 }));
```

- Traits are defined in `src/ecs/traits/index.ts` (single file)
- Systems are one-per-file in `src/ecs/systems/`
- System execution order is managed in `GameBridge.update()` in `src/engine/game.ts`

## Jolly Pixel Patterns

```typescript
// Actor = entity in scene graph
const actor = scene.createActor("enemy");

// Behavior = component attached to actor
actor.addBehavior(CreatureRendererBehavior, { species: "morker" });

// Behaviors own Three.js objects
class CreatureRendererBehavior extends Behavior {
  onStart() { this.mesh = new THREE.Group(); }
  onUpdate(dt) { /* animate mesh */ }
}
```

Actors and Behaviors live in `src/engine/behaviors/`. They are the ONLY place Three.js objects are created.

## Known Technical Pitfalls

### Critical

1. **Playwright CT completely broken** -- `@playwright/experimental-ct-react` 1.58.2 is incompatible with Vite 8 + Rolldown. All 96 CT tests timeout on `mount()`. No workaround found yet. Vitest unit tests are the only working test infrastructure.

2. **Node 18 breaks everything** -- The system `node` may be v18. Always verify `.node-version` is respected by your version manager (fnm, nvm, volta).

### Important

3. **Vite 8 + Rolldown is bleeding edge** -- Some ecosystem tools have not caught up. Expect compatibility issues with plugins that assume esbuild/SWC internals.

4. **packChunk/unpackChunk overflow** -- Was using signed `>>` shift for 16-bit values. Fixed with `>>> 0` unsigned shift. If touching chunk coordinate packing, verify with negative coordinate tests.

5. **Exploration system stale state** -- Module-level `let` variables in `exploration.ts` persisted between Vitest tests. Fixed by adding `resetExploration()` helper. Same pattern may apply to other module-level singletons (e.g., `getRuneIndex()`).

6. **Biome CSS false positives** -- Biome flags Tailwind v4 `@theme` and `@utility` directives as errors. These are suppressed/ignored. Do not try to "fix" them.

7. **Koota trait object mutations** -- Koota uses proxy objects. Nested object/array mutations inside `updateEach` work through the proxy, but replacing the entire object does not trigger change detection. Always mutate in place.

## CI/CD

- **CI** (`ci.yml`): Runs on PRs to main -- typecheck, lint, build, component tests
- **CD** (`cd.yml`): Runs on push to main -- typecheck, lint, build + deploy to GitHub Pages
- **Dependabot**: Weekly pnpm + GitHub Actions updates
- **Automerge**: Minor/patch dependabot PRs auto-squash-merge

## File Size Debt

Several files exceed the 200 LOC limit:

| File | LOC | Notes |
|------|-----|-------|
| `src/engine/game.ts` | 906 | GameBridge monolith -- needs decomposition |
| `src/App.tsx` | 600 | Root orchestrator -- needs decomposition |
| `src/world/tileset-tiles.ts` | 501 | Texture drawing functions -- could split by biome |

Plus ~27 other files in the 200-400 LOC range.
