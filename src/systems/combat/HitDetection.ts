/**
 * Simple position-distance hit detection.
 * Checks if target is within weapon range of attacker.
 * Rapier raycasts deferred to Phase 3 integration.
 */

export interface HitCheckInput {
  attackerX: number;
  attackerY: number;
  attackerZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  weaponRange: number;
}

/** Returns true if target is within weapon range of attacker. */
export function isInRange(input: HitCheckInput): boolean {
  const dx = input.targetX - input.attackerX;
  const dy = input.targetY - input.attackerY;
  const dz = input.targetZ - input.attackerZ;
  const distSq = dx * dx + dy * dy + dz * dz;
  return distSq <= input.weaponRange * input.weaponRange;
}

/** Calculate squared distance between two 3D points. */
export function distanceSquared(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  return dx * dx + dy * dy + dz * dz;
}
