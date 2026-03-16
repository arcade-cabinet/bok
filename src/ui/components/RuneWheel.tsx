// ─── Rune Wheel ───
// Radial selection wheel for inscribing runes onto block faces.
// Renders as an arc of rune glyphs around the tap point.
// Mobile-first: drag toward a rune to select it.

import { PLACEABLE_RUNES, RUNES, type RuneIdValue } from "../../ecs/systems/rune-data.ts";

export interface RuneWheelProps {
	/** Whether the wheel is visible. */
	isOpen: boolean;
	/** Callback when a rune is selected. */
	onSelectRune: (runeId: RuneIdValue) => void;
	/** Callback when the wheel is dismissed without selecting. */
	onClose: () => void;
	/** Currently highlighted rune (from drag), or 0 for none. */
	highlightedRune?: number;
	/** Set of discovered rune IDs. If provided, only discovered runes are shown. */
	discoveredRunes?: readonly number[];
}

/** Radius of the rune wheel in pixels. */
const WHEEL_RADIUS = 90;
/** Size of each rune button in pixels. */
const RUNE_SIZE = 44;

export function RuneWheel({ isOpen, onSelectRune, onClose, highlightedRune = 0, discoveredRunes }: RuneWheelProps) {
	if (!isOpen) return null;

	// Filter to only discovered runes when discovery set is provided
	const discoveredSet = discoveredRunes ? new Set(discoveredRunes) : null;
	const visibleRunes = discoveredSet ? PLACEABLE_RUNES.filter((id) => discoveredSet.has(id)) : PLACEABLE_RUNES;

	const runeCount = visibleRunes.length;
	if (runeCount === 0) return null;

	const angleStep = (2 * Math.PI) / runeCount;
	const startAngle = -Math.PI / 2; // Start from top

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Rune selection wheel"
			className="fixed inset-0 z-50 flex items-center justify-center"
			data-testid="rune-wheel"
		>
			{/* Backdrop — tap to dismiss */}
			<div
				className="absolute inset-0 bg-black/30"
				onClick={onClose}
				onKeyDown={(e) => e.key === "Escape" && onClose()}
				data-testid="rune-wheel-backdrop"
				aria-hidden="true"
			/>

			{/* Wheel container */}
			<div className="relative" style={{ width: WHEEL_RADIUS * 2 + RUNE_SIZE, height: WHEEL_RADIUS * 2 + RUNE_SIZE }}>
				{visibleRunes.map((runeId, i) => {
					const def = RUNES[runeId];
					if (!def) return null;

					const angle = startAngle + i * angleStep;
					const cx = WHEEL_RADIUS * Math.cos(angle);
					const cy = WHEEL_RADIUS * Math.sin(angle);
					const isHighlighted = highlightedRune === runeId;

					return (
						<button
							key={runeId}
							type="button"
							className="absolute flex items-center justify-center rounded-full transition-transform duration-100"
							style={{
								width: RUNE_SIZE,
								height: RUNE_SIZE,
								left: `calc(50% + ${cx}px - ${RUNE_SIZE / 2}px)`,
								top: `calc(50% + ${cy}px - ${RUNE_SIZE / 2}px)`,
								backgroundColor: isHighlighted ? def.color : "rgba(20,20,30,0.85)",
								border: `2px solid ${def.color}`,
								color: isHighlighted ? "#000" : def.color,
								transform: isHighlighted ? "scale(1.2)" : "scale(1)",
								boxShadow: isHighlighted ? `0 0 12px ${def.color}` : `0 0 4px ${def.color}40`,
							}}
							onClick={() => onSelectRune(runeId as RuneIdValue)}
							aria-label={`${def.name} — ${def.description}`}
							data-testid={`rune-${def.name.toLowerCase()}`}
						>
							<span className="text-xl font-bold" aria-hidden="true">
								{def.glyph}
							</span>
						</button>
					);
				})}

				{/* Center indicator */}
				<div
					className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
					style={{
						backgroundColor: "rgba(20,20,30,0.9)",
						border: "2px solid rgba(255,215,0,0.5)",
					}}
					aria-hidden="true"
				>
					<span className="text-amber-400 text-xs">✦</span>
				</div>
			</div>
		</div>
	);
}
