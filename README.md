# Bok

**A mobile-first 4X voxel survival game rooted in Swedish folklore and craft.**

> *En värld minns de som formar den.*
> *A world remembers those who shape it.*

**Bok** carries three meanings in Swedish: *book*, *beech tree*, and — through Proto-Germanic roots — the act of carving runes into bark. The world is a living saga carved in wood and stone. You awaken in a land that feels like Scandinavia dreaming of itself — birch forests, rocky archipelagos, mountain lakes, and the long dark of midwinter. What you build here becomes part of the story.

## Play

The game runs as a static site — no server needed.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173` in a browser. Click to enter. WASD to move, mouse to look, left-click to mine, right-click to place, E for crafting, 1-5 for hotbar, Shift to sprint, Space to jump.

On mobile, touch controls appear automatically — left joystick for movement, right side for camera, buttons for jump and inventory.

## Build & Deploy

```bash
pnpm build     # TypeScript check + Vite production build
pnpm preview   # Preview the production build locally
```

Deployed automatically to GitHub Pages on push to `main` via the CD workflow.

## Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **ECS** | [Koota](https://github.com/pmndrs/koota) | All gameplay state — traits and systems |
| **Rendering** | [Jolly Pixel](https://jollypixel.dev) + Three.js | Actor/Behavior system, voxel renderer, scene |
| **UI** | React + Tailwind CSS | HUD overlays, menus, screens |
| **Persistence** | @capacitor-community/sqlite | SQLite save slots, player state, voxel deltas |

```text
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

Bok is a 4X game disguised as a Scandinavian voxel sandbox:

- **eXplore** — Six Swedish biomes from meadow to mountain, Fornlämningar (ancient ruins), runestone lore
- **eXpand** — Build your stuga (cottage), attract wildlife, defend with light and rune wards
- **eXploit** — Resource chains rooted in Swedish craft (slöjd), creature harvesting, deep mining
- **eXterminate** — Survive the long dark with light as your weapon, face the Jätten to prove your saga

## Creatures from Swedish Folklore

Creatures are building-block constructions inspired by Scandinavian tradition:

- **Mörker** — The winter darkness given form. Shadow packs that hunt at night, flee from light.
- **Lyktgubbar** — Will-o'-the-wisps that guide (or mislead) through twilight marshes.
- **Skogssniglar** — Armored forest snails with segmented shells. Peaceful grazers.
- **Lindormar** — Wyrms from runestone carvings, tunneling through the earth.
- **Runväktare** — Stone sentinels guarding the old saga's ruins.
- **Draugar** — The restless dead. They advance only when you look away.
- **Vittra** — Underground folk who punish greed and reward offerings.
- **Näcken** — The water spirit. Dangerous to approach, but teaches runes to the respectful.
- **Jätten** — The giant that shaped the land. Your endgame reckoning.

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
