---
title: CLAUDE.md — Bok
updated: 2026-04-09
status: current
domain: technical
---

# CLAUDE.md — Bok: The Builder's Tome

## Project Identity

Voxel roguelike island-hopper. React 19 owns all UI. JollyPixel engine owns the 3D canvas. Koota owns game state. Yuka owns enemy AI. Capacitor targets web, iOS, and Android.

**Entry point:** `index.html` → `src/app/index.tsx`

## Quick Start

```bash
pnpm install
pnpm dev                  # Vite dev server at localhost:5173
pnpm test                 # Vitest unit tests (1069 tests, 88 files)
pnpm test:browser         # Vitest browser tests via Playwright
pnpm run lint             # Biome 2.4 check
pnpm run typecheck        # TypeScript strict mode
```

## Key Architecture Facts

See `docs/ARCHITECTURE.md` for the full architecture. The critical facts for agents:

1. **React → engine bridge**: GameView mounts canvas via ref, dynamic-imports `initGame(canvas, config)` on effect. Engine never touches DOM directly.
2. **JollyPixel patterns**: Always use `jpWorld.createActor()`, never raw Three.js. `jpWorld` type is `any` everywhere — accepted codebase pattern.
3. **Import rule**: Barrel exports only. Never reach into a domain's internal files across domain boundaries. The pre-edit hook enforces this.
4. **Content is data-driven JSON**: All biomes, enemies, weapons, bosses are JSON files in `src/content/`. Zod validates at import time.

## Source Layout

```
src/
├── app/          React entry — App.tsx state machine
├── views/        React views (menu/, game/, hub/)
├── components/   React UI (hud/, modals/, transitions/, ui/)
├── hooks/        React hooks
├── engine/       GameEngine.ts + focused modules (terrain, enemy, combat, camera, loop)
├── traits/       Koota trait definitions
├── relations/    Koota relation definitions
├── systems/      Koota query-based systems
├── ai/           Yuka bridge + FSM states
├── generation/   Procedural generation (pure functions)
├── content/      JSON content + Zod schemas
├── rendering/    Visual effects (particles, weather, day/night)
├── input/        Platform-agnostic input (ActionMap, devices)
├── audio/        Tone.js procedural SFX + music
├── persistence/  SQLite save/load (Capacitor)
├── platform/     Capacitor platform bridge
├── shared/       Cross-cutting types, constants, EventBus
├── lib/          Utility libraries
└── types/        Global type declarations
```

## Reference Codebases

- **JollyPixel:** `/Users/jbogaty/src/reference-codebases/editor`
  - VoxelRenderer: `packages/voxel-renderer/examples/scripts/`
  - Engine API: `packages/engine/src/`
- **Koota:** `/Users/jbogaty/src/reference-codebases/koota`
- **Yuka:** `/Users/jbogaty/src/reference-codebases/yuka`

## DO NOT

- Write mock-heavy unit tests for rendering or DOM code — use browser tests.
- Silently catch errors — show visible error modals or throw.
- Import across domain boundaries by reaching into internals (the hook will block it).
- Use `innerHTML` — use safe DOM methods or React components.
- Bypass JollyPixel APIs with raw Three.js.
- Create stubs, placeholders, or `// TODO` comments — implement fully or don't start.
- Duplicate rules from `~/.claude/CLAUDE.md` in this file.
