/**
 * SettingsButton — gear icon in the HUD top-right, beside BokIndicator.
 * Opens the settings overlay when tapped/clicked.
 */

interface SettingsButtonProps {
	onOpen: () => void;
}

export function SettingsButton({ onOpen }: SettingsButtonProps) {
	return (
		<button
			type="button"
			data-testid="settings-button"
			onClick={onOpen}
			className="pointer-events-auto min-w-[44px] min-h-[44px] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
			aria-label="Open settings"
		>
			{/* Gear icon via Unicode heavy gear ⚙ */}
			<span className="text-xl" aria-hidden="true">
				&#9881;
			</span>
		</button>
	);
}
