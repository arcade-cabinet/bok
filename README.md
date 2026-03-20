# Bok: The Builder's Tome

A roguelike island-hopping voxel adventure built with JollyPixel, Koota, and Yuka.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Documentation

- [DESIGN.md](DESIGN.md) — Game design overview
- [ARCHITECTURE.md](ARCHITECTURE.md) — Technical architecture
- [CONTRIBUTING.md](CONTRIBUTING.md) — How to contribute
- [AGENTS.md](AGENTS.md) — For AI agents working on this codebase
- [SECURITY.md](SECURITY.md) — Security considerations

## Tech Stack

- **Engine:** JollyPixel (ECS + voxel renderer)
- **State:** Koota (data-oriented ECS)
- **AI:** Yuka (steering, FSM, pathfinding)
- **Physics:** Rapier3D
- **Platform:** Capacitor (web, iOS, Android)
- **Build:** Vite + TypeScript
- **Test:** Vitest + Playwright

## License

MIT
