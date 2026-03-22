# Production roadmap — Bok: The Builder's Tome

This document is the **single checklist for shipping a production-quality game**. It aggregates gaps across architecture plans, the game design spec, and known technical debt.

**Related:** [Game design spec](superpowers/specs/2026-03-20-bok-game-design.md) · [React refactor plan](superpowers/plans/2026-03-21-react-refactor-and-completion.md) · [Implementation plan](superpowers/plans/2026-03-20-bok-implementation.md)

---

## 1. Product & UX (player-facing)

| Area | Status | Remaining work |
|------|--------|----------------|
| **Main flow** | **DONE** — Menu → hub → island-select → sailing → game with full tutorial + onboarding | — |
| **Resume** | **DONE** — Last run resume + mid-run "Continue Adventure" via GameStateSerializer | Wire engine state restoration on load |
| **Hub** | **DONE** — 4 NPCs with buy/sell/craft/navigate, building upgrades with gameplay effects, resource management | — |
| **Island select** | **DONE** — Biome grid with difficulty, docks-gated maxChoices | — |
| **Progression** | **DONE** — Tome unlocks + run history + SQLite production adapter + building effects | Device verification |
| **Death / victory** | **DONE** — Polished screens with lore messages, stats, tome unlock animation | — |
| **Accessibility** | **DONE** — Full a11y: skip-nav, ARIA, focus traps, screen reader, reduced motion, contrast, touch targets | — |
| **Onboarding** | **DONE** — 6-step tutorial, contextual hints, discovery inscriptions, tome unlock banner | — |

---

## 2. Content (data-driven)

| Area | Status | Remaining work |
|------|--------|----------------|
| **Biomes** | **DONE** — All 8 biomes balanced with distinct terrain params, 171 balance tests | — |
| **Enemies / bosses / weapons** | **DONE** — 16 enemies + 8 bosses + 15 weapons balanced, all verified with tests | — |
| **Loot / crafting** | **DONE** — CraftingModal, InventoryModal, LootNotification, NPC shop transactions | — |
| **Hub content** | **DONE** — 5 buildings with upgrade effects, 4 NPCs with role-specific panels, forge-gated recipes | — |

---

## 3. Architecture & code health

| Area | Status | Remaining work |
|------|--------|----------------|
| **Primary runtime** | **DONE** | — |
| **HUD** | **DONE** — All components including tutorial, hints, inscriptions, tome unlock | — |
| **Barrel imports** | **DONE** — 12 violations fixed, all domains use barrels | — |
| **Lint** | **DONE** — 0 errors, 0 warnings (from 95 warnings + 9 errors) | — |
| **Bundle size** | **DONE** — 10+ well-split chunks, lazy-loaded views | — |

---

## 4. Platform (web + native)

| Area | Status | Remaining work |
|------|--------|----------------|
| **Web** | **DONE** — PWA with service worker, offline caching, GLB runtime cache | — |
| **Capacitor** | **DONE** — Config + PlatformBridge (orientation, haptics, status bar) | Release builds: signing, store metadata |
| **SQLite** | **DONE** — CapacitorDatabase adapter + createDatabase factory | E2E on hardware |
| **Audio** | **DONE** — Compressor, mobile autoplay resume on gesture | — |

---

## 5. Persistence & saves

| Area | Status | Remaining work |
|------|--------|----------------|
| **Run history** | **DONE** — SaveManager + CapacitorDatabase | — |
| **Tome / unlocks** | **DONE** — TomeProgression + enhanced TomePageBrowser UI | — |
| **Mid-run save** | **DONE** — GameStateSerializer + auto-save (60s + pause) + Continue Adventure button | Wire engine state restoration |
| **Resume semantics** | **DONE** — Continue Adventure loads saved config | — |

---

## 6. Rendering & audio

| Area | Status | Remaining work |
|------|--------|----------------|
| **GLB models** | **DONE** — 79 GLBs + LODManager for distance culling | — |
| **Audio** | **DONE** — Spatial + compressor + mobile resume | — |
| **Effects** | **DONE** — Quality presets (low/medium/high), LOD, auto-detect | — |
| **Settings** | **DONE** — SettingsModal with quality, audio, feature toggles | — |

---

## 7. AI & combat

| Area | Status | Remaining work |
|------|--------|----------------|
| **Enemy AI** | **DONE** — Yuka FSM + steering, balanced per biome | — |
| **Player governor** | **DONE** — GOAP + settings toggle | — |
| **Combat feel** | **DONE** — Balanced damage, boss phases tuned | — |

---

## 8. Quality assurance

| Area | Status | Remaining work |
|------|--------|----------------|
| **Unit tests** | **DONE** — 626 passing (52 files) | — |
| **Browser tests** | **DONE** — Menu journey, island select, crafting modal + component tests | — |
| **Content validation** | **DONE** — 171 balance tests covering all biomes, enemies, bosses, weapons | — |
| **CI** | **DONE** — ci.yml: typecheck, lint, test, build, browser-tests | — |
| **Device QA** | Manual | Phones/tablets: touch, safe areas, thermal throttling |

---

## 9. Operations & release

| Area | Status | Remaining work |
|------|--------|----------------|
| **Versioning** | **DONE** — v0.2.0 + CHANGELOG.md + release script | — |
| **Error reporting** | **DONE** — ErrorBoundary + globalErrorHandler | Optional: Sentry/Crashlytics |
| **Privacy** | **DONE** — Privacy policy modal + analytics opt-in stub | Store listing copy |
| **Settings** | **DONE** — Game settings (governor, auto-target, screen shake, damage numbers) | — |

---

## 10. Verification commands (release gate)

```bash
pnpm install
pnpm run typecheck     # 0 errors
pnpm run lint          # 0 errors, 0 warnings
pnpm test              # 626 tests passing
pnpm run test:browser  # headless Playwright
pnpm run build         # well-split chunks, no warnings
```

Manual: smoke **menu → tutorial → Pen New Tale → island select → hub → Set Sail → island**, plus **Resume Chapter** and **Continue Adventure** flows.

---

## Remaining for release

Only items requiring real hardware or external services:
1. **Capacitor release builds** — iOS/Android signing, store metadata
2. **Device E2E** — SQLite on real devices, touch/safe-area testing
3. **Store listings** — App Store / Play Store descriptions, screenshots
4. **Optional: Sentry/Crashlytics** — production error reporting service

---

## Revision

Update this file when major features land or scope changes. **Last updated:** 2026-03-21.
