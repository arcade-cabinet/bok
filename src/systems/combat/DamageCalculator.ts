/** Input for damage calculation. */
export interface DamageInput {
  weaponBaseDamage: number;
  comboMultiplier: number;
  critMultiplier: number;
  armorReduction: number;
}

/**
 * Pure function: calculate final damage.
 * Formula: floor(weaponBase × comboMultiplier × critMultiplier) - armorReduction
 * Minimum 1 damage (attacks always deal at least 1).
 */
export function calculateDamage(input: DamageInput): number {
  const raw = Math.floor(input.weaponBaseDamage * input.comboMultiplier * input.critMultiplier);
  const afterArmor = raw - input.armorReduction;
  return Math.max(1, afterArmor);
}
