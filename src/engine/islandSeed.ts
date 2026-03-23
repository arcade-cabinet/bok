/**
 * @module engine/islandSeed
 * @role Derive island-specific seeds from base save seed + biome ID
 * @input Base seed (from save), biome ID
 * @output Deterministic island seed string
 */

/**
 * Derive an island-specific seed by combining the save seed with the biome ID.
 * This ensures different biomes on the same save produce different terrain,
 * while the same seed+biome combination is always deterministic.
 */
export function deriveIslandSeed(baseSeed: string, biomeId: string): string {
  return `${baseSeed}:${biomeId}`;
}
