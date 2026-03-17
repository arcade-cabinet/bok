/**
 * SettingsPanel — full-screen settings overlay with tab navigation.
 * Wraps Display, Graphics, Audio, Controls, and Keybindings sub-panels.
 * Props-in, callbacks-out. No direct ECS or DB access.
 */

import { useState } from "react";
import type { InputAction, MobileConfig } from "../../engine/input-config.ts";
import type { GameSettings } from "../hooks/useSettings.ts";
import { SettingsAudio } from "./SettingsAudio.tsx";
import { SettingsControls } from "./SettingsControls.tsx";
import { SettingsDisplay } from "./SettingsDisplay.tsx";
import { SettingsGraphics } from "./SettingsGraphics.tsx";
import { SettingsKeybindings } from "./SettingsKeybindings.tsx";

type SettingsTabId = "display" | "graphics" | "audio" | "controls" | "keybindings";

const TABS: { id: SettingsTabId; label: string }[] = [
	{ id: "display", label: "Display" },
	{ id: "graphics", label: "Graphics" },
	{ id: "audio", label: "Audio" },
	{ id: "controls", label: "Controls" },
	{ id: "keybindings", label: "Keys" },
];

interface SettingsPanelProps {
	isOpen: boolean;
	settings: GameSettings;
	onUpdateSetting: <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => void;
	onRebind: (action: InputAction, key: string) => void;
	onMobileConfig: (partial: Partial<MobileConfig>) => void;
	onClose: () => void;
}

export function SettingsPanel({
	isOpen,
	settings,
	onUpdateSetting,
	onRebind,
	onMobileConfig,
	onClose,
}: SettingsPanelProps) {
	const [activeTab, setActiveTab] = useState<SettingsTabId>("display");

	if (!isOpen) return null;

	return (
		<div
			className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto"
			style={{ background: "rgba(0,0,0,0.72)" }}
			role="dialog"
			aria-modal="true"
			aria-label="Settings"
		>
			<div
				className="relative flex flex-col w-full max-w-lg mx-4 rounded-lg overflow-hidden"
				style={{
					background: "var(--color-bok-ink)",
					border: "1px solid rgba(201,168,76,0.25)",
					maxHeight: "90dvh",
				}}
			>
				<SettingsHeader onClose={onClose} />
				<TabBar activeTab={activeTab} onSelect={setActiveTab} />

				<div className="flex-1 overflow-y-auto p-4">
					{activeTab === "display" && (
						<SettingsDisplay
							showVitals={settings.showVitals}
							renderDistance={settings.renderDistance}
							qualityTier={settings.qualityTier}
							onToggleVitals={(v) => onUpdateSetting("showVitals", v)}
							onRenderDistance={(v) => onUpdateSetting("renderDistance", v)}
							onQualityTier={(v) => onUpdateSetting("qualityTier", v)}
						/>
					)}
					{activeTab === "graphics" && (
						<SettingsGraphics
							renderDistance={settings.renderDistance}
							particleDensity={settings.particleDensity}
							shadowQuality={settings.shadowQuality}
							onRenderDistance={(v) => onUpdateSetting("renderDistance", v)}
							onParticleDensity={(v) => onUpdateSetting("particleDensity", v)}
							onShadowQuality={(v) => onUpdateSetting("shadowQuality", v)}
						/>
					)}
					{activeTab === "audio" && (
						<SettingsAudio
							masterVolume={settings.masterVolume}
							ambientVolume={settings.ambientVolume}
							interactionVolume={settings.interactionVolume}
							muted={settings.muted}
							onMasterVolume={(v) => onUpdateSetting("masterVolume", v)}
							onAmbientVolume={(v) => onUpdateSetting("ambientVolume", v)}
							onInteractionVolume={(v) => onUpdateSetting("interactionVolume", v)}
							onMuted={(v) => onUpdateSetting("muted", v)}
						/>
					)}
					{activeTab === "controls" && (
						<SettingsControls
							mouseSensitivity={settings.mouseSensitivity}
							touchSensitivity={settings.touchSensitivity}
							invertY={settings.invertY}
							onMouseSensitivity={(v) => onUpdateSetting("mouseSensitivity", v)}
							onTouchSensitivity={(v) => onUpdateSetting("touchSensitivity", v)}
							onInvertY={(v) => onUpdateSetting("invertY", v)}
						/>
					)}
					{activeTab === "keybindings" && (
						<SettingsKeybindings
							bindings={settings.keybindings}
							mobileConfig={settings.mobileConfig}
							onRebind={onRebind}
							onMobileConfig={onMobileConfig}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── Sub-components ───

function SettingsHeader({ onClose }: { onClose: () => void }) {
	return (
		<div
			className="flex items-center justify-between px-5 py-4"
			style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}
		>
			<span className="text-base font-display tracking-[0.15em] uppercase" style={{ color: "var(--color-bok-gold)" }}>
				Settings
			</span>
			<button
				type="button"
				onClick={onClose}
				className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded text-xl opacity-60 hover:opacity-100 transition-opacity"
				style={{ color: "var(--color-bok-parchment)" }}
				aria-label="Close settings"
			>
				&#10005;
			</button>
		</div>
	);
}

function TabBar({ activeTab, onSelect }: { activeTab: SettingsTabId; onSelect: (id: SettingsTabId) => void }) {
	return (
		<div
			className="flex gap-0 px-2 pt-2"
			role="tablist"
			aria-label="Settings categories"
			style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}
		>
			{TABS.map((tab) => (
				<button
					type="button"
					key={tab.id}
					role="tab"
					aria-selected={activeTab === tab.id}
					onClick={() => onSelect(tab.id)}
					className="px-3 py-2 text-xs font-display tracking-wider uppercase min-h-[44px] transition-colors"
					style={
						activeTab === tab.id
							? { color: "var(--color-bok-gold)", borderBottom: "2px solid var(--color-bok-gold)" }
							: { color: "var(--color-bok-parchment)", opacity: 0.45, borderBottom: "2px solid transparent" }
					}
				>
					{tab.label}
				</button>
			))}
		</div>
	);
}
