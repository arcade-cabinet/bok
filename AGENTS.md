# AGENTS.md — Bok: The Builder's Tome

**Shipping scope:** See [docs/PRODUCTION_ROADMAP.md](docs/PRODUCTION_ROADMAP.md) for remaining production work.

## For AI Agents Working on This Codebase

### Import Rules
- **ALWAYS** import from barrel exports: `import { X } from '@bok/systems/combat'`
- **NEVER** import from internal files: `import { X } from '@bok/systems/combat/DamageCalculator'`
- Cross-domain imports go through barrels. Within-domain imports use relative paths.

### Adding a New File
1. Create the file in the appropriate domain directory
2. Add a re-export to the domain's `index.ts` barrel
3. Write tests for the public API in `<domain>/<name>.test.ts`
4. Run `pnpm test` to verify

### Adding Content (Biome/Enemy/Weapon/Boss)
1. Copy an existing JSON from the same `src/content/<type>/` directory
2. Modify the fields per the Zod schema in `src/content/types.ts`
3. Register it in the content registry
4. Run `pnpm test` to validate the schema

### Domain Boundaries
Each domain has ONE role. Do not add cross-cutting concerns:
- Game state → `src/traits/` and `src/relations/`
- Game logic → `src/systems/`
- AI decisions → `src/ai/`
- World generation → `src/generation/`
- Content definitions → `src/content/`
- Rendering → `src/rendering/`
- UI → `src/ui/`
- Persistence → `src/persistence/`

### Custom Agent Roles
- **content-author** — Creates JSON content files from templates
- **domain-reviewer** — Reviews code for barrel export violations and SRP breaches
- **test-enforcer** — Ensures public APIs have test coverage
