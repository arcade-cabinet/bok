# Production roadmap — Bok: The Builder’s Tome

This document is the **single checklist for shipping a production-quality game**. It aggregates gaps across architecture plans, the game design spec, and known technical debt. **A playable vertical slice exists**; **full production** requires completing (or explicitly descoping) the items below.

**Related:** [Game design spec](superpowers/specs/2026-03-20-bok-game-design.md) · [React refactor plan](superpowers/plans/2026-03-21-react-refactor-and-completion.md) · [Implementation plan](superpowers/plans/2026-03-20-bok-implementation.md)

---

## 1. Product & UX (player-facing)

| Area | Status | Remaining work |
|------|--------|----------------|
| **Main flow** | Menu → hub → island loop in React | Polish “Inscriptions”, onboarding, first-run hints |
| **Resume** | Restores **last run seed + biome** to hub | True **mid-run resume** needs serialized world/engine state (see §5) |
| **Hub** | Voxel hub + docks + Set Sail | NPCs, building upgrades, sailing/island-select scenes per design spec |
| **Progression** | Tome unlocks + run history (in-memory save in dev) | **SQLite on device** (Capacitor): verify migrations, backup, corrupt-save handling |
| **Death / victory** | React overlays in `GameView` | Match spec copy, unlock messaging, return flow |
| **Accessibility** | Partial (labels, button types) | Full keyboard paths, contrast audit, screen-reader strategy for canvas |

---

## 2. Content (data-driven)

| Area | Status | Remaining work |
|------|--------|----------------|
| **Biomes** | Multiple biomes in menu | Fill/validate all biome JSON; boss/enemy parity per biome |
| **Enemies / bosses / weapons** | Registry + engine hooks | Complete catalog vs design targets; balance passes |
| **Loot / crafting** | Tables + systems exist | Wire **diegetic** discovery, UI surfacing, tuning |
| **Hub content** | Stub / minimal | Buildings, NPCs, recipes per spec |

---

## 3. Architecture & code health

| Area | Status | Remaining work |
|------|--------|----------------|
| **Primary runtime** | **React + `GameEngine`** (`initGame`) | ~~Converge dual stack~~ **DONE** — `src/scenes/` and `src/ui/` deleted (US-017); React is sole UI/orchestration layer |
| **HUD** | React components (`src/components/hud/`) | ~~Migrate DOM HUD~~ **DONE** — HealthBar, Hotbar, Minimap, DamageIndicator, BuildingInteraction all React+daisyUI |
| **Barrel imports** | Enforced in `AGENTS.md` | Audit for deep imports across domains |
| **Lint** | `pnpm run lint` passes (warnings remain) | Reduce `noExplicitAny` / `noNonNullAssertion` in hot paths; address `noStaticOnlyClass` in generation or document exception |
| **Bundle size** | Main chunk &gt; 500 kB warning | Code-split routes/engine, audit font payload if mobile-first |

---

## 4. Platform (web + native)

| Area | Status | Remaining work |
|------|--------|----------------|
| **Web** | Vite build + PWA optional | Service worker, offline shell, caching strategy if required |
| **Capacitor** | Bridge present | **Release builds** iOS/Android: icons, splash, store metadata, signing |
| **SQLite** | `@capacitor-community/sqlite` | Replace or supplement in-memory dev path; **E2E on hardware** |
| **Status bar / orientation / haptics** | Partial | Platform QA matrix |

---

## 5. Persistence & saves

| Area | Status | Remaining work |
|------|--------|----------------|
| **Run history** | Persisted via `SaveManager` (test DB) | Production adapter + ordering (newest-first) verified on real DB |
| **Tome / unlocks** | `TomeProgression` + unlocks table | Full round-trip UI + export/import if in scope |
| **Mid-run save** | `save_state` table exists | **Serialize** Koota/Yuka/scene from `GameEngine` or scene stack; **load** on resume |
| **Resume semantics** | Last seed+biome → hub | Document vs implement **continue same island** |

---

## 6. Rendering & audio

| Area | Status | Remaining work |
|------|--------|----------------|
| **GLB models** | `public/models/` + `engine/models.ts` | Asset audit: every content ID maps to a file; LOD/perf on low-end |
| **Audio** | Tone.js + managers + **SpatialAudio** (Panner3D) + AudioFacade | ~~Spatial mix~~ **DONE**; compression, mobile autoplay policies |
| **Effects** | Particles, day/night, etc. | Performance budget, quality settings |

---

## 7. AI & combat

| Area | Status | Remaining work |
|------|--------|----------------|
| **Enemy AI** | Yuka FSM + steering | Playtest edge cases, boss phases vs content |
| **Player governor** | GOAP assist, **11 tests**, 2 bug fixes | Tune; expose toggles in settings if needed |
| **Combat feel** | Contact + systems | Netcode N/A for v1; local polish and difficulty |

---

## 8. Quality assurance

| Area | Status | Remaining work |
|------|--------|----------------|
| **Unit tests** | 186 passing (`pnpm test`) | Keep coverage on public APIs |
| **Browser tests** | ContextIndicator, **HealthBar**, **PauseMenu** browser tests | **Full journey**: menu → hub → game → end state |
| **Device QA** | Manual | Phones/tablets: touch, safe areas, thermal throttling |
| **CI** | **`.github/workflows/ci.yml`** — typecheck, lint, test, build, browser-tests | Verify on first PR run; tune browser-test stability |

---

## 9. Operations & release

| Area | Status | Remaining work |
|------|--------|----------------|
| **Versioning** | — | Semver, changelog, release notes |
| **Error reporting** | Global error overlay (Capacitor bridge) | Optional Sentry/Crashlytics |
| **Privacy / compliance** | — | Store listings, analytics opt-in |

---

## 10. Verification commands (release gate)

```bash
pnpm install
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run test:browser   # headless Playwright
pnpm run build
```

Manual: smoke **menu → Pen New Tale → hub → Set Sail → island**, plus **Resume Chapter** after at least one completed run record.

---

## Revision

Update this file when major features land or scope changes. **Last updated:** 2026-03-21.
