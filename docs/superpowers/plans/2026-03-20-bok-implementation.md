# Bok: The Builder's Tome — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable roguelike island-hopper voxel game with 1+ hour of content using JollyPixel engine, Koota ECS, Yuka AI, Capacitor cross-platform, and SQLite persistence.

**Architecture:** Domain-layered monolith with three integration layers — Koota owns all game state (traits/relations), Yuka owns AI decisions (steering/FSM/goals), JollyPixel owns rendering (voxels/scene graph/game loop). Domains communicate only through barrel-exported public APIs. Content is data-driven via JSON configs validated by Zod schemas.

**Tech Stack:** @jolly-pixel/engine + runtime + voxel.renderer, koota, yuka, @dimforge/rapier3d, three.js, Vite, TypeScript (strict ESM), @capacitor/core + @capacitor-community/sqlite, vitest + @vitest/browser, Zod, ESLint

**Spec:** `docs/superpowers/specs/2026-03-20-bok-game-design.md`

**Reference codebases:**
- JollyPixel: `/Users/jbogaty/src/reference-codebases/editor`
- Koota: `/Users/jbogaty/src/reference-codebases/koota`
- Yuka: `/Users/jbogaty/src/reference-codebases/yuka`

---

## Dependency Graph & Parallelism

```
Phase 0: Foundation (sequential)
  Task 1: Scaffold project
  Task 2: Root documentation + enforcement
  ↓
Phase 1: Core Layers (parallel group A)
  Task 3: Koota traits + relations + shared types  ← independent
  Task 4: Input system                              ← independent
  Task 6: Persistence (SQLite)                      ← independent
  Task 7: Content types + registry + first biome    ← independent
  Task 5: JollyPixel Runtime + VoxelRenderer        ← DEPENDS ON Task 3 + 4
  ↓
Phase 2: Game Systems (parallel group B — depend on Phase 1)
  Task 8: AI layer (Yuka bridge)
  Task 9: Combat system
  Task 10: Procedural generation
  Task 11: Progression system
  Task 12: Scene management (SceneDirector)
  Task 12a: Movement + Physics system (Rapier3D)
  Task 12b: Spawning + Inventory systems
  ↓
Phase 3: Vertical Slice (sequential — wires everything together)
  Task 13: Forest island end-to-end playable
  ↓
Phase 4: Content + Polish (parallel group C — all independent)
  Task 14: Remaining 7 biome JSONs
  Task 15: All 16 enemy configs
  Task 16: All 8 boss configs
  Task 17: All 15+ weapon configs
  Task 17a: Hub + item content (buildings, NPCs, loot tables, recipes)
  Task 18: UI/HUD
  Task 19: Audio system
  Task 20: Rendering effects (particles, weather, day/night)
  Task 21: Hub Island scene
  Task 22: Sailing + Island Select scenes
  Task 23: Main menu + death/victory screens
  Task 24: Integration tests + final polish
```

---

## Phase 0: Foundation

### Task 1: Scaffold Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/main.css`
- Create: `capacitor.config.ts`
- Create: `eslint.config.js`
- Modify: `.gitignore`

- [ ] **Step 1: Initialize package.json with all dependencies**

```json
{
  "name": "bok",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:browser": "vitest --project browser",
    "test:unit": "vitest --project unit",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@capacitor-community/sqlite": "^6.0.0",
    "@capacitor/core": "^7.0.0",
    "@dimforge/rapier3d": "^0.14.0",
    "@jolly-pixel/engine": "^2.5.0",
    "@jolly-pixel/runtime": "^3.3.0",
    "@jolly-pixel/voxel.renderer": "^1.4.0",
    "koota": "^0.2.0",
    "three": "^0.183.0",
    "yuka": "^0.7.8",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/three": "^0.183.0",
    "@vitest/browser": "^3.0.0",
    "@vitest/coverage-v8": "^3.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "eslint-plugin-import-x": "^4.0.0",
    "typescript-eslint": "^8.0.0",
    "playwright": "^1.50.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vite-plugin-checker": "^0.9.0",
    "vite-plugin-glsl": "^1.3.0",
    "vite-plugin-wasm": "^3.4.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "jsx": "react-jsx",
    "paths": {
      "@bok/*": ["./src/*"]
    },
    "types": ["vite/client"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import glsl from 'vite-plugin-glsl';
import wasm from 'vite-plugin-wasm';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    checker({ typescript: true }),
    glsl(),
    wasm(),
  ],
  resolve: {
    alias: {
      '@bok': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2022',
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d'],
  },
});
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@bok': resolve(__dirname, 'src'),
    },
  },
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.browser.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.ts'],
          browser: {
            enabled: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
```

- [ ] **Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Bok: The Builder's Tome</title>
  <link rel="stylesheet" href="/src/main.css">
</head>
<body>
  <canvas id="game-canvas" tabindex="-1"></canvas>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 6: Create src/main.css**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; background: #0a0a0a; }
#game-canvas {
  width: 100%;
  height: 100%;
  display: block;
  outline: none;
  touch-action: none;
}
@font-face {
  font-family: 'Cormorant Garamond';
  src: url('/src/assets/fonts/CormorantGaramond-Regular.ttf') format('truetype');
  font-weight: 400;
}
```

- [ ] **Step 7: Create src/main.ts (minimal bootstrap)**

```typescript
import { Runtime, loadRuntime } from '@jolly-pixel/runtime';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvas) throw new Error('Canvas element not found');

const runtime = new Runtime(canvas, {
  includePerformanceStats: import.meta.env.DEV,
});

loadRuntime(runtime)
  .then(() => {
    console.log('[Bok] Runtime loaded');
  })
  .catch((error) => {
    console.error('[Bok] Failed to load runtime:', error);
  });
```

- [ ] **Step 8: Create capacitor.config.ts**

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bok.builderstome',
  appName: 'Bok',
  webDir: 'dist',
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      androidIsEncryption: false,
    },
  },
};

export default config;
```

- [ ] **Step 9: Create eslint.config.js (flat config for ESLint 9.x)**

```javascript
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    plugins: { 'import-x': importX },
    rules: {
      'import-x/no-internal-modules': ['error', {
        forbid: [
          'src/systems/*/*',
          'src/ai/*/*',
          'src/generation/*/*',
          'src/content/*/*',
          'src/ui/*/*',
          'src/scenes/*/*',
          'src/rendering/*/*',
          'src/persistence/*/*',
          'src/input/*/*',
          'src/traits/*/*',
          'src/relations/*/*',
          'src/shared/*/*',
          'src/behaviors/*/*',
        ],
      }],
    },
  },
  { ignores: ['dist/', 'node_modules/', '*.config.*'] },
);
```

- [ ] **Step 10: Update .gitignore**

Append to existing `.gitignore`:
```
node_modules/
dist/
.capacitor/
android/
ios/
*.local
.env
coverage/
.superpowers/
```

- [ ] **Step 11: Install dependencies and verify build**

Run: `npm install`
Expected: Clean install, no peer dependency errors

Run: `npx tsc --noEmit`
Expected: No errors (src/main.ts compiles)

Run: `npx vite build`
Expected: Build succeeds, output in dist/

- [ ] **Step 12: Commit scaffold**

```bash
git add -A
git commit -m "feat: scaffold Vite + TypeScript + Capacitor project with all dependencies"
```

---

### Task 2: Root Documentation + Enforcement Layer

**Files:**
- Create: `CLAUDE.md`
- Create: `AGENTS.md`
- Create: `ARCHITECTURE.md`
- Create: `DESIGN.md`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Modify: `README.md`
- Create: `.github/copilot-instructions.md`
- Create: `.claude/agents/content-author.md`
- Create: `.claude/agents/domain-reviewer.md`
- Create: `.claude/agents/test-enforcer.md`
- Create: `.claude/settings.local.json`

- [ ] **Step 1: Create CLAUDE.md**

```markdown
# CLAUDE.md — Bok: The Builder's Tome

## Project Overview
Voxel roguelike island-hopper built on JollyPixel + Koota + Yuka.

## Quick Start
\`\`\`bash
npm install
npm run dev          # Vite dev server at localhost:5173
npm test             # Vitest (unit + browser tests)
npm run lint         # ESLint with barrel export enforcement
npm run typecheck    # TypeScript strict mode check
\`\`\`

## Architecture Invariants
1. **Barrel exports only.** Every domain (`src/<domain>/`) has an `index.ts`. Cross-domain imports MUST use the barrel. Never import from `src/systems/combat/DamageCalculator.ts` — import from `src/systems/combat/`.
2. **Koota owns state.** All game entity data lives in Koota traits. Yuka reads/writes via the AIBridge. JollyPixel Actors read via RenderSyncBehavior.
3. **Content is JSON.** Biomes, enemies, weapons, bosses, items are JSON files in `src/content/`. Validated by Zod schemas at build time and runtime.
4. **Pure generation functions.** Everything in `src/generation/` is deterministic — same seed, same output. No side effects.
5. **Tests required.** Every barrel-exported public API must have tests. Run `npm test` before committing.

## Domain Map
| Domain | Role | Barrel |
|--------|------|--------|
| `src/traits/` | Koota trait definitions | `src/traits/index.ts` |
| `src/relations/` | Koota relation definitions | `src/relations/index.ts` |
| `src/input/` | Platform input → Koota traits | `src/input/index.ts` |
| `src/systems/` | Game logic (Koota queries) | `src/systems/index.ts` |
| `src/ai/` | Yuka integration + bridge | `src/ai/index.ts` |
| `src/generation/` | Procedural island generation | `src/generation/index.ts` |
| `src/content/` | JSON content + Zod schemas | `src/content/index.ts` |
| `src/behaviors/` | JollyPixel ActorComponents | `src/behaviors/index.ts` |
| `src/ui/` | HUD, menus, Tome overlay | `src/ui/index.ts` |
| `src/scenes/` | Game state FSM | `src/scenes/index.ts` |
| `src/rendering/` | Visual effects | `src/rendering/index.ts` |
| `src/persistence/` | SQLite save/load | `src/persistence/index.ts` |
| `src/shared/` | Types, constants, EventBus | `src/shared/index.ts` |

## Module Contract
Every `index.ts` barrel must have this JSDoc header:
\`\`\`typescript
/**
 * @module <domain-name>
 * @role <singular responsibility>
 * @input <what it consumes>
 * @output <what it produces>
 * @depends <other domains imported>
 * @tested <test file>
 */
\`\`\`

## Testing
\`\`\`bash
npm test                          # All tests
npm run test:unit                 # Unit only (node)
npm run test:browser              # Browser only (playwright)
npx vitest src/generation/        # Single domain
\`\`\`

## Key Libraries
- **JollyPixel** — `/Users/jbogaty/src/reference-codebases/editor` (engine, runtime, voxel-renderer)
- **Koota** — `/Users/jbogaty/src/reference-codebases/koota` (ECS state)
- **Yuka** — `/Users/jbogaty/src/reference-codebases/yuka` (AI: steering, FSM, goals, perception)
```

- [ ] **Step 2: Create AGENTS.md**

```markdown
# AGENTS.md — Bok: The Builder's Tome

## For AI Agents Working on This Codebase

### Import Rules
- **ALWAYS** import from barrel exports: `import { X } from '@bok/systems/combat'`
- **NEVER** import from internal files: `import { X } from '@bok/systems/combat/DamageCalculator'`
- Cross-domain imports go through barrels. Within-domain imports use relative paths.

### Adding a New File
1. Create the file in the appropriate domain directory
2. Add a re-export to the domain's `index.ts` barrel
3. Write tests for the public API in `<domain>/<name>.test.ts`
4. Run `npm test` to verify

### Adding Content (Biome/Enemy/Weapon/Boss)
1. Copy an existing JSON from the same `src/content/<type>/` directory
2. Modify the fields per the Zod schema in `src/content/types.ts`
3. Register it in the content registry
4. Run `npm test` to validate the schema

### Domain Boundaries
Each domain has ONE role. Do not add cross-cutting concerns:
- Game state → `src/traits/` and `src/relations/`
- Game logic → `src/systems/`
- AI decisions → `src/ai/`
- World generation → `src/generation/`
- Content definitions → `src/content/`
- Rendering → `src/rendering/` and `src/behaviors/`
- UI → `src/ui/`
- Persistence → `src/persistence/`

### Custom Agent Roles
- **content-author** — Creates JSON content files from templates
- **domain-reviewer** — Reviews code for barrel export violations and SRP breaches
- **test-enforcer** — Ensures public APIs have test coverage
```

- [ ] **Step 3: Create ARCHITECTURE.md**

```markdown
# Architecture — Bok: The Builder's Tome

## Three-Layer Integration

### Layer 1: Koota (State)
All game entity data lives in Koota traits. Koota is the single source of truth.
- Traits: Position, Velocity, Health, AIState, WeaponStats, etc.
- Relations: ChildOf, Contains, FiredBy, Targeting
- World traits (singletons): Time, GamePhase, IslandState

### Layer 2: Yuka (AI)
Yuka owns all AI decisions for enemies and bosses.
- Steering behaviors drive enemy movement
- StateMachine drives enemy behavior states
- CompositeGoal trees drive boss phase logic
- Perception (Vision + Memory) drives awareness
- AIBridge syncs Yuka ↔ Koota bidirectionally

### Layer 3: JollyPixel (Render)
JollyPixel owns the game loop, voxel rendering, and scene graph.
- Runtime drives the frame loop
- VoxelRenderer renders chunked terrain with Rapier colliders
- Actors exist for visual entities (player model, enemy meshes)
- RenderSyncBehavior reads Koota traits → updates Actor transforms

## Frame Loop
1. Update Time (Koota world trait)
2. Poll Input → write PlayerIntent traits
3. Yuka AI update → write Velocity/AIState/Intent traits
4. Koota game systems → process movement, combat, progression, spawning
5. Rapier physics step → collision resolution, corrected positions
6. JollyPixel render sync → Koota traits → Actor transforms
7. Render frame

## Data Flow
Content JSON → ContentRegistry (Zod validated) → Generation (pure functions) → Koota entities → Systems process → Yuka AI decides → Render displays

## Persistence
@capacitor-community/sqlite with jeep-sqlite for web. SQLite tables for permanent progression, run history, settings, and mid-run save state.
```

- [ ] **Step 4: Create DESIGN.md, CONTRIBUTING.md, SECURITY.md**

`DESIGN.md`:
```markdown
# Game Design — Bok: The Builder's Tome

See full specification: [docs/superpowers/specs/2026-03-20-bok-game-design.md](docs/superpowers/specs/2026-03-20-bok-game-design.md)

## Summary
Roguelike island-hopping voxel adventure. Sail to procedural islands, fight enemies, defeat bosses, unlock Tome pages (permanent abilities), build up your Hub Island between runs.

## Core Loop
Hub → Sail → Explore Island → Boss Fight → Return or Push On → Hub
```

`CONTRIBUTING.md`:
```markdown
# Contributing to Bok

## Setup
\`\`\`bash
git clone <repo> && cd bok
npm install
npm run dev
\`\`\`

## Adding Content
All game content is data-driven JSON. See `src/content/` for examples and `src/content/types.ts` for schemas.

## Code Standards
- TypeScript strict mode
- Barrel exports only — never import internal files across domains
- Tests required for all public APIs
- TDD: write failing test → implement → verify → commit

## Domain Architecture
See [ARCHITECTURE.md](ARCHITECTURE.md) for the three-layer integration model.
```

`SECURITY.md`:
```markdown
# Security — Bok

## Input Validation
- All content JSON validated by Zod schemas at load time
- User input (seeds, settings) sanitized before SQLite queries
- SQLite uses parameterized queries — no string interpolation

## Capacitor Permissions
- Storage: read/write for save files
- No network permissions required (single-player)
- No camera/microphone/location access

## Dependencies
- All dependencies are MIT/Apache-2.0 licensed
- npm audit run as part of CI
```

- [ ] **Step 5: Update README.md**

```markdown
# Bok: The Builder's Tome

A roguelike island-hopping voxel adventure built with JollyPixel, Koota, and Yuka.

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

Open http://localhost:5173 in your browser.

## Documentation

- [DESIGN.md](DESIGN.md) — Game design overview
- [ARCHITECTURE.md](ARCHITECTURE.md) — Technical architecture
- [CONTRIBUTING.md](CONTRIBUTING.md) — How to contribute
- [AGENTS.md](AGENTS.md) — For AI agents working on this codebase
- [SECURITY.md](SECURITY.md) — Security considerations

## Tech Stack

- **Engine:** JollyPixel (ECS + voxel renderer)
- **State:** Koota (data-oriented ECS)
- **AI:** Yuka (steering, FSM, pathfinding)
- **Physics:** Rapier3D
- **Platform:** Capacitor (web, iOS, Android)
- **Build:** Vite + TypeScript
- **Test:** Vitest + Playwright

## License

MIT
```

- [ ] **Step 6: Create .github/copilot-instructions.md**

```markdown
# Copilot Instructions

See [AGENTS.md](../AGENTS.md) for all coding standards, domain boundaries, and import rules.
```

- [ ] **Step 7: Create custom agents**

`.claude/agents/content-author.md`:
```markdown
---
name: content-author
description: Creates game content JSON files from templates with Zod schema validation
---

You create biome, enemy, weapon, and boss JSON content files.

## Rules
1. Copy the closest existing JSON as a template
2. Follow the Zod schema in `src/content/types.ts` exactly
3. Register new content in the appropriate registry
4. Run `npm test` to validate

## Content locations
- Biomes: `src/content/biomes/<name>.json`
- Enemies: `src/content/enemies/<name>.json`
- Weapons: `src/content/weapons/<name>.json`
- Bosses: `src/content/bosses/<name>.json`
- Items: `src/content/items/`
```

`.claude/agents/domain-reviewer.md`:
```markdown
---
name: domain-reviewer
description: Reviews code for barrel export violations and single-responsibility breaches
---

You review code changes for architectural compliance.

## Check for
1. **Barrel violations**: Any import that reaches into another domain's internals (e.g., `from '../systems/combat/DamageCalculator'` instead of `from '../systems/combat'`)
2. **SRP breaches**: Files doing more than one thing, domains with mixed responsibilities
3. **Missing barrel re-exports**: New files that aren't re-exported from their domain's index.ts
4. **Missing tests**: Public API without corresponding test file
5. **Module contract**: Every index.ts must have the JSDoc header with @module, @role, @input, @output, @depends, @tested
```

`.claude/agents/test-enforcer.md`:
```markdown
---
name: test-enforcer
description: Ensures public API has test coverage before code is considered complete
---

You verify that all barrel-exported symbols have tests.

## Process
1. Read the domain's `index.ts` to find all exports
2. Check for corresponding test files (`<name>.test.ts`)
3. Verify tests cover the public API (not internal implementation)
4. Report any gaps
```

- [ ] **Step 8: Create Claude hooks in settings**

`.claude/settings.local.json`:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node -e \"const content = process.env.TOOL_INPUT; if (content && content.match(/from\\s+['\\\"]\\.\\.\\/(systems|ai|generation|content|ui|scenes|rendering|persistence|input|traits|relations|shared|behaviors)\\/[^'\\\"]+\\/[^'\\\"]+/)) { console.error('BLOCKED: Import bypasses barrel export. Use the domain index.ts barrel instead.'); process.exit(1); }\""
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 9: Commit documentation + enforcement**

```bash
git add CLAUDE.md AGENTS.md ARCHITECTURE.md DESIGN.md CONTRIBUTING.md SECURITY.md README.md .github/ .claude/
git commit -m "docs: add root documentation, agent configs, and enforcement hooks"
```

---

## Phase 1: Core Layers (Parallel Group A)

> Tasks 3-7 can all run in parallel. No dependencies between them.

### Task 3: Koota Traits + Relations + Shared Types

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/constants.ts`
- Create: `src/shared/EventBus.ts`
- Create: `src/shared/index.ts`
- Create: `src/traits/core.ts`
- Create: `src/traits/combat.ts`
- Create: `src/traits/ai.ts`
- Create: `src/traits/player.ts`
- Create: `src/traits/world.ts`
- Create: `src/traits/index.ts`
- Create: `src/traits/core.test.ts`
- Create: `src/relations/index.ts`
- Create: `src/relations/relations.test.ts`

- [ ] **Step 1: Write failing test for core traits**

`src/traits/core.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createWorld } from 'koota';
import { Position, Velocity, Health, Transform } from './index';

describe('Core traits', () => {
  it('spawns entity with Position and Velocity', () => {
    const world = createWorld();
    const entity = world.spawn(Position({ x: 5, y: 0, z: 10 }), Velocity());
    expect(entity.get(Position)).toEqual({ x: 5, y: 0, z: 10 });
    expect(entity.get(Velocity)).toEqual({ x: 0, y: 0, z: 0 });
    world.destroy();
  });

  it('spawns entity with Health', () => {
    const world = createWorld();
    const entity = world.spawn(Health({ current: 100, max: 100 }));
    expect(entity.get(Health)).toEqual({ current: 100, max: 100 });
    entity.set(Health, { current: 50, max: 100 });
    expect(entity.get(Health)!.current).toBe(50);
    world.destroy();
  });

  it('queries entities by trait', () => {
    const world = createWorld();
    world.spawn(Position({ x: 0, y: 0, z: 0 }), Velocity());
    world.spawn(Position({ x: 1, y: 0, z: 0 }));
    const moving = world.query(Position, Velocity);
    expect(moving.length).toBe(1);
    world.destroy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/traits/core.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement core traits**

`src/traits/core.ts`:
```typescript
import { trait } from 'koota';

/** 3D world position. */
export const Position = trait({ x: 0, y: 0, z: 0 });

/** Linear velocity vector. */
export const Velocity = trait({ x: 0, y: 0, z: 0 });

/** Angular velocity for rotation. */
export const AngularVelocity = trait({ x: 0, y: 0, z: 0 });

/** Rotation as euler angles (radians). */
export const Rotation = trait({ x: 0, y: 0, z: 0 });

/** Scale factor. */
export const Scale = trait({ x: 1, y: 1, z: 1 });

/** Shorthand transform grouping (for render sync). */
export const Transform = trait({ posX: 0, posY: 0, posZ: 0, rotY: 0 });

/** Health with current and max values. */
export const Health = trait({ current: 100, max: 100 });

/** Stamina for dodge/sprint. */
export const Stamina = trait({ current: 100, max: 100, regenRate: 20 });
```

`src/traits/combat.ts`:
```typescript
import { trait } from 'koota';

/** Active attack request from player or enemy. */
export const AttackIntent = trait({ active: false, comboStep: 0, timestamp: 0 });

/** Dodge roll state. */
export const DodgeState = trait({ active: false, iFrames: false, cooldownRemaining: 0 });

/** Parry/block state. */
export const ParryState = trait({ blocking: false, parryWindow: false, parryTimestamp: 0 });

/** Entity can be hit by attacks. */
export const Hittable = trait();

/** Weapon stats on equipped weapon. */
export const WeaponStats = trait({
  baseDamage: 10,
  attackSpeed: 1.0,
  range: 1.5,
  comboMultipliers: '1.0,1.2,1.5', // stringified array for SoA
  weaponId: '',
});

/** Armor stats. */
export const ArmorStats = trait({ reduction: 0, armorId: '' });

/** Damage-over-time effect. */
export const DamageOverTime = trait({ damagePerTick: 0, tickInterval: 1, remainingDuration: 0 });

/** Invincibility frames (post-dodge, post-hit). */
export const Invincible = trait({ remainingTime: 0 });

/** Knockback force applied this frame. */
export const Knockback = trait({ x: 0, y: 0, z: 0 });
```

`src/traits/ai.ts`:
```typescript
import { trait } from 'koota';

/** Current AI behavioral state name. */
export const AIState = trait({ state: 'idle' });

/** Reference to Yuka Vehicle/GameEntity. Callback-based (AoS) since it holds an object. */
export const YukaRef = trait(() => ({ vehicle: null as unknown }));

/** Reference to JollyPixel Actor for render sync. Callback-based (AoS). */
export const ActorRef = trait(() => ({ actor: null as unknown }));

/** AI perception memory — last known player position. */
export const AIMemory = trait({ lastSeenX: 0, lastSeenY: 0, lastSeenZ: 0, lastSeenTime: 0 });

/** Goal intent output from Yuka goal system. */
export const Intent = trait({ goal: '' });

/** Enemy configuration ID (references content JSON). */
export const EnemyType = trait({ configId: '' });

/** Boss configuration ID. */
export const BossType = trait({ configId: '', phase: 1 });
```

`src/traits/player.ts`:
```typescript
import { trait } from 'koota';

/** Tag: this entity is the player. */
export const IsPlayer = trait();

/** Tome page abilities unlocked by the player. */
export const TomePages = trait(() => ({ unlockedPages: [] as string[] }));

/** Current run gear (lost on death). */
export const RunGear = trait(() => ({
  weapons: [] as string[],
  armor: '',
  consumables: [] as string[],
}));

/** Resources collected this run. */
export const RunResources = trait(() => ({ items: {} as Record<string, number> }));

/** Player movement intent from input system. */
export const MovementIntent = trait({ dirX: 0, dirZ: 0, sprint: false, jump: false });

/** Camera look intent from input system. */
export const LookIntent = trait({ deltaX: 0, deltaY: 0 });
```

`src/traits/world.ts`:
```typescript
import { trait } from 'koota';

/** Frame timing (world singleton). */
export const Time = trait({ delta: 0, elapsed: 0 });

/** Current game phase (world singleton). */
export const GamePhase = trait({ phase: 'menu' as string });

/** Current island state (world singleton). */
export const IslandState = trait({
  biome: '',
  seed: '',
  difficulty: 1,
  bossDefeated: false,
  enemiesRemaining: 0,
});
```

`src/traits/index.ts`:
```typescript
/**
 * @module traits
 * @role Koota trait definitions for all game entities
 * @input None (definitions only)
 * @output Trait constructors for spawning entities
 * @depends koota
 * @tested core.test.ts
 */
export {
  Position, Velocity, AngularVelocity, Rotation, Scale, Transform,
  Health, Stamina,
} from './core.ts';
export {
  AttackIntent, DodgeState, ParryState, Hittable, WeaponStats, ArmorStats,
  DamageOverTime, Invincible, Knockback,
} from './combat.ts';
export {
  AIState, YukaRef, ActorRef, AIMemory, Intent, EnemyType, BossType,
} from './ai.ts';
export {
  IsPlayer, TomePages, RunGear, RunResources, MovementIntent, LookIntent,
} from './player.ts';
export {
  Time, GamePhase, IslandState,
} from './world.ts';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/traits/core.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Implement relations**

`src/relations/index.ts`:
```typescript
/**
 * @module relations
 * @role Koota relation definitions for entity-to-entity connections
 * @input None (definitions only)
 * @output Relation constructors
 * @depends koota
 * @tested relations.test.ts
 */
import { relation } from 'koota';

/** Parent-child hierarchy. Destroying parent destroys children. */
export const ChildOf = relation({ autoDestroy: 'orphan' });

/** Inventory containment. Entity holds items. */
export const Contains = relation({ store: { amount: 1 } });

/** Projectile fired by entity. Destroying source cleans up projectile. */
export const FiredBy = relation({ autoDestroy: 'orphan' });

/** AI targeting relation. Exclusive: can only target one entity. */
export const Targeting = relation({ exclusive: true });

/** Equipped weapon/armor relation. */
export const EquippedBy = relation({ exclusive: true });
```

`src/relations/relations.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createWorld } from 'koota';
import { ChildOf, Targeting, Contains } from './index';
import { Position, Health, IsPlayer } from '../traits/index';

describe('Relations', () => {
  it('creates parent-child relationship', () => {
    const world = createWorld();
    const parent = world.spawn(Position());
    const child = world.spawn(Position(), ChildOf(parent));
    expect(child.targetFor(ChildOf)).toBe(parent);
    world.destroy();
  });

  it('exclusive targeting replaces previous target', () => {
    const world = createWorld();
    const hunter = world.spawn(Position());
    const prey1 = world.spawn(Position());
    const prey2 = world.spawn(Position());
    hunter.add(Targeting(prey1));
    hunter.add(Targeting(prey2));
    expect(hunter.targetFor(Targeting)).toBe(prey2);
    world.destroy();
  });

  it('Contains relation stores amount', () => {
    const world = createWorld();
    const inventory = world.spawn();
    const item = world.spawn();
    inventory.add(Contains(item, { amount: 5 }));
    expect(inventory.get(Contains(item))!.amount).toBe(5);
    world.destroy();
  });
});
```

- [ ] **Step 6: Run all trait + relation tests**

Run: `npx vitest run src/traits/ src/relations/`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/traits/ src/relations/
git commit -m "feat: add Koota trait and relation definitions with tests"
```

---

### Task 4: Input System

**Files:**
- Create: `src/input/ActionMap.ts`
- Create: `src/input/KeyboardMouseDevice.ts`
- Create: `src/input/GamepadDevice.ts`
- Create: `src/input/TouchDevice.ts`
- Create: `src/input/InputSystem.ts`
- Create: `src/input/index.ts`
- Create: `src/input/ActionMap.test.ts`

- [ ] **Step 1: Write failing test for ActionMap**

`src/input/ActionMap.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { ActionMap, type GameAction } from './index';

describe('ActionMap', () => {
  it('maps keyboard key to action', () => {
    const map = new ActionMap();
    map.bindKey('KeyW', 'moveForward');
    expect(map.getAction('KeyW')).toBe('moveForward');
  });

  it('reports active actions from pressed keys', () => {
    const map = new ActionMap();
    map.bindKey('KeyW', 'moveForward');
    map.bindKey('ShiftLeft', 'sprint');
    map.setKeyDown('KeyW');
    map.setKeyDown('ShiftLeft');
    expect(map.isActive('moveForward')).toBe(true);
    expect(map.isActive('sprint')).toBe(true);
    expect(map.isActive('dodge')).toBe(false);
  });

  it('clears key state on key up', () => {
    const map = new ActionMap();
    map.bindKey('KeyW', 'moveForward');
    map.setKeyDown('KeyW');
    expect(map.isActive('moveForward')).toBe(true);
    map.setKeyUp('KeyW');
    expect(map.isActive('moveForward')).toBe(false);
  });

  it('provides default desktop bindings', () => {
    const map = ActionMap.desktopDefaults();
    expect(map.getAction('KeyW')).toBe('moveForward');
    expect(map.getAction('Space')).toBe('dodge');
    expect(map.getAction('KeyE')).toBe('interact');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/input/ActionMap.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement ActionMap**

`src/input/ActionMap.ts`:
```typescript
export type GameAction =
  | 'moveForward' | 'moveBack' | 'moveLeft' | 'moveRight'
  | 'attack' | 'dodge' | 'parry' | 'interact' | 'tome' | 'pause'
  | 'hotbar1' | 'hotbar2' | 'hotbar3' | 'hotbar4' | 'hotbar5'
  | 'jump' | 'sprint';

export class ActionMap {
  readonly #keyToAction = new Map<string, GameAction>();
  readonly #activeKeys = new Set<string>();

  bindKey(keyCode: string, action: GameAction): void {
    this.#keyToAction.set(keyCode, action);
  }

  getAction(keyCode: string): GameAction | undefined {
    return this.#keyToAction.get(keyCode);
  }

  setKeyDown(keyCode: string): void {
    this.#activeKeys.add(keyCode);
  }

  setKeyUp(keyCode: string): void {
    this.#activeKeys.delete(keyCode);
  }

  isActive(action: GameAction): boolean {
    for (const key of this.#activeKeys) {
      if (this.#keyToAction.get(key) === action) return true;
    }
    return false;
  }

  reset(): void {
    this.#activeKeys.clear();
  }

  static desktopDefaults(): ActionMap {
    const map = new ActionMap();
    map.bindKey('KeyW', 'moveForward');
    map.bindKey('KeyS', 'moveBack');
    map.bindKey('KeyA', 'moveLeft');
    map.bindKey('KeyD', 'moveRight');
    map.bindKey('Space', 'dodge');
    map.bindKey('ShiftLeft', 'sprint');
    map.bindKey('KeyE', 'interact');
    map.bindKey('Tab', 'tome');
    map.bindKey('Escape', 'pause');
    map.bindKey('Digit1', 'hotbar1');
    map.bindKey('Digit2', 'hotbar2');
    map.bindKey('Digit3', 'hotbar3');
    map.bindKey('Digit4', 'hotbar4');
    map.bindKey('Digit5', 'hotbar5');
    return map;
  }
}
```

- [ ] **Step 4: Implement InputSystem, KeyboardMouseDevice, barrel**

`src/input/KeyboardMouseDevice.ts`:
```typescript
import { ActionMap } from './ActionMap.ts';

export class KeyboardMouseDevice {
  readonly #actionMap: ActionMap;
  #mouseDeltaX = 0;
  #mouseDeltaY = 0;
  #mouseLeftDown = false;
  #mouseRightDown = false;
  #attached = false;

  constructor(actionMap: ActionMap) {
    this.#actionMap = actionMap;
  }

  attach(canvas: HTMLCanvasElement): void {
    if (this.#attached) return;
    this.#attached = true;

    document.addEventListener('keydown', (e) => {
      this.#actionMap.setKeyDown(e.code);
    });
    document.addEventListener('keyup', (e) => {
      this.#actionMap.setKeyUp(e.code);
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.#mouseLeftDown = true;
      if (e.button === 2) this.#mouseRightDown = true;
    });
    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.#mouseLeftDown = false;
      if (e.button === 2) this.#mouseRightDown = false;
    });
    canvas.addEventListener('mousemove', (e) => {
      this.#mouseDeltaX += e.movementX;
      this.#mouseDeltaY += e.movementY;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  get attackDown(): boolean { return this.#mouseLeftDown; }
  get parryDown(): boolean { return this.#mouseRightDown; }
  get mouseDeltaX(): number { return this.#mouseDeltaX; }
  get mouseDeltaY(): number { return this.#mouseDeltaY; }

  consumeMouseDelta(): { x: number; y: number } {
    const result = { x: this.#mouseDeltaX, y: this.#mouseDeltaY };
    this.#mouseDeltaX = 0;
    this.#mouseDeltaY = 0;
    return result;
  }
}
```

`src/input/GamepadDevice.ts`:
```typescript
export class GamepadDevice {
  #leftStickX = 0;
  #leftStickY = 0;
  #rightStickX = 0;
  #rightStickY = 0;
  readonly #deadzone = 0.15;

  poll(): void {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0];
    if (!gp) return;

    this.#leftStickX = this.#applyDeadzone(gp.axes[0] ?? 0);
    this.#leftStickY = this.#applyDeadzone(gp.axes[1] ?? 0);
    this.#rightStickX = this.#applyDeadzone(gp.axes[2] ?? 0);
    this.#rightStickY = this.#applyDeadzone(gp.axes[3] ?? 0);
  }

  get leftStick(): { x: number; y: number } {
    return { x: this.#leftStickX, y: this.#leftStickY };
  }

  get rightStick(): { x: number; y: number } {
    return { x: this.#rightStickX, y: this.#rightStickY };
  }

  #applyDeadzone(value: number): number {
    return Math.abs(value) < this.#deadzone ? 0 : value;
  }
}
```

`src/input/TouchDevice.ts`:
```typescript
export class TouchDevice {
  #moveX = 0;
  #moveY = 0;
  #lookDeltaX = 0;
  #lookDeltaY = 0;
  #lastTouchX = 0;
  #lastTouchY = 0;
  #attached = false;

  attach(canvas: HTMLCanvasElement): void {
    if (this.#attached) return;
    this.#attached = true;
    const halfWidth = canvas.clientWidth / 2;

    canvas.addEventListener('touchstart', (e) => {
      for (const touch of e.changedTouches) {
        if (touch.clientX > halfWidth) {
          this.#lastTouchX = touch.clientX;
          this.#lastTouchY = touch.clientY;
        }
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.clientX < halfWidth) {
          // Left side = movement joystick
          const centerX = halfWidth / 2;
          const centerY = canvas.clientHeight / 2;
          this.#moveX = (touch.clientX - centerX) / (halfWidth / 2);
          this.#moveY = (touch.clientY - centerY) / (canvas.clientHeight / 2);
        } else {
          // Right side = camera look
          this.#lookDeltaX += touch.clientX - this.#lastTouchX;
          this.#lookDeltaY += touch.clientY - this.#lastTouchY;
          this.#lastTouchX = touch.clientX;
          this.#lastTouchY = touch.clientY;
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
      this.#moveX = 0;
      this.#moveY = 0;
    });
  }

  get moveStick(): { x: number; y: number } {
    return { x: this.#moveX, y: this.#moveY };
  }

  consumeLookDelta(): { x: number; y: number } {
    const result = { x: this.#lookDeltaX, y: this.#lookDeltaY };
    this.#lookDeltaX = 0;
    this.#lookDeltaY = 0;
    return result;
  }
}
```

`src/input/InputSystem.ts`:
```typescript
import type { World } from 'koota';
import { ActionMap } from './ActionMap.ts';
import { KeyboardMouseDevice } from './KeyboardMouseDevice.ts';
import { GamepadDevice } from './GamepadDevice.ts';
import { TouchDevice } from './TouchDevice.ts';
import { MovementIntent, LookIntent, AttackIntent, DodgeState, ParryState } from '../traits/index.ts';

export class InputSystem {
  readonly actionMap: ActionMap;
  readonly keyboard: KeyboardMouseDevice;
  readonly gamepad: GamepadDevice;
  readonly touch: TouchDevice;

  constructor(canvas: HTMLCanvasElement) {
    this.actionMap = ActionMap.desktopDefaults();
    this.keyboard = new KeyboardMouseDevice(this.actionMap);
    this.gamepad = new GamepadDevice();
    this.touch = new TouchDevice();
    this.keyboard.attach(canvas);
    this.touch.attach(canvas);
  }

  update(world: World): void {
    this.gamepad.poll();

    // Movement intent
    let dirX = 0;
    let dirZ = 0;
    if (this.actionMap.isActive('moveForward')) dirZ -= 1;
    if (this.actionMap.isActive('moveBack')) dirZ += 1;
    if (this.actionMap.isActive('moveLeft')) dirX -= 1;
    if (this.actionMap.isActive('moveRight')) dirX += 1;

    // Blend with gamepad/touch
    const gpStick = this.gamepad.leftStick;
    const touchStick = this.touch.moveStick;
    dirX += gpStick.x + touchStick.x;
    dirZ += gpStick.y + touchStick.y;

    // Clamp magnitude
    const mag = Math.sqrt(dirX * dirX + dirZ * dirZ);
    if (mag > 1) { dirX /= mag; dirZ /= mag; }

    world.set(MovementIntent, {
      dirX,
      dirZ,
      sprint: this.actionMap.isActive('sprint'),
      jump: this.actionMap.isActive('jump'),
    });

    // Look intent
    const mouseDelta = this.keyboard.consumeMouseDelta();
    const gpRight = this.gamepad.rightStick;
    const touchLook = this.touch.consumeLookDelta();
    world.set(LookIntent, {
      deltaX: mouseDelta.x + gpRight.x * 5 + touchLook.x,
      deltaY: mouseDelta.y + gpRight.y * 5 + touchLook.y,
    });
  }
}
```

`src/input/index.ts`:
```typescript
/**
 * @module input
 * @role Platform-agnostic input capture → Koota trait writes
 * @input Raw keyboard/mouse/gamepad/touch events
 * @output MovementIntent, LookIntent traits on Koota world
 * @depends traits
 * @tested ActionMap.test.ts
 */
export { ActionMap, type GameAction } from './ActionMap.ts';
export { KeyboardMouseDevice } from './KeyboardMouseDevice.ts';
export { GamepadDevice } from './GamepadDevice.ts';
export { TouchDevice } from './TouchDevice.ts';
export { InputSystem } from './InputSystem.ts';
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/input/`
Expected: All ActionMap tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/input/
git commit -m "feat: add platform-agnostic input system with ActionMap and device abstractions"
```

---

### Task 5: JollyPixel Runtime + VoxelRenderer Setup

**Files:**
- Create: `src/behaviors/RenderSyncBehavior.ts`
- Create: `src/behaviors/PlayerCameraBehavior.ts`
- Create: `src/behaviors/index.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Implement RenderSyncBehavior**

`src/behaviors/RenderSyncBehavior.ts`:
```typescript
import { ActorComponent } from '@jolly-pixel/engine';
import type { Entity } from 'koota';
import { Position, Rotation } from '../traits/index.ts';

/**
 * Syncs a JollyPixel Actor's transform from a Koota entity's Position/Rotation traits.
 * Attach to any Actor that represents a Koota entity visually.
 */
export class RenderSyncBehavior extends ActorComponent {
  entity: Entity | null = null;

  update(): void {
    if (!this.entity) return;
    const pos = this.entity.get(Position);
    if (pos) {
      this.actor.transform.position.set(pos.x, pos.y, pos.z);
    }
    const rot = this.entity.get(Rotation);
    if (rot) {
      this.actor.transform.rotation.set(rot.x, rot.y, rot.z);
    }
  }
}
```

- [ ] **Step 2: Implement PlayerCameraBehavior**

`src/behaviors/PlayerCameraBehavior.ts`:
```typescript
import { ActorComponent } from '@jolly-pixel/engine';
import * as THREE from 'three';

/**
 * First-person camera controller. Reads pointer lock mouse deltas.
 */
export class PlayerCameraBehavior extends ActorComponent {
  readonly #euler = new THREE.Euler(0, 0, 0, 'YXZ');
  readonly #sensitivity = 0.002;
  #pitchMin = -Math.PI / 2 + 0.01;
  #pitchMax = Math.PI / 2 - 0.01;
  camera: THREE.PerspectiveCamera | null = null;

  applyLook(deltaX: number, deltaY: number): void {
    if (!this.camera) return;
    this.#euler.setFromQuaternion(this.camera.quaternion);
    this.#euler.y -= deltaX * this.#sensitivity;
    this.#euler.x -= deltaY * this.#sensitivity;
    this.#euler.x = Math.max(this.#pitchMin, Math.min(this.#pitchMax, this.#euler.x));
    this.camera.quaternion.setFromEuler(this.#euler);
  }
}
```

`src/behaviors/index.ts`:
```typescript
/**
 * @module behaviors
 * @role JollyPixel ActorComponents for render sync, camera, and visual effects
 * @input Koota entity references, camera, input
 * @output Updated Actor transforms and visual state
 * @depends traits, @jolly-pixel/engine
 * @tested (browser tests)
 */
export { RenderSyncBehavior } from './RenderSyncBehavior.ts';
export { PlayerCameraBehavior } from './PlayerCameraBehavior.ts';
```

- [ ] **Step 3: Update main.ts with full bootstrap**

`src/main.ts`:
```typescript
import { Runtime, loadRuntime } from '@jolly-pixel/runtime';
import { createWorld } from 'koota';
import { Time, GamePhase, MovementIntent, LookIntent } from './traits/index.ts';
import { InputSystem } from './input/index.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvas) throw new Error('Canvas element not found');

// Koota world — single source of truth
const gameWorld = createWorld(Time, GamePhase, MovementIntent, LookIntent);

// JollyPixel runtime — owns render loop
const runtime = new Runtime(canvas, {
  includePerformanceStats: import.meta.env.DEV,
});

// Input system
const inputSystem = new InputSystem(canvas);

// Wire into JollyPixel's update loop
runtime.world.on('beforeUpdate', () => {
  const dt = runtime.world.loop?.deltaTime ?? 0.016;
  gameWorld.set(Time, { delta: dt, elapsed: (gameWorld.get(Time)?.elapsed ?? 0) + dt });
  inputSystem.update(gameWorld);
});

loadRuntime(runtime)
  .then(() => {
    console.log('[Bok] Runtime loaded — Koota world ready');
  })
  .catch((error) => {
    console.error('[Bok] Failed to load runtime:', error);
  });

export { gameWorld, runtime };
```

- [ ] **Step 4: Verify dev server starts**

Run: `npm run dev`
Expected: Vite dev server starts, browser shows canvas with JollyPixel loading screen, no console errors

- [ ] **Step 5: Commit**

```bash
git add src/behaviors/ src/main.ts
git commit -m "feat: integrate JollyPixel runtime with Koota world and input system"
```

---

### Task 6: Persistence (SQLite)

**Files:**
- Create: `src/persistence/Database.ts`
- Create: `src/persistence/SaveManager.ts`
- Create: `src/persistence/migrations.ts`
- Create: `src/persistence/index.ts`
- Create: `src/persistence/Database.test.ts`

- [ ] **Step 1: Write failing test**

`src/persistence/Database.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { SaveManager, type UnlockRecord, type RunRecord } from './index';

describe('SaveManager (mock)', () => {
  it('records an unlock', async () => {
    const mgr = SaveManager.createInMemory();
    await mgr.addUnlock({ id: 'dash', type: 'tome_page', data: { ability: 'dash' } });
    const unlocks = await mgr.getUnlocks();
    expect(unlocks).toHaveLength(1);
    expect(unlocks[0].id).toBe('dash');
  });

  it('records a run', async () => {
    const mgr = SaveManager.createInMemory();
    await mgr.addRun({ seed: 'test-seed', biomes: ['forest'], result: 'victory', duration: 300 });
    const runs = await mgr.getRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0].result).toBe('victory');
  });

  it('saves and loads game state', async () => {
    const mgr = SaveManager.createInMemory();
    const state = { koota: { entities: [] }, yuka: {}, scene: 'island' };
    await mgr.saveState(state);
    const loaded = await mgr.loadState();
    expect(loaded?.scene).toBe('island');
  });

  it('returns null when no save state exists', async () => {
    const mgr = SaveManager.createInMemory();
    expect(await mgr.loadState()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/persistence/Database.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement persistence layer**

`src/persistence/Database.ts`:
```typescript
/**
 * Abstraction over @capacitor-community/sqlite.
 * On web: uses jeep-sqlite (WASM). On native: uses Capacitor plugin.
 * For testing: in-memory Map-based mock.
 */
export interface DatabaseAdapter {
  execute(sql: string, params?: unknown[]): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

/** In-memory adapter for testing and initial development. */
export class InMemoryDatabase implements DatabaseAdapter {
  readonly #tables = new Map<string, unknown[]>();

  async execute(sql: string, params?: unknown[]): Promise<void> {
    // Parse simple CREATE TABLE and INSERT statements
    const createMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
    if (createMatch) {
      const table = createMatch[1];
      if (!this.#tables.has(table)) this.#tables.set(table, []);
      return;
    }

    const insertMatch = sql.match(/INSERT (?:OR REPLACE )?INTO (\w+)/);
    if (insertMatch && params) {
      const table = insertMatch[1];
      const rows = this.#tables.get(table) ?? [];
      rows.push(params);
      this.#tables.set(table, rows);
      return;
    }

    const deleteMatch = sql.match(/DELETE FROM (\w+)/);
    if (deleteMatch) {
      this.#tables.set(deleteMatch[1], []);
    }
  }

  async query<T>(sql: string, _params?: unknown[]): Promise<T[]> {
    const selectMatch = sql.match(/SELECT .+ FROM (\w+)/);
    if (selectMatch) {
      return (this.#tables.get(selectMatch[1]) ?? []) as T[];
    }
    return [];
  }
}
```

`src/persistence/migrations.ts`:
```typescript
import type { DatabaseAdapter } from './Database.ts';

export async function runMigrations(db: DatabaseAdapter): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS unlocks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      unlocked_at INTEGER NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tome_pages (
      id TEXT PRIMARY KEY,
      ability TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      unlocked_at INTEGER NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS hub_state (
      building_id TEXT PRIMARY KEY,
      level INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL DEFAULT '{}'
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seed TEXT NOT NULL,
      biomes TEXT NOT NULL,
      result TEXT NOT NULL,
      duration INTEGER NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS save_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      koota_snapshot TEXT NOT NULL,
      yuka_snapshot TEXT NOT NULL,
      scene TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `);
}
```

`src/persistence/SaveManager.ts`:
```typescript
import type { DatabaseAdapter } from './Database.ts';
import { InMemoryDatabase } from './Database.ts';
import { runMigrations } from './migrations.ts';

export interface UnlockRecord {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface RunRecord {
  seed: string;
  biomes: string[];
  result: 'victory' | 'death' | 'abandoned';
  duration: number;
}

export interface GameState {
  koota: unknown;
  yuka: unknown;
  scene: string;
}

export class SaveManager {
  readonly #db: DatabaseAdapter;
  #ready = false;

  constructor(db: DatabaseAdapter) {
    this.#db = db;
  }

  async init(): Promise<void> {
    if (this.#ready) return;
    await runMigrations(this.#db);
    this.#ready = true;
  }

  static createInMemory(): SaveManager {
    const mgr = new SaveManager(new InMemoryDatabase());
    // Sync init for in-memory (migrations are no-ops effectively)
    runMigrations(mgr.#db);
    return mgr;
  }

  async addUnlock(record: UnlockRecord): Promise<void> {
    await this.#db.execute(
      'INSERT OR REPLACE INTO unlocks (id, type, data, unlocked_at) VALUES (?, ?, ?, ?)',
      [record.id, record.type, JSON.stringify(record.data), Date.now()]
    );
  }

  async getUnlocks(): Promise<UnlockRecord[]> {
    const rows = await this.#db.query<unknown[]>('SELECT * FROM unlocks');
    return rows.map((r) => ({
      id: r[0] as string,
      type: r[1] as string,
      data: JSON.parse(r[2] as string),
    }));
  }

  async addRun(record: RunRecord): Promise<void> {
    await this.#db.execute(
      'INSERT INTO runs (seed, biomes, result, duration, timestamp) VALUES (?, ?, ?, ?, ?)',
      [record.seed, JSON.stringify(record.biomes), record.result, record.duration, Date.now()]
    );
  }

  async getRuns(): Promise<RunRecord[]> {
    const rows = await this.#db.query<unknown[]>('SELECT * FROM runs');
    return rows.map((r) => ({
      seed: r[1] as string,
      biomes: JSON.parse(r[2] as string),
      result: r[3] as RunRecord['result'],
      duration: r[4] as number,
    }));
  }

  async saveState(state: GameState): Promise<void> {
    await this.#db.execute(
      'INSERT OR REPLACE INTO save_state (id, koota_snapshot, yuka_snapshot, scene, timestamp) VALUES (1, ?, ?, ?, ?)',
      [JSON.stringify(state.koota), JSON.stringify(state.yuka), state.scene, Date.now()]
    );
  }

  async loadState(): Promise<GameState | null> {
    const rows = await this.#db.query<unknown[]>('SELECT * FROM save_state');
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      koota: JSON.parse(r[1] as string),
      yuka: JSON.parse(r[2] as string),
      scene: r[3] as string,
    };
  }
}
```

`src/persistence/index.ts`:
```typescript
/**
 * @module persistence
 * @role SQLite save/load via @capacitor-community/sqlite (web: jeep-sqlite)
 * @input Game state (Koota snapshots, Yuka JSON, progression data)
 * @output Persisted records: unlocks, runs, settings, save state
 * @depends @capacitor-community/sqlite
 * @tested Database.test.ts
 */
export { type DatabaseAdapter, InMemoryDatabase } from './Database.ts';
export { SaveManager, type UnlockRecord, type RunRecord, type GameState } from './SaveManager.ts';
export { runMigrations } from './migrations.ts';
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/persistence/`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/persistence/
git commit -m "feat: add SQLite persistence layer with SaveManager and in-memory adapter"
```

---

### Task 7: Content Types + Registry + First Biome

**Files:**
- Create: `src/content/types.ts`
- Create: `src/content/registry.ts`
- Create: `src/content/biomes/forest.json`
- Create: `src/content/enemies/slime.json`
- Create: `src/content/weapons/wooden-sword.json`
- Create: `src/content/bosses/ancient-treant.json`
- Create: `src/content/index.ts`
- Create: `src/content/registry.test.ts`

- [ ] **Step 1: Write failing test**

`src/content/registry.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { ContentRegistry } from './index';

describe('ContentRegistry', () => {
  it('loads and validates a biome config', () => {
    const registry = new ContentRegistry();
    const biome = registry.getBiome('forest');
    expect(biome.id).toBe('forest');
    expect(biome.terrain.noiseOctaves).toBe(3);
    expect(biome.enemies.length).toBeGreaterThan(0);
  });

  it('loads and validates an enemy config', () => {
    const registry = new ContentRegistry();
    const enemy = registry.getEnemy('slime');
    expect(enemy.id).toBe('slime');
    expect(enemy.health).toBeGreaterThan(0);
  });

  it('loads and validates a weapon config', () => {
    const registry = new ContentRegistry();
    const weapon = registry.getWeapon('wooden-sword');
    expect(weapon.id).toBe('wooden-sword');
    expect(weapon.baseDamage).toBeGreaterThan(0);
    expect(weapon.combo).toHaveLength(3);
  });

  it('throws on unknown content ID', () => {
    const registry = new ContentRegistry();
    expect(() => registry.getBiome('nonexistent')).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/registry.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Zod schemas**

`src/content/types.ts`:
```typescript
import { z } from 'zod';

export const EnemySpawnConfigSchema = z.object({
  enemyId: z.string(),
  weight: z.number().positive(),
  minDifficulty: z.number().int().min(1).default(1),
});

export const TerrainConfigSchema = z.object({
  noiseOctaves: z.number().int().min(1).max(8).default(3),
  noiseFrequency: z.number().positive().default(0.02),
  noiseAmplitude: z.number().positive().default(10),
  waterLevel: z.number().default(3),
  baseHeight: z.number().default(5),
  blocks: z.object({
    surface: z.number().int(),
    subsurface: z.number().int(),
    stone: z.number().int(),
    water: z.number().int().optional(),
    accent: z.number().int().optional(),
  }),
});

export const BiomeConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  terrain: TerrainConfigSchema,
  enemies: z.array(EnemySpawnConfigSchema).min(1),
  bossId: z.string(),
  music: z.string(),
  ambience: z.string(),
  skyColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fogColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fogDensity: z.number().positive().default(0.01),
});

export const ComboHitSchema = z.object({
  damageMultiplier: z.number().positive(),
  windowMs: z.number().positive(),
  animation: z.string(),
});

export const WeaponConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['melee', 'ranged']),
  baseDamage: z.number().positive(),
  attackSpeed: z.number().positive(),
  range: z.number().positive(),
  combo: z.array(ComboHitSchema).length(3),
  special: z.string().optional(),
  model: z.string().optional(),
});

export const AttackPatternSchema = z.object({
  name: z.string(),
  type: z.enum(['melee', 'ranged', 'aoe', 'summon']),
  damage: z.number(),
  cooldown: z.number().positive(),
  range: z.number().positive(),
  telegraph: z.number().nonnegative().default(0.5),
});

export const EnemyConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  health: z.number().positive(),
  speed: z.number().positive(),
  damage: z.number().positive(),
  attackPattern: z.string(),
  attacks: z.array(AttackPatternSchema).min(1),
  drops: z.array(z.object({
    itemId: z.string(),
    chance: z.number().min(0).max(1),
    minAmount: z.number().int().min(1).default(1),
    maxAmount: z.number().int().min(1).default(1),
  })),
  special: z.string().optional(),
  model: z.string().optional(),
});

export const BossPhaseSchema = z.object({
  healthThreshold: z.number().min(0).max(1),
  attacks: z.array(AttackPatternSchema).min(1),
  arenaChange: z.string().optional(),
  description: z.string(),
});

export const BossConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  biome: z.string(),
  health: z.number().positive(),
  phases: z.array(BossPhaseSchema).min(2),
  tomePageDrop: z.string(),
  model: z.string().optional(),
  arenaTemplate: z.string().optional(),
});

// Inferred types
export type BiomeConfig = z.infer<typeof BiomeConfigSchema>;
export type WeaponConfig = z.infer<typeof WeaponConfigSchema>;
export type EnemyConfig = z.infer<typeof EnemyConfigSchema>;
export type BossConfig = z.infer<typeof BossConfigSchema>;
export type EnemySpawnConfig = z.infer<typeof EnemySpawnConfigSchema>;
export type TerrainConfig = z.infer<typeof TerrainConfigSchema>;
export type AttackPattern = z.infer<typeof AttackPatternSchema>;
export type BossPhase = z.infer<typeof BossPhaseSchema>;
export type ComboHit = z.infer<typeof ComboHitSchema>;
```

- [ ] **Step 4: Create first content JSONs**

`src/content/biomes/forest.json`:
```json
{
  "id": "forest",
  "name": "Whispering Woods",
  "description": "Dense canopy of ancient trees. Limited visibility but rich resources.",
  "terrain": {
    "noiseOctaves": 3,
    "noiseFrequency": 0.03,
    "noiseAmplitude": 8,
    "waterLevel": 3,
    "baseHeight": 5,
    "blocks": {
      "surface": 1,
      "subsurface": 2,
      "stone": 3,
      "water": 4,
      "accent": 5
    }
  },
  "enemies": [
    { "enemyId": "slime", "weight": 0.6, "minDifficulty": 1 },
    { "enemyId": "skeleton-archer", "weight": 0.4, "minDifficulty": 1 }
  ],
  "bossId": "ancient-treant",
  "music": "music/forest-exploration.ogg",
  "ambience": "sfx/forest-ambience.ogg",
  "skyColor": "#87CEEB",
  "fogColor": "#2d5a27",
  "fogDensity": 0.015
}
```

`src/content/enemies/slime.json`:
```json
{
  "id": "slime",
  "name": "Forest Slime",
  "health": 30,
  "speed": 2.0,
  "damage": 8,
  "attackPattern": "wander-chase",
  "attacks": [
    {
      "name": "bounce",
      "type": "melee",
      "damage": 8,
      "cooldown": 1.5,
      "range": 1.2,
      "telegraph": 0.3
    }
  ],
  "drops": [
    { "itemId": "slime-gel", "chance": 0.5, "minAmount": 1, "maxAmount": 2 },
    { "itemId": "health-potion", "chance": 0.1, "minAmount": 1, "maxAmount": 1 }
  ],
  "special": "splits-on-death"
}
```

`src/content/weapons/wooden-sword.json`:
```json
{
  "id": "wooden-sword",
  "name": "Wooden Sword",
  "type": "melee",
  "baseDamage": 10,
  "attackSpeed": 1.0,
  "range": 1.5,
  "combo": [
    { "damageMultiplier": 1.0, "windowMs": 400, "animation": "slash-right" },
    { "damageMultiplier": 1.2, "windowMs": 350, "animation": "slash-left" },
    { "damageMultiplier": 1.5, "windowMs": 300, "animation": "thrust" }
  ]
}
```

`src/content/bosses/ancient-treant.json`:
```json
{
  "id": "ancient-treant",
  "name": "Ancient Treant",
  "biome": "forest",
  "health": 500,
  "phases": [
    {
      "healthThreshold": 1.0,
      "attacks": [
        { "name": "root-strike", "type": "melee", "damage": 20, "cooldown": 2.0, "range": 3.0, "telegraph": 0.8 },
        { "name": "leaf-storm", "type": "aoe", "damage": 10, "cooldown": 5.0, "range": 8.0, "telegraph": 1.0 }
      ],
      "description": "Root attacks — dodge the ground markers"
    },
    {
      "healthThreshold": 0.66,
      "attacks": [
        { "name": "root-strike", "type": "melee", "damage": 25, "cooldown": 1.8, "range": 3.0, "telegraph": 0.6 },
        { "name": "summon-saplings", "type": "summon", "damage": 0, "cooldown": 8.0, "range": 15.0, "telegraph": 1.5 }
      ],
      "arenaChange": "saplings-spawn",
      "description": "Summons sapling minions while attacking faster"
    },
    {
      "healthThreshold": 0.33,
      "attacks": [
        { "name": "root-frenzy", "type": "melee", "damage": 30, "cooldown": 1.0, "range": 4.0, "telegraph": 0.4 },
        { "name": "leaf-storm", "type": "aoe", "damage": 15, "cooldown": 3.0, "range": 10.0, "telegraph": 0.6 },
        { "name": "summon-saplings", "type": "summon", "damage": 0, "cooldown": 6.0, "range": 15.0, "telegraph": 1.0 }
      ],
      "arenaChange": "roots-everywhere",
      "description": "Enraged — all attacks faster and stronger"
    }
  ],
  "tomePageDrop": "dash"
}
```

- [ ] **Step 5: Implement ContentRegistry**

`src/content/registry.ts`:
```typescript
import {
  BiomeConfigSchema, EnemyConfigSchema, WeaponConfigSchema, BossConfigSchema,
  type BiomeConfig, type EnemyConfig, type WeaponConfig, type BossConfig,
} from './types.ts';

// Static imports for all content (Vite resolves JSON imports)
import forestBiome from './biomes/forest.json';
import slimeEnemy from './enemies/slime.json';
import woodenSword from './weapons/wooden-sword.json';
import ancientTreant from './bosses/ancient-treant.json';

export class ContentRegistry {
  readonly #biomes = new Map<string, BiomeConfig>();
  readonly #enemies = new Map<string, EnemyConfig>();
  readonly #weapons = new Map<string, WeaponConfig>();
  readonly #bosses = new Map<string, BossConfig>();

  constructor() {
    this.#registerBiomes([forestBiome]);
    this.#registerEnemies([slimeEnemy]);
    this.#registerWeapons([woodenSword]);
    this.#registerBosses([ancientTreant]);
  }

  #registerBiomes(raw: unknown[]): void {
    for (const data of raw) {
      const config = BiomeConfigSchema.parse(data);
      this.#biomes.set(config.id, config);
    }
  }

  #registerEnemies(raw: unknown[]): void {
    for (const data of raw) {
      const config = EnemyConfigSchema.parse(data);
      this.#enemies.set(config.id, config);
    }
  }

  #registerWeapons(raw: unknown[]): void {
    for (const data of raw) {
      const config = WeaponConfigSchema.parse(data);
      this.#weapons.set(config.id, config);
    }
  }

  #registerBosses(raw: unknown[]): void {
    for (const data of raw) {
      const config = BossConfigSchema.parse(data);
      this.#bosses.set(config.id, config);
    }
  }

  getBiome(id: string): BiomeConfig {
    const config = this.#biomes.get(id);
    if (!config) throw new Error(`Unknown biome: ${id}`);
    return config;
  }

  getEnemy(id: string): EnemyConfig {
    const config = this.#enemies.get(id);
    if (!config) throw new Error(`Unknown enemy: ${id}`);
    return config;
  }

  getWeapon(id: string): WeaponConfig {
    const config = this.#weapons.get(id);
    if (!config) throw new Error(`Unknown weapon: ${id}`);
    return config;
  }

  getBoss(id: string): BossConfig {
    const config = this.#bosses.get(id);
    if (!config) throw new Error(`Unknown boss: ${id}`);
    return config;
  }

  getAllBiomes(): BiomeConfig[] { return [...this.#biomes.values()]; }
  getAllEnemies(): EnemyConfig[] { return [...this.#enemies.values()]; }
  getAllWeapons(): WeaponConfig[] { return [...this.#weapons.values()]; }
  getAllBosses(): BossConfig[] { return [...this.#bosses.values()]; }
}
```

`src/content/index.ts`:
```typescript
/**
 * @module content
 * @role Data-driven game content definitions validated by Zod schemas
 * @input JSON config files (biomes, enemies, weapons, bosses)
 * @output Typed, validated config objects via ContentRegistry
 * @depends zod
 * @tested registry.test.ts
 */
export { ContentRegistry } from './registry.ts';
export {
  BiomeConfigSchema, EnemyConfigSchema, WeaponConfigSchema, BossConfigSchema,
  type BiomeConfig, type EnemyConfig, type WeaponConfig, type BossConfig,
  type AttackPattern, type BossPhase, type ComboHit, type TerrainConfig,
} from './types.ts';
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/content/`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/content/
git commit -m "feat: add content registry with Zod schemas and first biome/enemy/weapon/boss configs"
```

---

## Phase 2: Game Systems (Parallel Group B)

> Tasks 8-12 can all run in parallel. Each depends only on Phase 1 outputs.

### Task 8: AI Layer (Yuka Bridge)

**Files:**
- Create: `src/ai/bridge.ts`
- Create: `src/ai/EnemyVehicleFactory.ts`
- Create: `src/ai/states/PatrolState.ts`
- Create: `src/ai/states/ChaseState.ts`
- Create: `src/ai/states/AttackState.ts`
- Create: `src/ai/states/DeadState.ts`
- Create: `src/ai/states/index.ts`
- Create: `src/ai/index.ts`
- Create: `src/ai/bridge.test.ts`

Implementation: Create Yuka Vehicle instances for each enemy, FSM with patrol/chase/attack/dead states, AIBridge class that syncs Koota ↔ Yuka bidirectionally per frame. Test with mock entities verifying state transitions and position sync.

---

### Task 9: Combat System

**Files:**
- Create: `src/systems/combat/CombatSystem.ts`
- Create: `src/systems/combat/DamageCalculator.ts`
- Create: `src/systems/combat/HitDetection.ts`
- Create: `src/systems/combat/WeaponComboSystem.ts`
- Create: `src/systems/combat/index.ts`
- Create: `src/systems/combat/DamageCalculator.test.ts`
- Create: `src/systems/combat/WeaponComboSystem.test.ts`

Implementation: DamageCalculator as pure function (weapon + combo + crit - armor). WeaponComboSystem tracks combo state (3-hit chains with timing windows from weapon JSON). HitDetection uses position-distance checks (Rapier raycasts deferred to Phase 3 integration). CombatSystem orchestrates: check AttackIntent → HitDetection → DamageCalculator → apply Health changes.

---

### Task 10: Procedural Generation

**Files:**
- Create: `src/generation/noise/SimplexNoise.ts`
- Create: `src/generation/noise/PRNG.ts`
- Create: `src/generation/noise/index.ts`
- Create: `src/generation/TerrainBuilder.ts`
- Create: `src/generation/IslandGenerator.ts`
- Create: `src/generation/EnemyPlacer.ts`
- Create: `src/generation/LootPlacer.ts`
- Create: `src/generation/StructureGenerator.ts`
- Create: `src/generation/index.ts`
- Create: `src/generation/TerrainBuilder.test.ts`
- Create: `src/generation/IslandGenerator.test.ts`
- Create: `src/generation/PRNG.test.ts`

Implementation: PRNG (xmur3 + sfc32) for deterministic seeding. SimplexNoise for terrain heightmaps. TerrainBuilder takes BiomeConfig + seed → VoxelWorldJSON (3D heightmap to voxel block data). IslandGenerator orchestrates: terrain + structures + enemy placement + loot. All pure functions, tested for determinism (same seed = same output).

---

### Task 11: Progression System

**Files:**
- Create: `src/systems/progression/RunManager.ts`
- Create: `src/systems/progression/UnlockTracker.ts`
- Create: `src/systems/progression/TomeProgression.ts`
- Create: `src/systems/progression/index.ts`
- Create: `src/systems/progression/RunManager.test.ts`

Implementation: RunManager tracks run lifecycle (start → islands visited → death/victory). UnlockTracker reads/writes permanent unlocks via SaveManager. TomeProgression manages page unlocks and ability activation. All read/write through Koota traits and SaveManager.

---

### Task 12: Scene Management

**Files:**
- Create: `src/scenes/SceneDirector.ts`
- Create: `src/scenes/Scene.ts` (base class)
- Create: `src/scenes/MainMenuScene.ts`
- Create: `src/scenes/HubScene.ts`
- Create: `src/scenes/IslandScene.ts`
- Create: `src/scenes/BossArenaScene.ts`
- Create: `src/scenes/index.ts`
- Create: `src/scenes/SceneDirector.test.ts`

Implementation: Scene base class with `enter()`, `update(dt)`, `exit()`. SceneDirector is a custom FSM (not Yuka) managing transitions: MainMenu → Hub → Island → BossArena → Results → Hub. Test transitions and lifecycle calls.

---

### Task 12a: Movement + Physics System (Rapier3D)

**Files:**
- Create: `src/systems/movement/MovementSystem.ts`
- Create: `src/systems/movement/CollisionResolver.ts`
- Create: `src/systems/movement/PhysicsWorld.ts`
- Create: `src/systems/movement/index.ts`
- Create: `src/systems/movement/MovementSystem.test.ts`

Implementation: MovementSystem is a Koota query-based system: `query(Position, Velocity).updateEach()` applies velocity × dt to position. PhysicsWorld wraps Rapier3D initialization (`RAPIER.World({ x: 0, y: -9.81, z: 0 })`), manages rigid body creation/destruction for entities, and runs `rapierWorld.step()`. CollisionResolver syncs Rapier rigid body positions back to Koota Position traits after each step. VoxelRenderer's `VoxelColliderBuilder` handles terrain colliders automatically — PhysicsWorld just passes the Rapier instance to VoxelRenderer on init. Entity colliders are kinematic rigid bodies for player/enemies. Test MovementSystem with mock entities: spawn at (0,0,0) with velocity (1,0,0), update(1.0), expect position (1,0,0).

---

### Task 12b: Spawning + Inventory Systems

**Files:**
- Create: `src/systems/spawning/EnemySpawner.ts`
- Create: `src/systems/spawning/LootSpawner.ts`
- Create: `src/systems/spawning/IslandPopulator.ts`
- Create: `src/systems/spawning/index.ts`
- Create: `src/systems/spawning/EnemySpawner.test.ts`
- Create: `src/systems/inventory/Inventory.ts`
- Create: `src/systems/inventory/LootTable.ts`
- Create: `src/systems/inventory/CraftingSystem.ts`
- Create: `src/systems/inventory/index.ts`
- Create: `src/systems/inventory/Inventory.test.ts`

Implementation: EnemySpawner takes spawn point data from IslandGenerator output and creates Koota entities with appropriate traits + Yuka vehicles via AIBridge. LootSpawner creates loot entities at chest positions. IslandPopulator orchestrates both. Inventory is a Koota-backed system using Contains relations — player entity contains item entities. LootTable resolves weighted random drops from enemy/chest configs. CraftingSystem checks recipe requirements against inventory and produces outputs. Test EnemySpawner with mock spawn data, test Inventory add/remove/query, test LootTable distribution over many rolls.

---

## Phase 3: Vertical Slice

### Task 13: Forest Island End-to-End

**Files:**
- Modify: `src/main.ts` (wire everything together)
- Create: `src/shared/EventBus.ts`
- Create: `src/shared/constants.ts`
- Create: `src/shared/types.ts`
- Create: `src/shared/index.ts`

Implementation: Wire all systems into the frame loop. Generate a Forest island from seed, spawn player with wooden sword, spawn slime enemies with AI, enable combat, place the Ancient Treant boss. This is the integration task — making everything work together as a playable experience. Player can move, fight slimes, reach the boss, and defeat it.

---

## Phase 4: Content + Polish (Parallel Group C)

> Tasks 14-23 can all run in parallel. Each is independent content/feature authoring.

### Task 14: Remaining 7 Biome JSONs
Create: `src/content/biomes/{desert,tundra,volcanic,swamp,crystal-caves,sky-ruins,deep-ocean}.json`

### Task 15: All 16 Enemy Configs
Create: `src/content/enemies/{skeleton-archer,sand-wraith,scorpion,frost-wolf,ice-golem,fire-imp,lava-elemental,swamp-lurker,bog-witch,crystal-sentinel,gem-spider,sky-hawk,wind-elemental,depth-crawler,angler-fish}.json`

### Task 16: All 8 Boss Configs
Create: `src/content/bosses/{pharaoh-construct,frost-wyrm,magma-king,mire-hag,crystal-hydra,storm-titan,abyssal-leviathan}.json`

### Task 17: All 15+ Weapon Configs
Create: `src/content/weapons/{iron-sword,crystal-blade,volcanic-edge,frost-cleaver,war-hammer,battle-axe,twin-daggers,trident,short-bow,crossbow,fire-staff,ice-wand,lightning-rod,crystal-sling}.json`

### Task 17a: Hub + Item Content
Create: `src/content/hub/buildings.json`, `src/content/hub/npcs.json`, `src/content/items/loot-tables.json`, `src/content/items/crafting-recipes.json`
Add Zod schemas for hub buildings, NPCs, loot tables, and crafting recipes to `src/content/types.ts`. Register in ContentRegistry. **Note:** When adding new content files, also update `src/content/registry.ts` to import and register them.

### Task 18: UI/HUD
Create: `src/ui/hud/{HealthBar,Hotbar,Minimap,DamageIndicator}.ts`, `src/ui/tome/{TomeOverlay,PageBrowser}.ts`, `src/ui/index.ts`

### Task 19: Audio System
Create: `src/systems/audio/{AudioManager,MusicSystem,SFXPlayer}.ts`, `src/systems/audio/index.ts`

### Task 20: Rendering Effects
Create: `src/rendering/{ParticleSystem,WeatherSystem,DayNightCycle,WaterRenderer,PostProcessing}.ts`, `src/rendering/index.ts`

### Task 21: Hub Island Scene
Implement: `src/scenes/HubScene.ts` — persistent hub with buildings, NPCs, upgrade interactions.

### Task 22: Sailing + Island Select
Create: `src/scenes/SailingScene.ts`, `src/scenes/IslandSelectScene.ts`

### Task 23: Main Menu + Death/Victory Screens
Create: `src/ui/screens/{MainMenu,PauseMenu,DeathScreen,VictoryScreen}.ts`

### Task 24: Integration Tests + Final Polish
Create: `src/integration.test.ts` — scene lifecycle, save/load round-trip, full run simulation.
Run full test suite. Fix any remaining issues. Final commit.

---

## Execution Notes

**IMPORTANT for Phase 4 content agents:** When adding new content JSON files, you MUST also update `src/content/registry.ts` to add the static import and registration call. Follow the pattern established by the existing forest biome, slime enemy, wooden sword, and ancient treant boss imports.

- **Phase 0** must complete before anything else
- **Phase 1** tasks (3-7) are fully independent — dispatch 5 parallel agents
- **Phase 2** tasks (8-12) are fully independent — dispatch 5 parallel agents
- **Phase 3** is sequential (integration)
- **Phase 4** tasks (14-24) are fully independent — dispatch 10+ parallel agents
- Total parallelism potential: up to 10 simultaneous agents in Phase 4
