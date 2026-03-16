interface BokIndicatorProps {
	/** Whether new saga or quest info is available. */
	hasNewInfo: boolean;
	/** Callback to open the Bok journal. */
	onOpen?: () => void;
}

/**
 * A small rune glyph in the top-right corner that glows when new
 * quest/saga information is available. Replaces the non-diegetic QuestTracker.
 * The ᛒ (Berkanan) rune represents "bok" (book/birch).
 */
export function BokIndicator({ hasNewInfo, onOpen }: BokIndicatorProps) {
	return (
		<button
			type="button"
			data-testid="bok-indicator"
			className={`pointer-events-auto font-display text-2xl transition-all duration-500 ${
				hasNewInfo ? "rune-glow text-[var(--color-bok-gold)]" : "text-white/30"
			}`}
			style={{ textShadow: hasNewInfo ? "0 0 12px var(--color-bok-gold), 0 0 24px var(--color-bok-gold)" : "none" }}
			onClick={onOpen}
			aria-label={hasNewInfo ? "New saga entry available — open Bok" : "Open Bok journal"}
		>
			&#5794;
		</button>
	);
}
