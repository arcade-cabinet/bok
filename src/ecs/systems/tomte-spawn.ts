/**
 * Tomte spawn conditions — spawns the tutorial companion after the player
 * builds their first structure, despawns after 3 successful rune inscriptions.
 *
 * The Tomte is a singleton entity (one per world). Module state tracks
 * whether it has been spawned and whether it has retired (teaching complete).
 */

import type { World } from "koota";
import {
	AiType,
	AnimState,
	BehaviorState,
	CreatureAI,
	CreatureAnimation,
	CreatureHealth,
	CreatureTag,
	CreatureType,
	InscriptionLevel,
	PlayerTag,
	Position,
	RuneFaces,
	Species,
} from "../traits/index.ts";

/** Player must build at least this many structures before Tomte appears. */
export const REQUIRED_STRUCTURES = 1;

/** After this many rune inscriptions the Tomte departs. */
export const REQUIRED_INSCRIPTIONS = 3;

/** Spawn offset from player position. */
const SPAWN_OFFSET = 5;

let tomteSpawned = false;
let tomteRetired = false;

/** Count non-zero rune IDs across all inscribed faces. */
export function countRuneInscriptions(faces: Record<string, number[]>): number {
	let count = 0;
	for (const key in faces) {
		const arr = faces[key];
		for (let i = 0; i < arr.length; i++) {
			if (arr[i] !== 0) count++;
		}
	}
	return count;
}

/** Find and destroy the Tomte entity. */
function despawnTomte(world: World): void {
	world.query(CreatureTag, CreatureType).updateEach(([ct], entity) => {
		if (ct.species === Species.Tomte) entity.destroy();
	});
	tomteSpawned = false;
	tomteRetired = true;
}

/**
 * ECS system: manages Tomte lifecycle.
 * - Spawns when player has built >= REQUIRED_STRUCTURES structures.
 * - Despawns when player has inscribed >= REQUIRED_INSCRIPTIONS runes.
 */
export function tomteSpawnSystem(world: World): void {
	if (tomteRetired) return;

	world.query(PlayerTag, Position, InscriptionLevel, RuneFaces).updateEach(
		([pos, inscription, runeFaces]) => {
			const runeCount = countRuneInscriptions(runeFaces.faces);

			// Despawn check: Tomte leaves after player inscribes enough runes
			if (tomteSpawned && runeCount >= REQUIRED_INSCRIPTIONS) {
				despawnTomte(world);
				return;
			}

			// Spawn check: Tomte appears after first structure
			if (!tomteSpawned && inscription.structuresBuilt >= REQUIRED_STRUCTURES) {
				world.spawn(
					CreatureTag,
					Position({ x: pos.x + SPAWN_OFFSET, y: pos.y, z: pos.z + SPAWN_OFFSET }),
					CreatureType({ species: Species.Tomte }),
					CreatureAI({
						aiType: AiType.Passive,
						behaviorState: BehaviorState.Idle,
						targetEntity: -1,
						aggroRange: 0,
						attackRange: 0,
						attackDamage: 0,
						attackCooldown: 0,
						moveSpeed: 1.0,
						detectionRange: 10,
					}),
					CreatureAnimation({ animState: AnimState.Idle, animTimer: 0, variant: 0 }),
					CreatureHealth({ hp: 10, maxHp: 10, velY: 0, meshIndex: -1 }),
				);
				tomteSpawned = true;
			}
		},
	);
}

/** Reset module state (for testing or game restart). */
export function resetTomteSpawnState(): void {
	tomteSpawned = false;
	tomteRetired = false;
}
