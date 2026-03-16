---
description: Check code quality against project standards
---

1. Find all .ts and .tsx files over 200 LOC: `find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn | awk '$1 > 200'`
2. Check for any .tsx files containing game logic (imports from ecs/systems/)
3. Run `pnpm biome check .` and report errors
4. Run `pnpm tsc -b` and report errors
5. Report all violations with recommendations
