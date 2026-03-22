/**
 * @module hooks/useBuildingEffects
 * @role Derive gameplay effects from current hub building levels
 * @input Building levels record (buildingId → level)
 * @output BuildingEffects with starting weapon, island choices, tome multiplier, shop tier, craft tier
 */

export interface BuildingEffects {
  /** Weapon ID the player starts a run with (null = unarmed). */
  startingWeapon: string | null;
  /** Number of island choices shown in the island select screen. */
  maxIslandChoices: number;
  /** Multiplier applied to tome ability power. */
  tomePowerMultiplier: number;
  /** Shop tier available on islands (0=none, 2=basic, 3=full). */
  shopTier: number;
  /** Maximum crafting recipe tier unlocked (0=none, 1=basic, 2=advanced, 3=master). */
  maxCraftingTier: number;
}

/** Map armory level → starting weapon ID. Level 0 = unarmed. */
const ARMORY_WEAPONS: Record<number, string | null> = {
  0: null,
  1: 'wooden-sword',
  2: 'iron-sword',
  3: 'crystal-blade',
  4: 'crystal-blade', // "choice of rare" — defaults to crystal blade
  5: 'crystal-blade', // "choice of any" — defaults to crystal blade
};

/** Map docks level → maxIslandChoices. Level 0 defaults to 1. */
const DOCKS_CHOICES: Record<number, number> = {
  0: 1,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
};

/** Map library level → tome power multiplier. Level 0 defaults to 1.0. */
const LIBRARY_MULTIPLIERS: Record<number, number> = {
  0: 1.0,
  1: 1.2,
  2: 1.4,
  3: 1.6,
  4: 1.8,
  5: 2.0,
};

/** Map market level → shop tier. */
const MARKET_TIERS: Record<number, number> = {
  0: 0,
  1: 0,
  2: 2,
  3: 3,
};

/** Map forge level → max crafting recipe tier. */
const FORGE_TIERS: Record<number, number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
};

/**
 * Compute gameplay effects from current building levels.
 *
 * Pure function — no hooks, no side effects. Called from React components
 * that track building levels via useHubBuildings.
 */
export function computeBuildingEffects(buildingLevels: Record<string, number>): BuildingEffects {
  const armoryLevel = buildingLevels.armory ?? 0;
  const docksLevel = buildingLevels.docks ?? 0;
  const libraryLevel = buildingLevels.library ?? 0;
  const marketLevel = buildingLevels.market ?? 0;
  const forgeLevel = buildingLevels.forge ?? 0;

  return {
    startingWeapon: ARMORY_WEAPONS[armoryLevel] ?? null,
    maxIslandChoices: DOCKS_CHOICES[docksLevel] ?? 1,
    tomePowerMultiplier: LIBRARY_MULTIPLIERS[libraryLevel] ?? 1.0,
    shopTier: MARKET_TIERS[marketLevel] ?? 0,
    maxCraftingTier: FORGE_TIERS[forgeLevel] ?? 0,
  };
}
