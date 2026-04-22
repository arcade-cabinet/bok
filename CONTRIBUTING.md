---
title: Contributing
updated: 2026-04-09
status: current
domain: technical
---

# Contributing to Bok

## Setup
```bash
git clone <repo> && cd bok
pnpm install
pnpm dev
```

Use **pnpm** (see `package.json`). Before opening a PR, run **typecheck, lint, unit tests, browser tests, and production build** — see [README.md](README.md) and [docs/PRODUCTION_ROADMAP.md](docs/PRODUCTION_ROADMAP.md) §10.

## Adding Content
All game content is data-driven JSON. See `src/content/` for examples and `src/content/types.ts` for schemas.

## Code Standards
- TypeScript strict mode
- Barrel exports only — never import internal files across domains
- Tests required for all public APIs
- TDD: write failing test → implement → verify → commit

## Domain Architecture
See [ARCHITECTURE.md](ARCHITECTURE.md) for the three-layer integration model.
