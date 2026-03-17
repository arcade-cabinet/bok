/**
 * TravelConfirm — diegetic travel confirmation dialog.
 * Shows destination coordinates, crystal dust cost, confirm/cancel.
 * Styled to match the Bok parchment aesthetic.
 */

export interface TravelConfirmProps {
	/** Destination block position. */
	destX: number;
	destY: number;
	destZ: number;
	/** Crystal dust cost for this travel. */
	cost: number;
	/** Player's current crystal dust count. */
	dustAvailable: number;
	/** Called when player confirms travel. */
	onConfirm: () => void;
	/** Called when player cancels. */
	onCancel: () => void;
}

export function TravelConfirm({ destX, destY, destZ, cost, dustAvailable, onConfirm, onCancel }: TravelConfirmProps) {
	const canAfford = dustAvailable >= cost;

	return (
		<div
			className="flex flex-col items-center gap-3 p-4 rounded-lg"
			style={{
				background: "var(--color-bok-parchment, #d4c4a0)",
				border: "2px solid var(--color-bok-gold, #c9a84c)",
				boxShadow: "0 0 20px rgba(201,168,76,0.2)",
			}}
			data-testid="travel-confirm"
			role="dialog"
			aria-modal="true"
			aria-label="Confirm fast travel"
		>
			<h3
				className="font-display text-sm tracking-[0.1em] uppercase"
				style={{ color: "var(--color-bok-ink, #2a1f14)" }}
			>
				ᚱ Raido — Journey
			</h3>

			<p className="text-xs font-body text-center" style={{ color: "var(--color-bok-ink, #2a1f14)" }}>
				Travel to runestone at ({destX}, {destY}, {destZ})?
			</p>

			<div
				className="flex items-center gap-2 text-xs font-body"
				style={{ color: canAfford ? "var(--color-bok-ink, #2a1f14)" : "#8b0000" }}
				data-testid="travel-cost"
			>
				<span>Cost: {cost} Crystal Dust</span>
				<span className="opacity-60">({dustAvailable} available)</span>
			</div>

			<div className="flex gap-2 mt-1">
				<button
					type="button"
					onClick={onConfirm}
					disabled={!canAfford}
					className="px-4 py-1.5 min-h-[44px] rounded font-display text-xs tracking-[0.1em] uppercase transition-opacity"
					style={{
						background: canAfford ? "var(--color-bok-gold, #c9a84c)" : "#999",
						color: canAfford ? "var(--color-bok-ink, #2a1f14)" : "#666",
						opacity: canAfford ? 1 : 0.5,
						cursor: canAfford ? "pointer" : "not-allowed",
					}}
					data-testid="travel-confirm-btn"
				>
					Travel
				</button>
				<button
					type="button"
					onClick={onCancel}
					className="px-4 py-1.5 min-h-[44px] rounded font-display text-xs tracking-[0.1em] uppercase"
					style={{
						background: "transparent",
						color: "var(--color-bok-ink, #2a1f14)",
						border: "1px solid var(--color-bok-gold, #c9a84c)",
					}}
					data-testid="travel-cancel-btn"
				>
					Cancel
				</button>
			</div>
		</div>
	);
}
