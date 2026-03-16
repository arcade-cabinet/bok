---
title: Memory Bank Protocol
domain: memory-bank
status: current
last-verified: 2026-03-16
depends-on: []
agent-context: all
summary: Session context protocol -- read order, update rules, multi-agent coordination
---

# Memory Bank -- Agent Protocol

This directory contains persistent context that survives between agent sessions. After each session reset, agents rely ENTIRELY on these files to understand the project and continue work effectively.

**Every agent MUST read all memory bank files at the start of EVERY task.** This is not optional.

## Why This Exists

Agent memory resets completely between sessions. The Memory Bank is the ONLY persistent link between work sessions. Without reading these files, agents will:
- Re-discover patterns that are already documented
- Make architectural decisions that contradict established conventions
- Duplicate or conflict with prior work
- Misuse the ECS/rendering separation or violate the side-effect pattern

## File Hierarchy

Files build on each other. Read in this order:

```
projectbrief.md      Foundation -- core identity, Swedish folklore, 4X pillars
    |
productContext.md    Why this exists, who it's for, session design, diegetic UX
    |
systemPatterns.md    Architecture patterns and conventions (ECS, side-effects, file org)
    |
techContext.md       Tech stack, dependencies, known pitfalls
    |
activeContext.md     Current focus, recent changes, decisions, blockers
    |
progress.md          What works, what doesn't, milestones by phase
```

## Read Order (MANDATORY)

1. **AGENTS.md** (this file) -- How to use the memory bank
2. **projectbrief.md** -- Core project identity (Bok = book + beech + rune-carving)
3. **productContext.md** -- User experience goals, session design, diegetic philosophy
4. **systemPatterns.md** -- Architecture patterns (ECS state ownership, side-effect pattern)
5. **techContext.md** -- Technology stack, dependencies, and pitfalls
6. **activeContext.md** -- Current session context (what's being worked on now)
7. **progress.md** -- What works, what doesn't, what's next

## Session Start Protocol (MANDATORY)

Every agent session MUST begin with:

1. Read ALL memory bank files in order above
2. Read root `AGENTS.md` for commands, rules, and file organization
3. Read relevant `docs/` files for the domain you're working in (see table in root AGENTS.md)
4. Verify understanding against the codebase before making changes
5. Check `src/world/blocks.ts` before adding blocks, `src/ecs/traits/index.ts` before adding traits

## Session End Protocol (MANDATORY)

Every agent session MUST end with:

1. Update `activeContext.md` with what was accomplished, decisions made, and blockers
2. Update `progress.md` if implementation status changed
3. Update other files if new patterns, tech changes, or architectural decisions were made
4. Run `pnpm biome check --write .` and `pnpm tsc -b` before committing

## Update Protocol

| File | When to Update | Frequency |
|------|----------------|-----------|
| `activeContext.md` | Start and end of each session. Record what you're working on, decisions made, blockers. | Every session |
| `progress.md` | When milestones are reached -- user stories completed, tests added, bugs fixed. | Per milestone |
| `systemPatterns.md` | When new architectural patterns are established or existing patterns change. | Rare |
| `techContext.md` | When dependencies change -- packages added/removed, versions bumped, build config changes. | Rare |
| `projectbrief.md` | Only when core project identity changes (new biomes, new creatures, new pillars). | Very rare |
| `productContext.md` | Only when product requirements or UX goals change. | Very rare |

## Multi-Agent Coordination

| Agent Role | Required Files | Optional Deep Dives |
|------------|---------------|---------------------|
| **ALL agents** | projectbrief, activeContext | -- |
| **ecs-systems** | systemPatterns, techContext | `docs/architecture/ecs.md` |
| **creature-dev** | systemPatterns, projectbrief | `docs/world/creatures.md`, `docs/architecture/ecs.md` |
| **terrain-gen** | systemPatterns, techContext | `docs/world/biomes.md`, `docs/architecture/rendering.md` |
| **ui-dev** | systemPatterns, techContext | `docs/design/diegetic-ui.md`, `docs/design/mobile-first.md` |
| **rune-systems** | systemPatterns, progress | `docs/gameplay/4x-pillars.md`, `docs/architecture/ecs.md` |
| **persistence** | systemPatterns, techContext | `docs/architecture/persistence.md` |
| **doc-keeper** | ALL files | ALL `docs/` files |

## Relationship to Other Documentation

```
AGENTS.md (project root)          <- Lean entry point for all agents (rules, commands, file org)
    |
CLAUDE.md (project root)          <- Claude Code-specific behavior (quick reference, key docs)
    |
docs/memory-bank/AGENTS.md       <- THIS FILE -- session context protocol
docs/memory-bank/*.md             <- Persistent agent context files
    |
docs/architecture/*.md            <- ECS, rendering, persistence, structures
docs/design/*.md                  <- Mobile-first, diegetic UI, art direction
docs/gameplay/*.md                <- 4X pillars, progression, crafting
docs/world/*.md                   <- Lore, creatures, biomes
```

- **Root `AGENTS.md`**: Quick orientation -- architecture rules, code standards, commands
- **Root `CLAUDE.md`**: Claude Code-specific quick reference and key doc pointers
- **`docs/memory-bank/`** (this dir): Session-persistent context that all agents read
- **`docs/`**: Authoritative deep dives per domain

## Rules

1. **Never delete content** from memory bank files -- append or update in place
2. **Timestamp updates** in activeContext.md so other agents know when context was last refreshed
3. **Keep entries concise** -- bullet points over paragraphs, tables over prose
4. **Cross-reference** source files when mentioning patterns (e.g., "see `src/ecs/systems/creature.ts`")
5. **Flag contradictions** -- if the memory bank disagrees with source code, update the memory bank and note the discrepancy
6. **Memory bank is LEAN** -- detailed explanations belong in `docs/*.md`, not here. Memory bank files should summarize and point to domain docs for depth.
