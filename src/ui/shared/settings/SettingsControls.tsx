/**
 * Controls settings tab — mouse/touch sensitivity sliders, invert Y toggle.
 * Props-in, callbacks-out pattern.
 */

interface ControlsSettingsProps {
	mouseSensitivity: number;
	touchSensitivity: number;
	invertY: boolean;
	onMouseSensitivity: (value: number) => void;
	onTouchSensitivity: (value: number) => void;
	onInvertY: (value: boolean) => void;
}

export function SettingsControls({
	mouseSensitivity,
	touchSensitivity,
	invertY,
	onMouseSensitivity,
	onTouchSensitivity,
	onInvertY,
}: ControlsSettingsProps) {
	return (
		<div data-testid="settings-controls" className="space-y-4">
			<SensitivitySlider
				label="Mouse Sensitivity"
				value={mouseSensitivity}
				min={0.1}
				max={3.0}
				step={0.1}
				onChange={onMouseSensitivity}
			/>
			<SensitivitySlider
				label="Touch Sensitivity"
				value={touchSensitivity}
				min={0.1}
				max={3.0}
				step={0.1}
				onChange={onTouchSensitivity}
			/>
			<div
				className="flex justify-between items-center px-3 py-3 rounded"
				style={{ background: "rgba(255,255,255,0.03)" }}
			>
				<span className="text-sm" style={{ color: "var(--color-bok-parchment)", opacity: 0.7 }}>
					Invert Y Axis
				</span>
				<label className="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						className="toggle toggle-sm"
						checked={invertY}
						onChange={(e) => onInvertY(e.target.checked)}
						style={{ accentColor: "var(--color-bok-gold)" }}
						data-testid="invert-y-toggle"
					/>
					<span className="text-xs opacity-50" style={{ color: "var(--color-bok-parchment)" }}>
						{invertY ? "Inverted" : "Normal"}
					</span>
				</label>
			</div>
		</div>
	);
}

function SensitivitySlider({
	label,
	value,
	min,
	max,
	step,
	onChange,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	onChange: (v: number) => void;
}) {
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
					min={min}
					max={max}
					step={step}
					value={value}
					onChange={(e) => onChange(Number(e.target.value))}
					className="range range-xs flex-1"
					style={{ accentColor: "var(--color-bok-gold)" }}
					aria-label={label}
				/>
				<span className="font-mono text-xs w-12 text-right" style={{ color: "var(--color-bok-gold)" }}>
					{value.toFixed(1)}x
				</span>
			</div>
		</div>
	);
}
