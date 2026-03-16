import type { World } from "koota";
import { BLOCKS, ITEMS } from "../../world/blocks.ts";
import { Hotbar, Inventory, MiningState, PlayerTag, QuestProgress, ToolSwing } from "../traits/index.ts";

/** Hit result from the block highlight raycaster */
export interface BlockHit {
	x: number;
	y: number;
	z: number;
	id: number;
}

/** Side-effect callbacks passed in by the engine bridge */
export interface MiningSideEffects {
	removeBlock: (x: number, y: number, z: number) => void;
	spawnParticles: (x: number, y: number, z: number, color: string, count: number) => void;
}

/**
 * Full mining system — advances mining progress, handles tool multipliers,
 * breaks blocks, adds to inventory, and tracks quest progress.
 *
 * Receives the raycaster hit externally (from BlockHighlightBehavior) and
 * side-effect callbacks (from the engine bridge) to stay decoupled from
 * Jolly Pixel rendering concerns.
 */
export function miningSystem(world: World, dt: number, hit: BlockHit | null, effects: MiningSideEffects) {
	world
		.query(PlayerTag, MiningState, Inventory, Hotbar, ToolSwing, QuestProgress)
		.updateEach(([mining, inv, hotbar, toolSwing, quest]) => {
			// Update mining target from raycaster
			if (hit) {
				mining.targetX = hit.x;
				mining.targetY = hit.y;
				mining.targetZ = hit.z;
			}

			if (!mining.active || !hit) {
				mining.progress = 0;
				return;
			}

			const targetKey = `${hit.x},${hit.y},${hit.z}`;
			if (mining.targetKey !== targetKey) {
				mining.progress = 0;
				mining.targetKey = targetKey;
			}

			// Tool multiplier — only applies when tool matches block type
			const slot = hotbar.slots[hotbar.activeSlot];
			let speedMult = 1;
			if (slot && slot.type === "item") {
				const item = ITEMS[slot.id];
				if (item) {
					const blockDef = BLOCKS[hit.id];
					if (blockDef && item.target === blockDef.name) {
						speedMult = item.power;
					}
				}
			}

			const blockDef = BLOCKS[hit.id];
			const hardness = blockDef?.hardness ?? 1.0;
			const mineTime = Math.max(0.1, hardness / speedMult);
			mining.progress += dt / mineTime;

			// Swing animation + hit particles while mining
			if (mining.progress < 1.0) {
				toolSwing.progress = 1.0;
				if (blockDef) {
					effects.spawnParticles(hit.x, hit.y, hit.z, blockDef.color, 2);
				}
			}

			// Block broken
			if (mining.progress >= 1.0) {
				effects.removeBlock(hit.x, hit.y, hit.z);

				if (blockDef) {
					effects.spawnParticles(hit.x, hit.y, hit.z, blockDef.color, 15);
				}

				// Add to inventory + quest tracking (only if block is known)
				if (blockDef && blockDef.name) {
					addToInventory(inv as unknown as Record<string, number>, blockDef.name);
					const bName = blockDef.name.toLowerCase();
					if (quest.step === 0 && bName === "wood") quest.progress++;
					if (quest.step === 2 && bName === "stone") quest.progress++;
				}
				mining.progress = 0;
				mining.active = false;
			}
		});
}

export function addToInventory(inventory: Record<string, number>, blockName: string) {
	const key = blockName.toLowerCase();
	if (!(key in inventory)) {
		inventory[key] = 0;
	}
	inventory[key] += 1;
}
