# Contributing to Bok

## Setup
```bash
git clone <repo> && cd bok
npm install
npm run dev
```

## Adding Content
All game content is data-driven JSON. See `src/content/` for examples and `src/content/types.ts` for schemas.

## Code Standards
- TypeScript strict mode
- Barrel exports only — never import internal files across domains
- Tests required for all public APIs
- TDD: write failing test → implement → verify → commit

## Domain Architecture
See [ARCHITECTURE.md](ARCHITECTURE.md) for the three-layer integration model.
