/**
 * SaveSlotCard — individual save slot card and delete confirmation dialog.
 * Extracted from SaveSlotManager.tsx to keep it under 200 LOC.
 */

import type { SlotPreview } from "./SaveSlotManager.tsx";

const parchment = { color: "var(--color-bok-parchment)" } as const;
const ghost = { background: "rgba(255,255,255,0.06)", ...parchment } as const;

export function SlotCard({
	slot,
	onSelect,
	onRequestDelete,
}: {
	slot: SlotPreview;
	onSelect: (id: number) => void;
	onRequestDelete: (id: number) => void;
}) {
	return (
		<div
			data-testid={`slot-${slot.id}`}
			className="bok-panel p-4 transition-all duration-200 hover:scale-[1.02] flex flex-col gap-1"
		>
			<div className="flex items-center justify-between">
				<button
					data-testid={`slot-name-${slot.id}`}
					type="button"
					onClick={() => onSelect(slot.id)}
					className="font-display text-base tracking-wider text-left bg-transparent border-none cursor-pointer flex-1 p-0"
					style={parchment}
				>
					{slot.name}
				</button>
				<button
					data-testid={`delete-${slot.id}`}
					type="button"
					onClick={() => onRequestDelete(slot.id)}
					className="text-xs opacity-30 hover:opacity-70 transition-opacity px-2"
					style={{ color: "var(--color-bok-ember)" }}
					aria-label={`Delete ${slot.name}`}
				>
					&#x2715;
				</button>
			</div>
			<button
				type="button"
				onClick={() => onSelect(slot.id)}
				data-testid={`slot-preview-${slot.id}`}
				className="flex gap-3 text-xs opacity-50 bg-transparent border-none cursor-pointer text-left p-0"
				style={parchment}
			>
				<span data-testid={`slot-day-${slot.id}`} data-day={slot.dayCount}>
					Day {slot.dayCount}
				</span>
				<span data-testid={`slot-biome-${slot.id}`}>{slot.biome}</span>
				<span data-testid={`slot-inscription-${slot.id}`} data-level={slot.inscriptionLevel}>
					&#x270E; {slot.inscriptionLevel}
				</span>
			</button>
		</div>
	);
}

export function DeleteDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
	return (
		<div
			data-testid="delete-dialog"
			role="alertdialog"
			aria-label="Confirm delete"
			className="bok-panel p-5 flex flex-col items-center gap-4"
			style={{ border: "1px solid rgba(163,69,42,0.3)" }}
		>
			<p className="text-sm text-center" style={parchment}>
				Erase this saga forever? This cannot be undone.
			</p>
			<div className="flex gap-3 w-full">
				<button
					data-testid="cancel-delete"
					type="button"
					onClick={onCancel}
					className="btn flex-1 text-sm"
					style={ghost}
				>
					Keep
				</button>
				<button
					data-testid="confirm-delete"
					type="button"
					onClick={onConfirm}
					className="btn flex-1 text-sm font-display tracking-wider uppercase"
					style={{ background: "var(--color-bok-ember)", ...parchment }}
				>
					Erase
				</button>
			</div>
		</div>
	);
}
