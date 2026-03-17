/**
 * Settings store — localStorage-backed persistence for game settings.
 * Covers audio, graphics, and control preferences.
 * ~50 LOC, synchronous read/write, safe for SSR/tests (graceful fallback).
 */

export interface SettingsData {
	masterVolume: number;
	ambientVolume: number;
	interactionVolume: number;
	muted: boolean;
	renderDistance: number;
	particleDensity: "low" | "medium" | "high";
	shadowQuality: "off" | "low" | "medium" | "high";
	mouseSensitivity: number;
	touchSensitivity: number;
	invertY: boolean;
}

const STORAGE_KEY = "bok-settings";

export const DEFAULT_SETTINGS: SettingsData = {
	masterVolume: 80,
	ambientVolume: 60,
	interactionVolume: 80,
	muted: false,
	renderDistance: 3,
	particleDensity: "medium",
	shadowQuality: "medium",
	mouseSensitivity: 1.0,
	touchSensitivity: 1.0,
	invertY: false,
};

export function loadSettings(): SettingsData {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULT_SETTINGS };
		return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

export function saveSettings(settings: SettingsData): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch {
		// localStorage unavailable (private browsing, quota exceeded)
	}
}
