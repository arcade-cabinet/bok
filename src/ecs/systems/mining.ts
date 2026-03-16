import type { World } from "koota";
import {
  PlayerTag,
  MiningState,
  Inventory,
  Hotbar,
  ToolSwing,
  QuestProgress,
} from "../traits/index.ts";
import { BLOCKS, ITEMS } from "../../world/blocks.ts";
import { getVoxelAt } from "../../world/voxel-helpers.ts";

export function miningSystem(world: World, dt: number) {
  world
    .query(PlayerTag, MiningState, Inventory, Hotbar, ToolSwing, QuestProgress)
    .updateEach(([mining, _inventory, hotbar, toolSwing, _quest]) => {
      if (!mining.active) {
        mining.progress = 0;
        return;
      }

      const targetKey = `${mining.targetX},${mining.targetY},${mining.targetZ}`;
      if (mining.targetKey !== targetKey) {
        mining.progress = 0;
        mining.targetKey = targetKey;
      }

      // Get tool multiplier
      const slot = hotbar.slots[hotbar.activeSlot];
      let speedMult = 1;
      if (slot && slot.type === "item") {
        const item = ITEMS[slot.id];
        if (item) {
          speedMult = item.power;
        }
      }

      const blockId = getVoxelAt(mining.targetX, mining.targetY, mining.targetZ);
      const blockMeta = BLOCKS[blockId];
      const hardness = blockMeta?.hardness ?? 1.0;
      const mineTime = Math.max(0.1, hardness / speedMult);
      mining.progress += dt / mineTime;

      if (mining.progress < 1.0) {
        toolSwing.progress = 1.0;
      }

      if (mining.progress >= 1.0) {
        mining.progress = 0;
        mining.active = false;
      }
    });
}

export function addToInventory(
  inventory: Record<string, number>,
  blockName: string
) {
  const key = blockName.toLowerCase();
  if (!(key in inventory)) {
    inventory[key] = 0;
  }
  inventory[key] += 1;
}
