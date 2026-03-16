/**
 * Keybindings settings tab — desktop: click-to-rebind keys, mobile: sensitivity/layout.
 * Uses input-config for runtime bindings and persists changes.
 */

import { useCallback, useEffect, useState } from "react";
import type { InputAction, KeyBindings, MobileConfig } from "../../engine/input-config.ts";
import { actionLabel, DEFAULT_KEYBINDINGS, isMobile, keyLabel } from "../../engine/input-config.ts";

interface KeybindingsProps {
	bindings: KeyBindings;
	mobileConfig: MobileConfig;
	onRebind: (action: InputAction, newKey: string) => void;
	onMobileConfig: (config: Partial<MobileConfig>) => void;
}

/** Actions shown in the keybindings list (desktop). */
const DESKTOP_ACTIONS: InputAction[] = [
	"forward",
	"backward",
	"left",
	"right",
	"jump",
	"sprint",
	"mine",
	"place",
	"eat",
	"inventory",
	"bok",
	"toggleVitals",
	"hotbar1",
	"hotbar2",
	"hotbar3",
	"hotbar4",
	"hotbar5",
];

export function SettingsKeybindings({ bindings, mobileConfig, onRebind, onMobileConfig }: KeybindingsProps) {
	if (isMobile()) {
		return <MobileControls config={mobileConfig} onChange={onMobileConfig} />;
	}
	return <DesktopBindings bindings={bindings} onRebind={onRebind} />;
}

// ─── Desktop: click-to-rebind ───

function DesktopBindings({ bindings, onRebind }: { bindings: KeyBindings; onRebind: KeybindingsProps["onRebind"] }) {
	const [rebinding, setRebinding] = useState<InputAction | null>(null);

	useEffect(() => {
		if (!rebinding) return;

		const onKey = (e: KeyboardEvent) => {
			e.preventDefault();
			if (e.code === "Escape") {
				setRebinding(null);
				return;
			}
			onRebind(rebinding, e.code);
			setRebinding(null);
		};

		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [rebinding, onRebind]);

	const handleReset = useCallback(() => {
		for (const action of DESKTOP_ACTIONS) {
			onRebind(action, DEFAULT_KEYBINDINGS[action]);
		}
	}, [onRebind]);

	return (
		<div className="space-y-1">
			{DESKTOP_ACTIONS.map((action) => (
				<div
					key={action}
					className="flex justify-between items-center px-3 py-2 rounded"
					style={{ background: "rgba(255,255,255,0.03)" }}
				>
					<span className="text-sm" style={{ color: "var(--color-bok-parchment)", opacity: 0.7 }}>
						{actionLabel(action)}
					</span>
					<button
						type="button"
						onClick={() => setRebinding(action)}
						className="font-mono text-xs px-2 py-1 rounded cursor-pointer transition-colors"
						style={
							rebinding === action
								? {
										background: "var(--color-bok-gold)",
										color: "var(--color-bok-ink)",
										border: "1px solid var(--color-bok-gold)",
									}
								: {
										background: "rgba(201,168,76,0.1)",
										color: "var(--color-bok-gold)",
										border: "1px solid rgba(201,168,76,0.2)",
									}
						}
						aria-label={`Rebind ${actionLabel(action)}`}
					>
						{rebinding === action ? "Press key..." : keyLabel(bindings[action])}
					</button>
				</div>
			))}
			<button
				type="button"
				onClick={handleReset}
				className="mt-3 w-full text-xs font-display tracking-[0.1em] uppercase py-2 rounded opacity-50 hover:opacity-80 transition-opacity"
				style={{ color: "var(--color-bok-parchment)", background: "rgba(255,255,255,0.03)" }}
			>
				Reset to Defaults
			</button>
		</div>
	);
}

// ─── Mobile: sensitivity + layout ───

function MobileControls({
	config,
	onChange,
}: {
	config: MobileConfig;
	onChange: (partial: Partial<MobileConfig>) => void;
}) {
	return (
		<div className="space-y-4">
			<SliderRow
				label="Look Sensitivity"
				value={config.lookSensitivity}
				min={0.2}
				max={3.0}
				step={0.1}
				display={`${config.lookSensitivity.toFixed(1)}x`}
				onChange={(v) => onChange({ lookSensitivity: v })}
			/>
			<SliderRow
				label="Joystick Dead Zone"
				value={config.joystickDeadZone}
				min={0.05}
				max={0.4}
				step={0.05}
				display={`${Math.round(config.joystickDeadZone * 100)}%`}
				onChange={(v) => onChange({ joystickDeadZone: v })}
			/>
			<SliderRow
				label="Button Scale"
				value={config.buttonScale}
				min={0.7}
				max={1.5}
				step={0.1}
				display={`${Math.round(config.buttonScale * 100)}%`}
				onChange={(v) => onChange({ buttonScale: v })}
			/>
		</div>
	);
}

function SliderRow({
	label,
	value,
	min,
	max,
	step,
	display,
	onChange,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	display: string;
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
					{display}
				</span>
			</div>
		</div>
	);
}
