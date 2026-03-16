import { BLOCKS, ITEMS, BlockId } from "../../world/blocks.ts";
import type { HotbarSlot, InventoryData } from "../../ecs/traits/index.ts";

interface HotbarDisplayProps {
  slots: (HotbarSlot | null)[];
  activeSlot: number;
  inventory: InventoryData;
  onSlotClick: (index: number) => void;
}

const PLACEABLE_BLOCKS: Record<string, keyof InventoryData> = {
  Wood: "wood",
  Dirt: "dirt",
  Grass: "grass",
  Sand: "sand",
  Stone: "stone",
  Planks: "planks",
  Torch: "torches",
  Stonebricks: "stonebricks",
  Glass: "glass",
};

export function HotbarDisplay({ slots, activeSlot, inventory, onSlotClick }: HotbarDisplayProps) {
  return (
    <div className="glass-panel flex gap-1.5 p-2">
      {slots.map((slot, i) => {
        const isActive = i === activeSlot;
        return (
          <button
            key={i}
            onClick={() => onSlotClick(i)}
            className={`
              relative w-12 h-12 rounded-lg flex items-center justify-center
              border-2 transition-all duration-100 cursor-pointer
              ${isActive
                ? "border-amber-400 -translate-y-1.5 shadow-[0_4px_15px_rgba(255,215,0,0.2),inset_0_0_15px_rgba(255,255,255,0.1)]"
                : "border-black/50 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
              }
            `}
            style={{
              background: slot ? getSlotBackground(slot) : "rgba(255,255,255,0.02)",
            }}
          >
            {slot && slot.type === "item" && (
              <div
                className="w-4 h-4 rounded-sm rotate-45"
                style={{ background: ITEMS[slot.id]?.color || "#888" }}
              />
            )}
            {slot && slot.type === "block" && getBlockQty(slot, inventory) > 0 && (
              <span className="absolute bottom-0.5 right-1 text-xs font-extrabold text-white"
                style={{ textShadow: "1px 1px 0 #000, -1px -1px 0 #000" }}
              >
                {getBlockQty(slot, inventory)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function getSlotBackground(slot: HotbarSlot): string {
  if (slot.type === "block") {
    if (slot.id === BlockId.Torch) return "linear-gradient(45deg, #5D4037 50%, #FFD700 50%)";
    return BLOCKS[slot.id]?.color || "#444";
  }
  return "rgba(255,255,255,0.05)";
}

function getBlockQty(slot: HotbarSlot, inventory: InventoryData): number {
  if (slot.type !== "block") return 0;
  const block = BLOCKS[slot.id];
  if (!block) return 0;
  const invKey = PLACEABLE_BLOCKS[block.name];
  return invKey ? (inventory[invKey] as number) || 0 : 0;
}
