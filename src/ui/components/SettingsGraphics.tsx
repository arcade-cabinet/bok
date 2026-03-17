/**
 * Graphics settings tab — render distance, particle density, shadow quality.
 * Props-in, callbacks-out pattern. No direct ECS or DB access.
 */

const PARTICLE_OPTIONS = [
	{ value: "low", label: "Low" },
	{ value: "medium", label: "Medium" },
	{ value: "high", label: "High" },
];

const SHADOW_OPTIONS = [
	{ value: "off", label: "Off" },
	{ value: "low", label: "Low" },
	{ value: "medium", label: "Medium" },
	{ value: "high", label: "High" },
];

interface GraphicsSettingsProps {
	renderDistance: number;
	particleDensity: string;
	shadowQuality: string;
	onRenderDistance: (value: number) => void;
	onParticleDensity: (value: string) => void;
	onShadowQuality: (value: string) => void;
}

export function SettingsGraphics({
	renderDistance,
	particleDensity,
	shadowQuality,
	onRenderDistance,
	onParticleDensity,
	onShadowQuality,
}: GraphicsSettingsProps) {
	return (
		<div className="space-y-4">
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

			<SettingRow label="Particle Density">
				<OptionButtons options={PARTICLE_OPTIONS} value={particleDensity} onChange={onParticleDensity} />
			</SettingRow>

			<SettingRow label="Shadow Quality">
				<OptionButtons options={SHADOW_OPTIONS} value={shadowQuality} onChange={onShadowQuality} />
			</SettingRow>
		</div>
	);
}

function OptionButtons({
	options,
	value,
	onChange,
}: {
	options: { value: string; label: string }[];
	value: string;
	onChange: (v: string) => void;
}) {
	return (
		<div className="flex gap-1">
			{options.map((opt) => (
				<button
					type="button"
					key={opt.value}
					onClick={() => onChange(opt.value)}
					className="px-3 py-1.5 rounded text-xs font-display tracking-wider uppercase transition-colors"
					style={
						value === opt.value
							? { background: "rgba(201,168,76,0.2)", color: "var(--color-bok-gold)" }
							: { background: "rgba(255,255,255,0.04)", color: "var(--color-bok-parchment)", opacity: 0.5 }
					}
					aria-pressed={value === opt.value}
				>
					{opt.label}
				</button>
			))}
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
