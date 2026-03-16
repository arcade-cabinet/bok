# Bok

A narrative voxel survival game built on **Jolly Pixel**, **Koota ECS**, and **React**.

## Architecture

- **Jolly Pixel Engine** (`@jolly-pixel/engine`) — ECS framework with Actors, Components, and Behaviors on Three.js
- **Jolly Pixel Voxel Renderer** (`@jolly-pixel/voxel.renderer`) — Chunked voxel world with face culling, tilesets, and save/load
- **Jolly Pixel Runtime** (`@jolly-pixel/runtime`) — Web/Electron runtime with Vite, GPU detection, loading screen
- **Koota ECS** — Performant real-time state management for all gameplay state (player, inventory, quests, time)
- **React** — UI layer (HUD, menus, crafting) rendered over the canvas
- **Tailwind CSS** — Utility-first styling

## Project Structure

```
src/
├── ecs/
│   ├── traits/       # Koota traits (Position, Health, Inventory, etc.)
│   └── systems/      # ECS systems (movement, physics, survival, mining, etc.)
├── engine/
│   ├── game.ts       # Core engine bridge (Jolly Pixel <-> Koota)
│   └── input-handler.ts
├── world/
│   ├── blocks.ts     # Block definitions + Jolly Pixel BlockDefinitions
│   ├── noise.ts      # Deterministic simplex noise
│   ├── terrain-generator.ts
│   ├── tileset-generator.ts
│   └── voxel-helpers.ts
├── ui/
│   ├── screens/      # TitleScreen, DeathScreen
│   ├── hud/          # VitalsBar, Hotbar, QuestTracker, Crosshair, etc.
│   └── components/   # CraftingMenu
├── persistence/
│   └── save-manager.ts
├── App.tsx
└── main.tsx
```

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## CI/CD

GitHub Actions workflows:
- **CI** - Type check, lint, and build on every push/PR to main
- **Deploy** - Build and deploy to GitHub Pages on push to main

## Game Features

- Procedural voxel world generation from a seed
- 13 block types with programmatic tileset textures
- Crafting system with 8 recipes
- Survival mechanics (health, hunger, stamina)
- Day/night cycle with hostile mobs at night
- Progressive quest system
- Save/load support via localStorage
- First-person controls with mining and block placement
- Mobile touch controls support

## License

MIT
