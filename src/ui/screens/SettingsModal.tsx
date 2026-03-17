/**
 * Settings modal — tabbed overlay for game configuration.
 * Tabs: Keybindings, Audio, Graphics, Controls.
 * Persists audio/graphics/controls to localStorage via settings-store.
 * Keybindings still use SQLite via useSettings.
 */

import { useCallback, useEffect, useState } from "react";
import { SettingsAudio } from "../components/SettingsAudio.tsx";
import { SettingsControls } from "../components/SettingsControls.tsx";
import { SettingsGraphics } from "../components/SettingsGraphics.tsx";
import { SettingsKeybindings } from "../components/SettingsKeybindings.tsx";
import { useSettings } from "../hooks/useSettings.ts";
import { loadSettings, type SettingsData, saveSettings } from "../settings-store.ts";

type SettingsTab = "keybindings" | "audio" | "graphics" | "controls";

const TABS: { id: SettingsTab; label: string }[] = [
	{ id: "keybindings", label: "Keybindings" },
	{ id: "audio", label: "Audio" },
	{ id: "graphics", label: "Graphics" },
	{ id: "controls", label: "Controls" },
];

interface SettingsModalProps {
	onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
	const [activeTab, setActiveTab] = useState<SettingsTab>("keybindings");
	const { settings: kbSettings, rebindKey, updateMobileConfig } = useSettings();
	const [store, setStore] = useState<SettingsData>(loadSettings);

	const updateStore = useCallback(<K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
		setStore((prev) => {
			const next = { ...prev, [key]: value };
			saveSettings(next);
			return next;
		});
	}, []);

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
							className="px-3 py-2 min-h-[44px] rounded font-display text-xs tracking-[0.1em] uppercase transition-colors"
							style={
								activeTab === tab.id
									? {
											background: "rgba(201,168,76,0.15)",
											color: "var(--color-bok-gold)",
											borderBottom: "2px solid var(--color-bok-gold)",
										}
									: { background: "transparent", color: "var(--color-bok-parchment)", opacity: 0.7 }
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
							bindings={kbSettings.keybindings}
							mobileConfig={kbSettings.mobileConfig}
							onRebind={rebindKey}
							onMobileConfig={updateMobileConfig}
						/>
					)}
					{activeTab === "audio" && (
						<SettingsAudio
							masterVolume={store.masterVolume}
							ambientVolume={store.ambientVolume}
							interactionVolume={store.interactionVolume}
							muted={store.muted}
							onMasterVolume={(v) => updateStore("masterVolume", v)}
							onAmbientVolume={(v) => updateStore("ambientVolume", v)}
							onInteractionVolume={(v) => updateStore("interactionVolume", v)}
							onMuted={(v) => updateStore("muted", v)}
						/>
					)}
					{activeTab === "graphics" && (
						<SettingsGraphics
							renderDistance={store.renderDistance}
							particleDensity={store.particleDensity}
							shadowQuality={store.shadowQuality}
							onRenderDistance={(v) => updateStore("renderDistance", v)}
							onParticleDensity={(v) => updateStore("particleDensity", v as SettingsData["particleDensity"])}
							onShadowQuality={(v) => updateStore("shadowQuality", v as SettingsData["shadowQuality"])}
						/>
					)}
					{activeTab === "controls" && (
						<SettingsControls
							mouseSensitivity={store.mouseSensitivity}
							touchSensitivity={store.touchSensitivity}
							invertY={store.invertY}
							onMouseSensitivity={(v) => updateStore("mouseSensitivity", v)}
							onTouchSensitivity={(v) => updateStore("touchSensitivity", v)}
							onInvertY={(v) => updateStore("invertY", v)}
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
