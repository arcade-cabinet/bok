/**
 * Settlement indicator — shows the settlement name and level
 * when the player is standing inside a founded settlement chunk.
 * Fades in/out with a brief transition.
 */

interface SettlementIndicatorProps {
	/** Settlement name (Swedish place name), or null if not in a settlement. */
	name: string | null;
	/** Display name for the settlement level (Hamlet / Village / Town). */
	levelName: string | null;
}

export function SettlementIndicator({ name, levelName }: SettlementIndicatorProps) {
	if (!name || !levelName) return null;

	return (
		<div
			data-testid="settlement-indicator"
			className="absolute top-4 left-4
				bg-stone-800/60 border border-amber-700/40 rounded px-3 py-1.5
				text-amber-200/80 text-xs font-serif
				transition-opacity duration-500 opacity-80"
		>
			<span className="text-amber-400/90 mr-1">&#x2726;</span>
			{name}
			<span className="text-stone-400 ml-1.5">{levelName}</span>
		</div>
	);
}
