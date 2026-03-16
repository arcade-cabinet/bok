---
description: Run full quality gate — lint, typecheck, and test
---

1. Run `pnpm biome check --write .` to fix formatting
2. Run `pnpm tsc -b` to check types
3. Run `pnpm test` to run Vitest
4. Report any failures with file:line references
