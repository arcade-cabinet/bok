# Bok: The Builder's Tome

A roguelike island-hopping voxel adventure built with JollyPixel, Koota, and Yuka.

## Quick Start

```bash
pnpm install
pnpm dev
```

Open the URL Vite prints (default http://localhost:5173). UI fonts are full `@fontsource/*` bundles in `src/fonts.css` (Cormorant Garamond, Cinzel, Crimson Text, JetBrains Mono — all subsets/weights shipped by those packages). No Google Fonts CDN at runtime.

## Documentation

- [docs/PRODUCTION_ROADMAP.md](docs/PRODUCTION_ROADMAP.md) — **Remaining work for a production release** (checklist)
- [DESIGN.md](DESIGN.md) — Game design overview
- [ARCHITECTURE.md](ARCHITECTURE.md) — Technical architecture
- [CONTRIBUTING.md](CONTRIBUTING.md) — How to contribute
- [AGENTS.md](AGENTS.md) — For AI agents working on this codebase
- [SECURITY.md](SECURITY.md) — Security considerations
- [CLAUDE.md](CLAUDE.md) — Project state and conventions for AI tools

### Planning (historical / incremental)

- [docs/superpowers/plans/2026-03-21-react-refactor-and-completion.md](docs/superpowers/plans/2026-03-21-react-refactor-and-completion.md)
- [docs/superpowers/plans/2026-03-20-bok-implementation.md](docs/superpowers/plans/2026-03-20-bok-implementation.md)

## Tech Stack

- **Engine:** JollyPixel (ECS + voxel renderer)
- **UI:** React 19 + Tailwind CSS 4 + Framer Motion
- **State:** Koota (data-oriented ECS)
- **AI:** Yuka (steering, FSM, pathfinding)
- **Physics:** Rapier3D
- **Platform:** Capacitor (web, iOS, Android)
- **Build:** Vite + TypeScript (pnpm)
- **Test:** Vitest (unit) + Vitest browser (Playwright)

### Verify before merging

```bash
pnpm run typecheck && pnpm run lint && pnpm test && pnpm run test:browser && pnpm run build
```

## License

MIT
