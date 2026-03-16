/**
 * Display settings tab — render distance, vitals toggle, quality preset.
 * Props-in, callbacks-out pattern. No direct ECS or DB access.
 */

interface DisplaySettingsProps {
	showVitals: boolean;
	renderDistance: number;
	onToggleVitals: (value: boolean) => void;
	onRenderDistance: (value: number) => void;
}

export function SettingsDisplay({
	showVitals,
	renderDistance,
	onToggleVitals,
	onRenderDistance,
}: DisplaySettingsProps) {
	return (
		<div className="space-y-4">
			<SettingRow label="Show Vitals Bars">
				<label className="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						className="toggle toggle-sm"
						checked={showVitals}
						onChange={(e) => onToggleVitals(e.target.checked)}
						style={{ accentColor: "var(--color-bok-gold)" }}
					/>
					<span className="text-xs opacity-50" style={{ color: "var(--color-bok-parchment)" }}>
						{showVitals ? "Visible" : "Hidden"}
					</span>
				</label>
			</SettingRow>

			<SettingRow label="Render Distance">
				<div className="flex items-center gap-3 w-full">
					<input
						type="range"
						min={2}
						max={5}
						step={1}
						value={renderDistance}
						onChange={(e) => onRenderDistance(Number(e.target.value))}
						className="range range-xs flex-1"
						style={{ accentColor: "var(--color-bok-gold)" }}
						aria-label="Render distance"
					/>
					<span className="font-mono text-xs w-12 text-right" style={{ color: "var(--color-bok-gold)" }}>
						{renderDistance} chunks
					</span>
				</div>
			</SettingRow>
		</div>
	);
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div
			className="flex justify-between items-center px-3 py-3 rounded"
			style={{ background: "rgba(255,255,255,0.03)" }}
		>
			<span className="text-sm" style={{ color: "var(--color-bok-parchment)", opacity: 0.7 }}>
				{label}
			</span>
			<div className="flex-1 ml-4">{children}</div>
		</div>
	);
}
