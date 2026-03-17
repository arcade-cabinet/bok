# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

### Rune System Layered Architecture
- **Pure data layer** (`rune-data.ts`, `interaction-rune-data.ts`): Constants, types, lookups. No ECS, no Three.js.
- **Pure math/logic layer** (`ansuz-sense.ts`, `thurisaz-damage.ts`, `fehu-pull.ts`): Spatial queries, distance checks, signal computation. No ECS imports.
- **ECS system layer** (`interaction-rune-system.ts`): Queries entities, collects positions, delegates to pure logic, emits side effects.
- **Barrel exports** (`index.ts`): Re-exports everything. Always check here first to see if functionality already exists.

### Naming Convention: Feature Rune Modules
- Rune features use descriptive names like `ansuz-sense.ts`, `thurisaz-damage.ts`, NOT generic names like `rune-sensor.ts`.
- PRD stories may use generic names — always check existing files before creating new ones.

---

## 2026-03-16 - RC-003
- **What was implemented**: Already complete from prior work. Ansuz sensor proximity detection fully implemented.
- **Files (pre-existing)**:
  - `src/ecs/systems/ansuz-sense.ts` — Pure math: `detectsEntity()`, `countDetectedEntities()`, `computeAnsuzSignalStrength()`, `isEntityDetected()`
  - `src/ecs/systems/ansuz-sense.test.ts` — 17 unit tests covering empty lists, within/beyond radius, multiple creatures, signal strength, constants
  - `src/ecs/systems/interaction-rune-data.ts` — Constants: `ANSUZ_DETECT_RADIUS=12`, `ANSUZ_EMIT_STRENGTH=8`, `ANSUZ_COOLDOWN=1.0`
  - `src/ecs/systems/interaction-rune-system.ts` — `processAnsuz()` wires sense logic into ECS, emits `SignalEmitter` with `SignalType.Detection`
  - `src/ecs/systems/index.ts` — All functions re-exported
- **Acceptance criteria verification**:
  - [x] Unit test written (ansuz-sense.test.ts — 17 tests)
  - [x] Ansuz detects creatures within detection radius (detectsEntity, countDetectedEntities)
  - [x] Emits signal when creature enters range, stops when leaves (processAnsuz returns emitters only when strength > 0)
  - [x] Detection range falloff tested (within/beyond radius boundary tests)
  - [x] Multiple creatures handled (countDetectedEntities tests 2+ entities)
  - [x] pnpm tsc -b passes
  - [x] pnpm test passes (1997/1997 tests, 119 files)
- **Learnings:**
  - PRD stories may use different file names than what exists (e.g., "rune-sensor.ts" vs actual "ansuz-sense.ts"). Always search existing files first.
  - The rune system follows a strict 3-layer pattern: pure data → pure math → ECS system. Each layer has its own test file.
  - `interaction-rune-system.ts` is the main ECS orchestrator for Jera/Fehu/Ansuz/Thurisaz — it processes all interaction runes on a throttled tick.
  - `node_modules` may not be present in worktrees; run `pnpm install` before any commands.
---

