# Bok

**A mobile-first 4X voxel survival game.**

> *A world remembers those who shape it.*

"Bok" means *book* in Swedish. The world is a living text — every block placed is a word, every structure a sentence, every settlement a chapter. You awaken on stone with no memory. The land stretches endlessly, carved by forces older than memory. What you build here will echo.

## Play

The game runs as a static site — no server needed.

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in a browser. Click to enter. WASD to move, mouse to look, left-click to mine, right-click to place, E for crafting, 1-5 for hotbar, Shift to sprint, Space to jump.

On mobile, touch controls appear automatically — left joystick for movement, right side for camera, buttons for jump and inventory.

## Build & Deploy

```bash
npm run build     # TypeScript check + Vite production build
npm run preview   # Preview the production build locally
```

Deployed automatically to GitHub Pages on push to `main` via the CD workflow.

## Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **ECS** | [Koota](https://github.com/pmndrs/koota) | All gameplay state — traits and systems |
| **Rendering** | [Jolly Pixel](https://jollypixel.dev) + Three.js | Actor/Behavior system, voxel renderer, scene |
| **UI** | React + Tailwind CSS | HUD overlays, menus, screens |
| **Persistence** | @capacitor-community/sqlite | SQLite save slots, player state, voxel deltas |

```
src/
├── ecs/           # Traits (components) and systems (logic)
├── engine/        # Jolly Pixel bridge, behaviors, input
├── world/         # Blocks, terrain, noise, tileset, voxel helpers
├── persistence/   # SQLite database layer
├── ui/            # React screens, HUD, components
├── App.tsx        # Root component + save/load orchestration
└── main.tsx       # Entry point
```

## The Four Pillars

Bok is a 4X game disguised as a voxel sandbox:

- **eXplore** — Procedural biomes, Remnant ruins, creature observation, lore fragments
- **eXpand** — Settlement building, territory effects, workstations, light perimeters
- **eXploit** — Resource chains, creature harvesting, mining depth, crafting tiers
- **eXterminate** — Night threats, territorial creatures, boss events, light as weapon

## Creatures

Creatures are not boxes. They are articulated multi-part beings with procedural animation:

- **Inklings** — Shadow pack hunters, light-averse, dissolve in sunlight
- **Thornbacks** — Armored grazers, curl into defensive balls
- **Pagewyrms** — Tunneling serpents that reshape terrain
- **Glyphwardens** — Ruin sentinels that protect the world's history
- **Hollowfolk** — Spectral watchers that advance only when unobserved
- **The Colophon** — A boss assembled from the world itself

See [docs/world/creatures.md](docs/world/creatures.md) for the full bestiary.

## Documentation

Detailed design and architecture docs live in `docs/`:

| Area | Documents |
|------|-----------|
| **World** | [Lore & Metaphors](docs/world/lore.md) · [Creatures](docs/world/creatures.md) · [Biomes](docs/world/biomes.md) |
| **Gameplay** | [4X Pillars](docs/gameplay/4x-pillars.md) · [Progression](docs/gameplay/progression.md) · [Crafting](docs/gameplay/crafting.md) |
| **Design** | [Mobile-First](docs/design/mobile-first.md) · [Diegetic UI](docs/design/diegetic-ui.md) · [Art Direction](docs/design/art-direction.md) |
| **Architecture** | [ECS (Koota)](docs/architecture/ecs.md) · [Rendering](docs/architecture/rendering.md) · [Persistence](docs/architecture/persistence.md) |

## Contributing

See [AGENTS.md](AGENTS.md) for architecture rules, code standards, and how to add new features. See [CLAUDE.md](CLAUDE.md) for AI agent instructions.

## License

MIT
