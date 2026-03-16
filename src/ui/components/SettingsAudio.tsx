/**
 * Audio settings tab — master, music, and SFX volume sliders.
 * Props-in, callbacks-out pattern. No direct DB access.
 */

interface AudioSettingsProps {
	masterVolume: number;
	musicVolume: number;
	sfxVolume: number;
	onMasterVolume: (value: number) => void;
	onMusicVolume: (value: number) => void;
	onSfxVolume: (value: number) => void;
}

export function SettingsAudio({
	masterVolume,
	musicVolume,
	sfxVolume,
	onMasterVolume,
	onMusicVolume,
	onSfxVolume,
}: AudioSettingsProps) {
	return (
		<div className="space-y-4">
			<VolumeSlider label="Master Volume" value={masterVolume} onChange={onMasterVolume} />
			<VolumeSlider label="Music Volume" value={musicVolume} onChange={onMusicVolume} />
			<VolumeSlider label="SFX Volume" value={sfxVolume} onChange={onSfxVolume} />
		</div>
	);
}

function VolumeSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
	return (
		<div
			className="flex justify-between items-center px-3 py-3 rounded"
			style={{ background: "rgba(255,255,255,0.03)" }}
		>
			<span className="text-sm" style={{ color: "var(--color-bok-parchment)", opacity: 0.7 }}>
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
