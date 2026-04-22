---
title: State
updated: 2026-04-09
status: current
domain: context
---

# State — Bok: The Builder's Tome

Current development state as of 2026-04-09.

## What Is Done

The game is **playable end-to-end** on web and iOS. All major systems are implemented and tested.

### Product & UX

- Main flow: Menu → Hub → Island Select → Sailing → Game → Death/Victory — DONE
- Resume: Last-run resume + mid-run "Continue Adventure" — DONE
- Hub: 4 NPCs (Blacksmith, Scholar, Shopkeeper, Navigator), 5 upgradeable buildings — DONE
- Island select: Biome grid with difficulty, dock-gated choices — DONE
- Progression: Tome unlocks + run history + SQLite production adapter + building effects — DONE
- Death/victory screens: Polished with lore messages, stats, tome unlock animation — DONE
- Accessibility: Full a11y — skip-nav, ARIA, focus traps, screen reader, reduced motion, contrast — DONE
- Onboarding: 6-step tutorial, contextual hints, discovery inscriptions, tome unlock banner — DONE

### Content

- 8 biomes with distinct terrain, block palettes, and enemies — DONE (171 balance tests)
- 16 enemy types + 8 bosses — DONE
- 15 weapons — DONE
- Hub: 5 buildings, 4 NPCs, forge-gated crafting recipes — DONE

### Architecture & Code Health

- React 19 as sole UI layer (menu, HUD, modals, overlays) — DONE
- JollyPixel engine decomposed into focused modules — DONE
- Barrel imports enforced — 0 violations — DONE
- Lint: 0 errors, 0 warnings — DONE
- Bundle: well-split chunks, lazy-loaded views — DONE

### Platform

- Web PWA with service worker and offline caching — DONE
- Capacitor config + PlatformBridge (orientation, haptics, status bar) — DONE
- SQLite: CapacitorDatabase adapter + createDatabase factory — DONE
- Audio: Tone.js compressor, mobile autoplay resume — DONE

### Quality Assurance

- 1069 unit tests passing (88 files) — DONE
- Browser tests: all 23 React components covered — DONE
- Content validation: 171 balance tests — DONE
- CI pipeline: typecheck, lint, test, browser-tests, build — DONE

## What Remains for Release

Only hardware/external-service work:

1. **Capacitor release builds** — iOS/Android code signing, store metadata (App Store / Play Store)
2. **Device E2E** — SQLite on real devices, touch/safe-area testing on phones and tablets
3. **Store listings** — App Store / Play Store descriptions, screenshots, age ratings
4. **Optional: Sentry/Crashlytics** — production error reporting service (stubs exist)

## Active Branch

`feat/full-game-overhaul` — contains the full v2 implementation. This branch merges into `main` via PR.

## Version

v0.2.0 — see `CHANGELOG.md` for release notes.
