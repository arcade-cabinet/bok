# Claude Code Instructions

Read [AGENTS.md](AGENTS.md) for all project context, architecture rules, and design principles. That file references the `docs/` directory for domain-specific details.

## Quick Reference

- **What is Bok?** A mobile-first 4X voxel survival game. "Bok" = "book" (Swedish). The world is a living text.
- **Stack**: Jolly Pixel + Koota ECS + React + Three.js + Capacitor SQLite
- **Lint/Format**: `npx biome check --write .` (tabs, double quotes, semicolons)
- **Type check**: `npx tsc -b`
- **Dev**: `npm run dev`
- **Build**: `npm run build`

## Key Docs

| What | Where |
|------|-------|
| World/lore/metaphors | `docs/world/lore.md` |
| Creature design | `docs/world/creatures.md` |
| 4X game pillars | `docs/gameplay/4x-pillars.md` |
| Mobile-first design | `docs/design/mobile-first.md` |
| Diegetic UI principles | `docs/design/diegetic-ui.md` |
| ECS architecture | `docs/architecture/ecs.md` |
| Rendering pipeline | `docs/architecture/rendering.md` |
| Save/load system | `docs/architecture/persistence.md` |

## Rules

1. **Mobile-first** — every feature must work on touch before mouse/keyboard
2. **ECS owns state** — rendering reads from Koota, never owns game state
3. **No box creatures** — all creatures are multi-part, procedurally animated
4. **Side-effect pattern** — ECS systems never import Three.js; use callbacks
5. **Run `biome check --write .` and `tsc -b` before committing**
6. **Read the relevant docs/ files before making changes in that domain**
