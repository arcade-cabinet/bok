/**
 * React hook for user settings — reads/writes from SQLite user_settings table.
 * Also syncs keybindings to the runtime input-config module.
 */

import { useCallback, useEffect, useState } from "react";
import type { InputAction, KeyBindings, MobileConfig } from "../../engine/input-config.ts";
import {
	DEFAULT_KEYBINDINGS,
	DEFAULT_MOBILE_CONFIG,
	deserializeBindings,
	serializeBindings,
	setBindings,
	setMobileConfig,
} from "../../engine/input-config.ts";
import { getSetting, setSetting } from "../../persistence/db.ts";

export interface GameSettings {
	showVitals: boolean;
	renderDistance: number;
	qualityTier: string;
	masterVolume: number;
	musicVolume: number;
	sfxVolume: number;
	keybindings: KeyBindings;
	mobileConfig: MobileConfig;
}

const DEFAULTS: GameSettings = {
	showVitals: true,
	renderDistance: 3,
	qualityTier: "auto",
	masterVolume: 80,
	musicVolume: 60,
	sfxVolume: 80,
	keybindings: DEFAULT_KEYBINDINGS,
	mobileConfig: DEFAULT_MOBILE_CONFIG,
};

export function useSettings(): {
	settings: GameSettings;
	updateSetting: <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => void;
	rebindKey: (action: InputAction, newKey: string) => void;
	updateMobileConfig: (partial: Partial<MobileConfig>) => void;
	loading: boolean;
} {
	const [settings, setSettings] = useState<GameSettings>(DEFAULTS);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const [showVitals, renderDistance, qualityTier, masterVolume, musicVolume, sfxVolume, bindingsJson, mobileJson] =
				await Promise.all([
					getSetting("showVitals", "true"),
					getSetting("renderDistance", "3"),
					getSetting("qualityTier", "auto"),
					getSetting("masterVolume", "80"),
					getSetting("musicVolume", "60"),
					getSetting("sfxVolume", "80"),
					getSetting("keybindings", "{}"),
					getSetting("mobileConfig", "{}"),
				]);
			if (cancelled) return;

			const keybindings = deserializeBindings(bindingsJson);
			let mobileConfig: MobileConfig;
			try {
				mobileConfig = { ...DEFAULT_MOBILE_CONFIG, ...JSON.parse(mobileJson) };
			} catch {
				mobileConfig = DEFAULT_MOBILE_CONFIG;
			}

			// Sync to runtime input system
			setBindings(keybindings);
			setMobileConfig(mobileConfig);

			setSettings({
				showVitals: showVitals === "true",
				renderDistance: Number(renderDistance),
				qualityTier,
				masterVolume: Number(masterVolume),
				musicVolume: Number(musicVolume),
				sfxVolume: Number(sfxVolume),
				keybindings,
				mobileConfig,
			});
			setLoading(false);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const updateSetting = useCallback(<K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
		setSettings((prev) => ({ ...prev, [key]: value }));
		setSetting(key, String(value)).catch((err) => console.error("Failed to save setting:", err));
	}, []);

	const rebindKey = useCallback((action: InputAction, newKey: string) => {
		setSettings((prev) => {
			const updated = { ...prev.keybindings, [action]: newKey };
			setBindings(updated);
			setSetting("keybindings", serializeBindings(updated)).catch((err) =>
				console.error("Failed to save keybindings:", err),
			);
			return { ...prev, keybindings: updated };
		});
	}, []);

	const updateMobileConfig = useCallback((partial: Partial<MobileConfig>) => {
		setSettings((prev) => {
			const updated = { ...prev.mobileConfig, ...partial };
			setMobileConfig(updated);
			setSetting("mobileConfig", JSON.stringify(updated)).catch((err) =>
				console.error("Failed to save mobile config:", err),
			);
			return { ...prev, mobileConfig: updated };
		});
	}, []);

	return { settings, updateSetting, rebindKey, updateMobileConfig, loading };
}
