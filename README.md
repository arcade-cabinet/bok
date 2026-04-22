---
title: Bok — The Builder's Tome
updated: 2026-04-09
status: current
domain: product
---

# Bok: The Builder's Tome

A roguelike island-hopping voxel adventure. Sail to procedural islands, fight enemies, defeat bosses, unlock Tome pages (permanent abilities), and build up your Hub Island between runs.

**Platforms:** Web (PWA), iOS, Android (via Capacitor)
**Version:** 0.2.0

## Quick Start

```bash
pnpm install
pnpm dev        # dev server at localhost:5173
```

UI fonts are self-hosted via `@fontsource/*` — no Google Fonts CDN at runtime.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19 + Tailwind CSS 4 + daisyUI v5 + Framer Motion |
| Engine | JollyPixel (ECS, voxel renderer, game loop) |
| State | Koota (data-oriented ECS) |
| AI | Yuka (steering, FSM, GOAP) |
| Physics | Rapier3D |
| Platform | Capacitor 8 (web, iOS, Android) |
| Persistence | @capacitor-community/sqlite |
| Build | Vite 8 + TypeScript (strict, ESM) |
| Test | Vitest + Vitest browser (Playwright) |
| Lint | Biome 2.4 |

## Running Tests

```bash
pnpm test              # 1069 unit tests
pnpm run test:browser  # browser component tests (Playwright)
pnpm run typecheck     # TypeScript strict mode
pnpm run lint          # Biome 2.4
```

## Building

```bash
pnpm run build          # web production build
pnpm run build:mobile   # build + Capacitor sync
pnpm run cap:open:ios   # open iOS project in Xcode
pnpm run cap:open:android
```

## Verification Gate (before merging)

```bash
pnpm run typecheck && pnpm run lint && pnpm test && pnpm run test:browser && pnpm run build
```

## Documentation

- [CLAUDE.md](CLAUDE.md) — Agent entry point, architecture facts, commands
- [AGENTS.md](AGENTS.md) — Extended protocols for AI agents
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System design and data flow
- [docs/DESIGN.md](docs/DESIGN.md) — Game vision, identity, UX principles
- [docs/TESTING.md](docs/TESTING.md) — Testing strategy and coverage guide
- [docs/STATE.md](docs/STATE.md) — Current state, what's done, what's next
- [docs/LORE.md](docs/LORE.md) — World, narrative, characters
- [CHANGELOG.md](CHANGELOG.md) — Release history
- [CONTRIBUTING.md](CONTRIBUTING.md) — How to contribute
- [SECURITY.md](SECURITY.md) — Security considerations

## License

MIT
