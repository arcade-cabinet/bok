# CLAUDE.md — Bok: The Builder's Tome

## Project Overview

Voxel roguelike island-hopper. React 19 owns all UI. JollyPixel engine owns 3D canvas. Koota owns game state. Yuka owns enemy AI. Capacitor targets mobile.

## CURRENT STATE (2026-03-21)

The game is PLAYABLE with React as the entry point (`index.html` → `src/app/index.tsx`). The old monolithic `src/main.ts` is gone; gameplay is split between `src/engine/` (`GameEngine.ts` orchestrates terrain, combat, enemies, camera, audio) and remaining `src/scenes/` code where still used.

- **src/app/** — Menu → hub → `GameView`; `useProgression` for meta hooks
- **src/engine/GameEngine.ts** — `initGame(canvas, config)` — primary island loop
- **src/views/hub/HubView.tsx** — Hub island (`createHub`)
- **Planning docs** — `docs/superpowers/plans/*.md` checkboxes are not automatically synced with the repo; verify in code

## Production checklist

**SEE: `docs/PRODUCTION_ROADMAP.md`** — remaining work for a full production game (persistence, platform, content, QA, dual-stack convergence).

## Active Plan (incremental)

**SEE: `docs/superpowers/plans/2026-03-21-react-refactor-and-completion.md`**

Historical task breakdown — many items overlap with or are superseded by the production roadmap; validate against the codebase.

## Quick Start

```bash
pnpm install
pnpm dev                  # Vite 8 dev server at localhost:5173
pnpm test                 # Vitest unit project (`src/**/*.test.ts`)
pnpm test:browser         # Vitest browser project (`*.browser.test.tsx`)
pnpm run lint             # Biome 2.4 check
pnpm run typecheck        # TypeScript strict mode
```

### Typography (offline)

UI typefaces are **self-hosted** via `@fontsource/*` and imported in `src/fonts.css` using each family’s **full `index.css`** (all bundled weights/styles and Unicode subsets — not a Latin-only slice), plus **JetBrains Mono** for monospace. Vite emits hashed `.woff2`/`.woff` into `dist/assets/`; **no Google Fonts CDN** at runtime. System **Georgia** remains the fallback where inline styles request it.

## Architecture

### Layer Model
1. **React 19** — all UI (menu, HUD, overlays, modals). Framer Motion for animations. Tailwind CSS 4.
2. **JollyPixel** — 3D rendering (VoxelRenderer, Camera3DControls, Runtime). Owns the canvas via React ref.
3. **Koota** — ECS state (traits, relations, queries). Single source of truth for all game entity data.
4. **Yuka** — AI (Vehicle, SteeringBehavior, StateMachine). Drives enemy movement/combat decisions.
5. **Rapier3D** — Physics. Passed to VoxelRenderer for auto-generated terrain colliders.
6. **Capacitor** — Cross-platform (web, iOS, Android). SQLite for persistence.

### Package Structure (target — migration in progress)
```
src/
├── app/              React app entry (App.tsx, index.tsx)
├── views/            React view components (menu, game, hub)
├── components/       React UI components (hud, modals, ui)
├── hooks/            React hooks (useGameState, useGameEvents)
├── engine/           Game engine modules (terrain, enemies, combat, camera)
│   ├── types.ts      Shared engine types
│   └── GameEngine.ts Orchestrator: initGame(canvas, config)
├── traits/           Koota trait definitions
├── relations/        Koota relation definitions
├── systems/          Koota query-based systems
├── ai/               Yuka AI bridge + FSM states
├── generation/       Procedural generation (pure functions)
├── content/          JSON game content + Zod schemas
├── rendering/        Visual effects (particles, weather, day/night, tileset)
├── input/            Input system (ActionMap, devices, mobile controls)
├── audio/            Web Audio API procedural sounds
├── persistence/      SQLite save/load
├── platform/         Capacitor platform bridge
├── shared/           Cross-cutting types, constants, EventBus
└── scenes/           Legacy SceneDirector / IslandScene (parallel to React engine path)
```

### Key Integration Pattern

```typescript
// React mounts the canvas and passes it to the engine:
// src/views/game/GameView.tsx
const canvasRef = useRef<HTMLCanvasElement>(null);
useEffect(() => {
  import('../engine/GameEngine').then(({ initGame }) => {
    initGame(canvasRef.current!, config);
  });
}, []);

// Engine creates JollyPixel Runtime on the canvas:
// src/engine/GameEngine.ts
export async function initGame(canvas: HTMLCanvasElement, config: GameStartConfig) {
  const runtime = new Runtime(canvas);
  const voxelMap = jpWorld.createActor('terrain').addComponentAndGet(VoxelRenderer, { ... });
  // ... generate terrain, spawn enemies, wire combat, etc.
}
```

### JollyPixel Usage (CORRECT patterns)

```typescript
// Create actors via jpWorld.createActor()
const terrainActor = jpWorld.createActor('terrain');

// VoxelRenderer as ActorComponent with Rapier
const voxelMap = terrainActor.addComponentAndGet(VoxelRenderer, {
  chunkSize: 16, layers: ['Ground'], blocks: blockDefs,
  rapier: { api: RAPIER as never, world: rapierWorld as never },
  material: 'lambert',
});

// Load tileset via VoxelRenderer's TilesetManager
voxelMap.tilesetManager.registerTexture(def, texture);

// Place voxels
voxelMap.setVoxel('Ground', { position: { x, y, z }, blockId: 1 });

// Camera via Camera3DControls (built-in FPS camera)
const cameraCtrl = jpWorld.createActor('camera').addComponentAndGet(Camera3DControls, { speed: 6 });

// Get Three.js scene from JollyPixel
const scene = jpWorld.sceneManager.getSource() as THREE.Scene;

// Physics step on fixed update
(jpWorld as any).on('beforeFixedUpdate', () => rapierWorld.step());

// Game loop on variable update
(jpWorld as any).on('beforeUpdate', (dt: number) => { ... });
```

### Reference Codebases
- **JollyPixel:** `/Users/jbogaty/src/reference-codebases/editor`
  - VoxelRenderer examples: `packages/voxel-renderer/examples/scripts/`
  - Engine API: `packages/engine/src/`
  - Runtime: `packages/runtime/src/Runtime.ts`
- **Koota:** `/Users/jbogaty/src/reference-codebases/koota`
- **Yuka:** `/Users/jbogaty/src/reference-codebases/yuka`

### Asset Library
- **Location:** `/Volumes/home/assets` (SMB share, must be mounted)
- **3DLowPoly:** Kenney/Quaternius — modern low-poly GLBs
- **3DPSX:** PSX-style retro assets — tools, weapons, characters
- **MCP tools:** `search_assets`, `copy_asset`, `get_asset_info`

## Testing

- **Unit tests:** `pnpm test` — Vitest in Node, 128 tests passing
- **Browser tests:** `pnpm test:browser` — NOT YET CONFIGURED (Task 61)
- **No node mocks for Three.js/DOM** — use browser tests instead
- **Content validation:** Zod schemas validate all JSON at import time

## DO NOT

- Write mock-heavy unit tests for rendering/DOM code. Use browser tests.
- Silently catch errors. Show visible error modals.
- Import across domain barrels (e.g., `from '../systems/combat/DamageCalculator'`).
- Use `innerHTML`. Use safe DOM methods or React components.
- Bypass JollyPixel APIs with raw Three.js. Use VoxelRenderer, Camera3DControls, etc.
- Create stubs, placeholders, or "follow-up" comments. Implement fully or don't start.
