import type { InventoryData } from "../../../ecs/inventory.ts";
import { getItemCount } from "../../../ecs/inventory.ts";
import { getMaxDurability } from "../../../ecs/systems/tool-durability.ts";
import type { HotbarSlot } from "../../../ecs/traits/index.ts";
import { BLOCKS, BlockId, ITEMS } from "../../../world/blocks.ts";

interface HotbarDisplayProps {
	slots: (HotbarSlot | null)[];
	activeSlot: number;
	inventory: InventoryData;
	onSlotClick: (index: number) => void;
}

export function HotbarDisplay({ slots, activeSlot, inventory, onSlotClick }: HotbarDisplayProps) {
	return (
		<div className="glass-panel flex gap-1.5 p-2">
			{slots.map((slot, i) => {
				const isActive = i === activeSlot;
				const slotKey = `hotbar-${String(i)}`;
				return (
					<button
						type="button"
						key={slotKey}
						onClick={() => onSlotClick(i)}
						aria-label={slot ? `Hotbar slot ${i + 1}: ${getSlotLabel(slot)}` : `Hotbar slot ${i + 1}: empty`}
						className={`
              relative w-12 h-12 rounded-lg flex items-center justify-center
              border-2 transition-all duration-100 cursor-pointer
              ${
								isActive
									? "border-amber-400 -translate-y-1.5 shadow-[0_4px_15px_rgba(255,215,0,0.2),inset_0_0_15px_rgba(255,255,255,0.1)]"
									: "border-black/50 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
							}
            `}
						style={{
							background: slot ? getSlotBackground(slot) : "rgba(255,255,255,0.02)",
						}}
					>
						{slot && slot.type === "item" && (
							<div className="w-4 h-4 rounded-sm rotate-45" style={{ background: ITEMS[slot.id]?.color || "#888" }} />
						)}
						{slot && slot.type === "block" && getBlockQty(slot, inventory) > 0 && (
							<span
								className="absolute bottom-0.5 right-1 text-xs font-extrabold text-white"
								style={{ textShadow: "1px 1px 0 #000, -1px -1px 0 #000" }}
							>
								{getBlockQty(slot, inventory)}
							</span>
						)}
						{slot && slot.type === "item" && slot.durability !== undefined && (
							<DurabilityBar itemId={slot.id} durability={slot.durability} />
						)}
					</button>
				);
			})}
		</div>
	);
}

function DurabilityBar({ itemId, durability }: { itemId: number; durability: number }) {
	const max = getMaxDurability(itemId) ?? 1;
	const pct = Math.max(0, Math.min(1, durability / max));
	return (
		<div
			className="absolute bottom-0.5 left-1 right-1 h-1 rounded-full overflow-hidden"
			style={{ background: "rgba(0,0,0,0.5)" }}
			data-testid="durability-bar"
		>
			<div
				className="h-full rounded-full"
				style={{
					width: `${pct * 100}%`,
					background: getDurabilityColor(pct),
				}}
				data-testid="durability-fill"
			/>
		</div>
	);
}

function getDurabilityColor(pct: number): string {
	if (pct > 0.5) return "#4ade80"; // green
	if (pct > 0.2) return "#facc15"; // yellow
	return "#ef4444"; // red
}

function getSlotLabel(slot: HotbarSlot): string {
	if (slot.type === "block") return BLOCKS[slot.id]?.name ?? `block ${slot.id}`;
	return ITEMS[slot.id]?.name ?? `item ${slot.id}`;
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
	return getItemCount(inventory, slot.id);
}
