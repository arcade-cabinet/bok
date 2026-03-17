/**
 * Save Slot Manager — list, create (with name), delete (with confirmation),
 * and preview save slots (day count, biome, inscription level).
 */

import { useCallback, useState } from "react";

export interface SlotPreview {
	id: number;
	name: string;
	seed: string;
	dayCount: number;
	biome: string;
	inscriptionLevel: number;
	updatedAt: string;
}

interface Props {
	slots: SlotPreview[];
	onSelect: (id: number) => void;
	onCreate: (name: string) => void;
	onDelete: (id: number) => void;
}

const parchment = { color: "var(--color-bok-parchment)" } as const;
const ghost = { background: "rgba(255,255,255,0.06)", ...parchment } as const;

export function SaveSlotManager({ slots, onSelect, onCreate, onDelete }: Props) {
	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState("");
	const [deleteId, setDeleteId] = useState<number | null>(null);

	const handleCreate = useCallback(() => {
		const trimmed = newName.trim();
		if (!trimmed) return;
		onCreate(trimmed);
		setNewName("");
		setCreating(false);
	}, [newName, onCreate]);

	const confirmDelete = useCallback(() => {
		if (deleteId !== null) {
			onDelete(deleteId);
			setDeleteId(null);
		}
	}, [deleteId, onDelete]);

	return (
		<div data-testid="slot-manager" className="flex flex-col gap-4 w-full max-w-md">
			<h2 className="font-display text-xl tracking-[0.15em] uppercase text-center" style={parchment}>
				Sagas
			</h2>

			{slots.length === 0 && (
				<p data-testid="empty-msg" className="text-center text-sm opacity-40" style={parchment}>
					No sagas yet. Begin your first journey.
				</p>
			)}

			{slots.map((s) => (
				<SlotCard key={s.id} slot={s} onSelect={onSelect} onRequestDelete={setDeleteId} />
			))}

			{creating ? (
				<div data-testid="create-form" className="bok-panel p-4 flex flex-col gap-3">
					<label htmlFor="saga-name-input" className="text-xs tracking-wider uppercase opacity-40" style={parchment}>
						Name Your Saga
					</label>
					<input
						id="saga-name-input"
						data-testid="name-input"
						type="text"
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleCreate()}
						className="bok-panel px-3 py-2 bg-transparent outline-none text-center font-display"
						style={{ color: "var(--color-bok-gold)" }}
						placeholder="Enter a name..."
						spellCheck={false}
					/>
					<div className="flex gap-2">
						<button
							data-testid="cancel-create"
							type="button"
							className="btn flex-1 text-sm"
							style={ghost}
							onClick={() => {
								setCreating(false);
								setNewName("");
							}}
						>
							Cancel
						</button>
						<button
							data-testid="confirm-create"
							type="button"
							onClick={handleCreate}
							className="btn flex-1 text-sm font-display tracking-wider uppercase"
							style={{ background: "var(--color-bok-gold)", color: "var(--color-bok-ink)" }}
						>
							Begin
						</button>
					</div>
				</div>
			) : (
				<button
					data-testid="new-saga-btn"
					type="button"
					onClick={() => setCreating(true)}
					className="btn w-full font-display tracking-[0.1em] uppercase"
					style={ghost}
				>
					+ New Saga
				</button>
			)}

			{deleteId !== null && <DeleteDialog onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />}
		</div>
	);
}

// ─── Sub-components ───

function SlotCard({
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

function DeleteDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
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
