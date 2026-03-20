# CLAUDE.md — Bok: The Builder's Tome

## Project Overview
Voxel roguelike island-hopper built on JollyPixel + Koota + Yuka.

## Quick Start
```bash
npm install
npm run dev          # Vite dev server at localhost:5173
npm test             # Vitest (unit + browser tests)
npm run lint         # ESLint with barrel export enforcement
npm run typecheck    # TypeScript strict mode check
```

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
```typescript
/**
 * @module <domain-name>
 * @role <singular responsibility>
 * @input <what it consumes>
 * @output <what it produces>
 * @depends <other domains imported>
 * @tested <test file>
 */
```

## Testing
```bash
npm test                          # All tests
npm run test:unit                 # Unit only (node)
npm run test:browser              # Browser only (playwright)
npx vitest src/generation/        # Single domain
```

## Key Libraries
- **JollyPixel** — `/Users/jbogaty/src/reference-codebases/editor` (engine, runtime, voxel-renderer)
- **Koota** — `/Users/jbogaty/src/reference-codebases/koota` (ECS state)
- **Yuka** — `/Users/jbogaty/src/reference-codebases/yuka` (AI: steering, FSM, goals, perception)
