# Production roadmap — Bok: The Builder's Tome

This document is the **single checklist for shipping a production-quality game**. It aggregates gaps across architecture plans, the game design spec, and known technical debt. **A playable vertical slice exists**; **full production** requires completing (or explicitly descoping) the items below.

**Related:** [Game design spec](superpowers/specs/2026-03-20-bok-game-design.md) · [React refactor plan](superpowers/plans/2026-03-21-react-refactor-and-completion.md) · [Implementation plan](superpowers/plans/2026-03-20-bok-implementation.md)

---

## 1. Product & UX (player-facing)

| Area | Status | Remaining work |
|------|--------|----------------|
| **Main flow** | Menu → hub → island-select → sailing → game in React | Polish "Inscriptions", onboarding, first-run hints |
| **Resume** | Restores **last run seed + biome** to hub | True **mid-run resume** via `GameStateSerializer` (see §5) |
| **Hub** | Voxel hub + docks + Set Sail + **4 NPCs** + **building upgrades** + **NPC dialogue** | NPC shop transactions (buy/sell flow), building unlock effects |
| **Island select** | **`IslandSelectView`** — biome grid with difficulty badges, dock-gated choices | Wire docks upgrade level to `maxChoices` prop |
| **Progression** | Tome unlocks + run history + **SQLite production adapter** | Verify migrations on device; corrupt-save handled |
| **Death / victory** | React overlays in `GameView` with **auto-focus** | Match spec copy, unlock messaging, return flow |
| **Accessibility** | **DONE** — skip-nav, ARIA roles/labels, focus traps, screen reader announcer, reduced motion, contrast audit, 44px touch targets | Ongoing a11y testing on real devices |

---

## 2. Content (data-driven)

| Area | Status | Remaining work |
|------|--------|----------------|
| **Biomes** | All 8 biomes in registry + **island select UI** | Balance terrain params per biome |
| **Enemies / bosses / weapons** | Full 16 enemies + 8 bosses + 15 weapons in registry, **79 GLB models** | Balance passes; boss phase tuning |
| **Loot / crafting** | Tables + systems + **CraftingModal** + **LootNotification** + **InventoryModal** | Wire buy/sell transactions; crafting resource consumption |
| **Hub content** | 5 buildings + 4 NPCs + recipes + **NPC dialogue panels** | Upgrade effects on gameplay |

---

## 3. Architecture & code health

| Area | Status | Remaining work |
|------|--------|----------------|
| **Primary runtime** | ~~Converge dual stack~~ **DONE** — React is sole UI/orchestration layer | — |
| **HUD** | **DONE** — HealthBar, Hotbar, Minimap, DamageIndicator, BuildingInteraction, NPCDialogue, ScreenReaderAnnouncer | — |
| **Barrel imports** | Enforced in `AGENTS.md` | Audit for deep imports across domains |
| **Lint** | **68 warnings** (down from 101); `noExplicitAny` reduced by 15, `noStaticOnlyClass` suppressed | Continue reducing `any` in remaining files |
| **Bundle size** | **DONE** — manual chunks (vendor-react, vendor-three, vendor-engine, vendor-game, vendor-audio, content) + lazy-loaded views. No chunk warnings. | — |

---

## 4. Platform (web + native)

| Area | Status | Remaining work |
|------|--------|----------------|
| **Web** | **DONE** — `vite-plugin-pwa` with service worker, offline caching, GLB runtime cache | Verify SW on production deploy |
| **Capacitor** | **`capacitor.config.ts`** + enhanced `PlatformBridge` (orientation, haptics, status bar) | **Release builds** iOS/Android: signing, store metadata |
| **SQLite** | **`CapacitorDatabase`** adapter + platform-aware `createDatabase()` factory | **E2E on hardware** |
| **Status bar / orientation / haptics** | **`PlatformBridge`** interface with all 3 features | Platform QA matrix |

---

## 5. Persistence & saves

| Area | Status | Remaining work |
|------|--------|----------------|
| **Run history** | Persisted via `SaveManager` + **`CapacitorDatabase`** production adapter | Verify on real device |
| **Tome / unlocks** | `TomeProgression` + unlocks table | Full round-trip UI + export/import if in scope |
| **Mid-run save** | **`GameStateSerializer`** — full data contract (v1), validate/stringify/parse, 22 tests | Wire engine snapshot extraction (Koota/Yuka → serialized state) |
| **Resume semantics** | Last seed+biome → hub | Implement **continue same island** via mid-run save |

---

## 6. Rendering & audio

| Area | Status | Remaining work |
|------|--------|----------------|
| **GLB models** | **79 GLBs** in `public/models/`, all content IDs mapped | LOD/perf on low-end |
| **Audio** | **DONE** — Tone.js + SpatialAudio (Panner3D) + AudioFacade | Compression, mobile autoplay policies |
| **Effects** | Particles, day/night, etc. | Performance budget, quality settings |

---

## 7. AI & combat

| Area | Status | Remaining work |
|------|--------|----------------|
| **Enemy AI** | Yuka FSM + steering | Playtest edge cases, boss phases vs content |
| **Player governor** | GOAP assist, **11 tests**, 2 bug fixes | Tune; expose toggles in settings if needed |
| **Combat feel** | Contact + systems | Local polish and difficulty tuning |

---

## 8. Quality assurance

| Area | Status | Remaining work |
|------|--------|----------------|
| **Unit tests** | **235 passing** (`pnpm test`) across 36 files | Keep coverage on public APIs |
| **Browser tests** | ContextIndicator, HealthBar, PauseMenu, App integration browser tests | Full journey: menu → hub → game → end state |
| **Device QA** | Manual | Phones/tablets: touch, safe areas, thermal throttling |
| **CI** | **`.github/workflows/ci.yml`** — typecheck, lint, test, build, browser-tests | Verify on first PR run; tune browser-test stability |

---

## 9. Operations & release

| Area | Status | Remaining work |
|------|--------|----------------|
| **Versioning** | **v0.2.0** + `CHANGELOG.md` + `src/shared/version.ts` + `VersionBadge` component | Automate with release script |
| **Error reporting** | **`ErrorBoundary`** + **`globalErrorHandler`** (window error/unhandledrejection) | Optional Sentry/Crashlytics |
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

Manual: smoke **menu → Pen New Tale → island select → sailing → island**, plus **Resume Chapter** after at least one completed run record.

---

## Revision

Update this file when major features land or scope changes. **Last updated:** 2026-03-21.
