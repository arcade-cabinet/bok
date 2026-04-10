---
title: Changelog
updated: 2026-04-09
status: current
domain: ops
---

# Changelog

All notable changes to Bok: The Builder's Tome will be documented in this file.

## [0.2.0] - 2026-03-21

### Added
- React 19 as sole UI layer (menu, HUD, overlays, modals)
- JollyPixel voxel engine integration with Rapier3D physics
- Koota ECS for game state management
- Yuka AI with GOAP player governor
- 8 biomes with procedural terrain generation
- 16 enemy types + 8 bosses with unique AI patterns
- 15 weapons with melee and ranged combat
- Hub island with 5 upgradeable buildings
- Tome progression system (boss kills → permanent abilities)
- Crafting recipes and loot table system
- Tone.js spatial audio with HRTF panning
- Mobile touch controls with virtual joystick
- Sailing transition scene
- 79 GLB models from asset library
- Vitest browser tests with Playwright
- CI/CD pipeline (typecheck, lint, test, build)
- daisyUI v5 parchment theme
- PWA support with offline caching
- Capacitor configuration for iOS/Android
- React error boundary with parchment-styled fallback UI
- Global error handler for uncaught errors and unhandled rejections
- Version badge component

### Fixed
- SaveManager crash safety on corrupted JSON
- DoT tick calculation using floor-based boundary crossing
- Combat blocking minimum damage (always at least 1)
- PlayerGovernor GOAP goal type and stale goal bugs

## [0.1.0] - 2026-03-20

### Added
- Initial project setup with Vite + TypeScript
- Basic voxel terrain rendering
- Core game loop structure
