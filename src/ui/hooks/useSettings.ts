/**
 * React hook for user settings — reads/writes from SQLite user_settings table.
 * Also syncs keybindings and quality presets to runtime modules.
 */

import { useCallback, useEffect, useState } from "react";
import { setQualityTier, setRenderDistanceOverride } from "../../ecs/systems/quality-presets.ts";
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
	// Graphics
	particleDensity: string;
	shadowQuality: string;
	// Audio
	masterVolume: number;
	ambientVolume: number;
	interactionVolume: number;
	muted: boolean;
	// Controls
	mouseSensitivity: number;
	touchSensitivity: number;
	invertY: boolean;
	// Input
	keybindings: KeyBindings;
	mobileConfig: MobileConfig;
}

const DEFAULTS: GameSettings = {
	showVitals: true,
	renderDistance: 3,
	qualityTier: "auto",
	particleDensity: "medium",
	shadowQuality: "medium",
	masterVolume: 80,
	ambientVolume: 60,
	interactionVolume: 80,
	muted: false,
	mouseSensitivity: 1.0,
	touchSensitivity: 1.0,
	invertY: false,
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
			const [
				showVitals,
				renderDistance,
				qualityTier,
				particleDensity,
				shadowQuality,
				masterVolume,
				ambientVolume,
				interactionVolume,
				muted,
				mouseSensitivity,
				touchSensitivity,
				invertY,
				bindingsJson,
				mobileJson,
			] = await Promise.all([
				getSetting("showVitals", "true"),
				getSetting("renderDistance", "3"),
				getSetting("qualityTier", "auto"),
				getSetting("particleDensity", "medium"),
				getSetting("shadowQuality", "medium"),
				getSetting("masterVolume", "80"),
				getSetting("ambientVolume", "60"),
				getSetting("interactionVolume", "80"),
				getSetting("muted", "false"),
				getSetting("mouseSensitivity", "1.0"),
				getSetting("touchSensitivity", "1.0"),
				getSetting("invertY", "false"),
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

			const parsedRenderDistance = Number(renderDistance) || DEFAULTS.renderDistance;

			// Sync to runtime modules
			setBindings(keybindings);
			setMobileConfig(mobileConfig);
			setQualityTier(qualityTier as Parameters<typeof setQualityTier>[0]);
			setRenderDistanceOverride(parsedRenderDistance);

			setSettings({
				showVitals: showVitals === "true",
				renderDistance: parsedRenderDistance,
				qualityTier,
				particleDensity,
				shadowQuality,
				masterVolume: Number(masterVolume) || 80,
				ambientVolume: Number(ambientVolume) || 60,
				interactionVolume: Number(interactionVolume) || 80,
				muted: muted === "true",
				mouseSensitivity: Number(mouseSensitivity) || 1.0,
				touchSensitivity: Number(touchSensitivity) || 1.0,
				invertY: invertY === "true",
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
		// Side-effect: wire quality + render distance to engine
		if (key === "qualityTier") {
			setQualityTier(value as Parameters<typeof setQualityTier>[0]);
		}
		if (key === "renderDistance") {
			setRenderDistanceOverride(value as number);
		}
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
