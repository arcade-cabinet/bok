// ─── Material Data ───
// Pure data: material IDs and conductivity lookup for surface rune propagation.
// No ECS, no Three.js — just enums and a lookup table.

/** Material types for the surface rune system. */
export const MaterialId = {
	Air: 0,
	Stone: 1,
	Iron: 2,
	Crystal: 3,
	Copper: 4,
	Wood: 5,
	Dirt: 6,
	Water: 7,
} as const;

export type MaterialIdValue = (typeof MaterialId)[keyof typeof MaterialId];

/**
 * Conductivity factor per material.
 * - 0 = insulator (signal stops)
 * - 0.3–0.5 = poor conductor (high attenuation)
 * - 1.0 = standard conductor
 * - 1.2–1.5 = good/amplifying conductor
 */
const CONDUCTIVITY: Record<MaterialIdValue, number> = {
	[MaterialId.Air]: 0,
	[MaterialId.Stone]: 1.0,
	[MaterialId.Iron]: 1.2,
	[MaterialId.Crystal]: 1.5,
	[MaterialId.Copper]: 1.3,
	[MaterialId.Wood]: 0,
	[MaterialId.Dirt]: 0.3,
	[MaterialId.Water]: 0.5,
};

/** Get conductivity factor for a material (0 = insulator, >0 = conductor). */
export function getConductivity(mat: MaterialIdValue): number {
	return CONDUCTIVITY[mat] ?? 0;
}
