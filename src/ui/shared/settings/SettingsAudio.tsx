/**
 * Audio settings tab — master, ambient, interaction volumes + mute toggle.
 * Props-in, callbacks-out pattern. No direct DB/store access.
 */

interface AudioSettingsProps {
	masterVolume: number;
	ambientVolume: number;
	interactionVolume: number;
	muted: boolean;
	onMasterVolume: (value: number) => void;
	onAmbientVolume: (value: number) => void;
	onInteractionVolume: (value: number) => void;
	onMuted: (value: boolean) => void;
}

export function SettingsAudio({
	masterVolume,
	ambientVolume,
	interactionVolume,
	muted,
	onMasterVolume,
	onAmbientVolume,
	onInteractionVolume,
	onMuted,
}: AudioSettingsProps) {
	return (
		<div data-testid="settings-audio" className="space-y-4">
			<VolumeSlider label="Master Volume" value={masterVolume} onChange={onMasterVolume} />
			<VolumeSlider label="Ambient Volume" value={ambientVolume} onChange={onAmbientVolume} />
			<VolumeSlider label="Interaction Volume" value={interactionVolume} onChange={onInteractionVolume} />
			<MuteToggle muted={muted} onMuted={onMuted} />
		</div>
	);
}

function VolumeSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
	return (
		<div
			className="flex justify-between items-center px-3 py-3 rounded"
			style={{ background: "rgba(255,255,255,0.03)" }}
		>
			<span className="text-sm" style={{ color: "var(--color-bok-parchment)", opacity: 0.85 }}>
				{label}
			</span>
			<div className="flex items-center gap-3 flex-1 ml-4">
				<input
					type="range"
					min={0}
					max={100}
					step={5}
					value={value}
					onChange={(e) => onChange(Number(e.target.value))}
					className="range range-xs flex-1"
					style={{ accentColor: "var(--color-bok-gold)" }}
					aria-label={label}
				/>
				<span className="font-mono text-xs w-8 text-right" style={{ color: "var(--color-bok-gold)" }}>
					{value}
				</span>
			</div>
		</div>
	);
}

function MuteToggle({ muted, onMuted }: { muted: boolean; onMuted: (v: boolean) => void }) {
	return (
		<div
			className="flex justify-between items-center px-3 py-3 rounded"
			style={{ background: "rgba(255,255,255,0.03)" }}
		>
			<span className="text-sm" style={{ color: "var(--color-bok-parchment)", opacity: 0.85 }}>
				Mute All
			</span>
			<button
				type="button"
				role="switch"
				aria-checked={muted}
				onClick={() => onMuted(!muted)}
				className="px-4 py-1.5 min-h-[44px] rounded text-xs font-display tracking-wider uppercase transition-colors"
				style={
					muted
						? { background: "rgba(201,168,76,0.2)", color: "var(--color-bok-gold)" }
						: { background: "rgba(255,255,255,0.04)", color: "var(--color-bok-parchment)", opacity: 0.7 }
				}
			>
				{muted ? "On" : "Off"}
			</button>
		</div>
	);
}
