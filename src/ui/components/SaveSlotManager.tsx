/**
 * Save Slot Manager — list, create (with name), delete (with confirmation),
 * and preview save slots (day count, biome, inscription level).
 */

import { useCallback, useState } from "react";
import { DeleteDialog, SlotCard } from "./SaveSlotCard.tsx";

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
