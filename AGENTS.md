---
title: AGENTS.md — Bok
updated: 2026-04-09
status: current
domain: technical
---

# AGENTS.md — Bok: The Builder's Tome

Extended operating protocols for AI agents working on this codebase.

## Import Rules

- **Always** import from barrel exports: `import { X } from '../systems/combat'`
- **Never** import from internal files: `import { X } from '../systems/combat/DamageCalculator'`
- Cross-domain imports go through barrels. Within-domain imports use relative paths.
- A pre-edit hook (`settings.local.json`) blocks deep cross-domain imports automatically.

## Adding a New File

1. Create the file in the appropriate domain directory under `src/`.
2. Add a re-export to the domain's `index.ts` barrel.
3. Write tests for the public API in `<domain>/<name>.test.ts`.
4. Run `pnpm test` to verify.

## Adding Content (Biome / Enemy / Weapon / Boss)

1. Copy the closest existing JSON from `src/content/<type>/`.
2. Modify fields per the Zod schema in `src/content/types.ts`.
3. Register in the content registry (`src/content/registry.ts`).
4. Run `pnpm test` — Zod validates all content at import time.

## Domain Boundaries

Each domain has ONE responsibility. Never add cross-cutting concerns:

| Domain | Responsibility |
|--------|---------------|
| `src/traits/` | Koota trait definitions |
| `src/relations/` | Koota relation definitions |
| `src/systems/` | Koota query-based game logic |
| `src/ai/` | Yuka bridge + FSM states |
| `src/generation/` | Procedural world generation |
| `src/content/` | JSON game content + Zod schemas |
| `src/rendering/` | Visual effects |
| `src/components/` | React UI components |
| `src/persistence/` | SQLite save/load |
| `src/input/` | Platform-agnostic input |
| `src/audio/` | Tone.js procedural SFX + music |
| `src/engine/` | JollyPixel orchestration |

## Module Contract

Every domain `index.ts` must have this JSDoc header:

```typescript
/**
 * @module <domain-name>
 * @role <one sentence>
 * @input <what it consumes>
 * @output <what it produces>
 * @depends <other domains imported>
 * @tested <test file>
 */
```

## Custom Agent Roles

Three sub-agents in `.claude/agents/`:

- **content-author** — Creates JSON content files from templates, validates against Zod schema
- **domain-reviewer** — Reviews for barrel export violations, SRP breaches, missing re-exports, missing tests, missing module contract headers
- **test-enforcer** — Ensures all barrel-exported symbols have test coverage

## Testing Conventions

- Unit tests (`*.test.ts`): pure logic — generation, combat math, content validation, AI transitions
- Browser tests (`*.browser.test.tsx`): all React components and anything touching DOM/WebGL
- No node mocks for Three.js/DOM — use browser project instead
- `pnpm test` runs the unit project; `pnpm test:browser` runs the browser project

## Hook Enforcement

`.claude/settings.local.json` contains a `PreToolUse` hook on `Edit|Write` that blocks any import reaching into another domain's internals. Fix the import to use the barrel — do not modify the hook.
