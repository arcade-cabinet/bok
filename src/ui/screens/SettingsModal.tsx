/**
 * Settings modal — tabbed overlay for game configuration.
 * Tabs: Keybindings, Display, Audio. Persisted to SQLite via useSettings.
 * Uses bok-panel styling to match the diegetic aesthetic.
 */

import { useEffect, useState } from "react";
import { SettingsAudio } from "../components/SettingsAudio.tsx";
import { SettingsDisplay } from "../components/SettingsDisplay.tsx";
import { SettingsKeybindings } from "../components/SettingsKeybindings.tsx";
import { useSettings } from "../hooks/useSettings.ts";

type SettingsTab = "keybindings" | "display" | "audio";

const TABS: { id: SettingsTab; label: string }[] = [
	{ id: "keybindings", label: "Keybindings" },
	{ id: "display", label: "Display" },
	{ id: "audio", label: "Audio" },
];

interface SettingsModalProps {
	onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
	const [activeTab, setActiveTab] = useState<SettingsTab>("keybindings");
	const { settings, updateSetting, rebindKey, updateMobileConfig } = useSettings();

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onClose]);

	return (
		<div
			className="absolute inset-0 z-60 flex items-center justify-center"
			style={{ background: "rgba(5,5,16,0.85)", backdropFilter: "blur(6px)" }}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-label="Settings"
		>
			<div
				className="bok-panel p-6 w-full max-w-lg mx-4 flex flex-col gap-4"
				style={{ animation: "title-emerge 0.4s ease-out", maxHeight: "80vh" }}
			>
				<RuneBorder />

				<h2
					className="font-display text-2xl tracking-[0.15em] uppercase text-center"
					style={{ color: "var(--color-bok-parchment)" }}
				>
					Settings
				</h2>

				{/* Tab navigation */}
				<div className="flex justify-center gap-1" role="tablist" data-testid="settings-tabs">
					{TABS.map((tab) => (
						<button
							type="button"
							role="tab"
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className="px-4 py-2 rounded font-display text-xs tracking-[0.1em] uppercase transition-colors"
							style={
								activeTab === tab.id
									? {
											background: "rgba(201,168,76,0.15)",
											color: "var(--color-bok-gold)",
											borderBottom: "2px solid var(--color-bok-gold)",
										}
									: { background: "transparent", color: "var(--color-bok-parchment)", opacity: 0.5 }
							}
							aria-selected={activeTab === tab.id}
							data-testid={`settings-tab-${tab.id}`}
						>
							{tab.label}
						</button>
					))}
				</div>

				{/* Tab content */}
				<div className="flex-1 overflow-y-auto min-h-[200px]" role="tabpanel">
					{activeTab === "keybindings" && (
						<SettingsKeybindings
							bindings={settings.keybindings}
							mobileConfig={settings.mobileConfig}
							onRebind={rebindKey}
							onMobileConfig={updateMobileConfig}
						/>
					)}
					{activeTab === "display" && (
						<SettingsDisplay
							showVitals={settings.showVitals}
							renderDistance={settings.renderDistance}
							qualityTier={settings.qualityTier}
							onToggleVitals={(v) => updateSetting("showVitals", v)}
							onRenderDistance={(v) => updateSetting("renderDistance", v)}
							onQualityTier={(v) => updateSetting("qualityTier", v)}
						/>
					)}
					{activeTab === "audio" && (
						<SettingsAudio
							masterVolume={settings.masterVolume}
							musicVolume={settings.musicVolume}
							sfxVolume={settings.sfxVolume}
							onMasterVolume={(v) => updateSetting("masterVolume", v)}
							onMusicVolume={(v) => updateSetting("musicVolume", v)}
							onSfxVolume={(v) => updateSetting("sfxVolume", v)}
						/>
					)}
				</div>

				<RuneBorder />

				<button
					type="button"
					onClick={onClose}
					className="btn w-full font-display tracking-[0.1em] uppercase"
					style={{ background: "rgba(255,255,255,0.06)", color: "var(--color-bok-parchment)" }}
				>
					Back
				</button>
			</div>
		</div>
	);
}

// ─── Sub-components ───

function RuneBorder() {
	return (
		<div
			className="text-center text-xs tracking-[0.6em] opacity-30 select-none"
			style={{ color: "var(--color-bok-gold)" }}
			aria-hidden="true"
		>
			&#5765; &#5765; &#5765;
		</div>
	);
}
