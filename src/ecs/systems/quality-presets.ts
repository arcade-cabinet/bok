/**
 * Quality preset selection — auto-detects device capability on startup,
 * applies quality presets, exposes module-level cache.
 * Pure logic, no ECS/Three.js/React.
 */

import type { DeviceTierId, QualityPreset } from "./quality-data.ts";
import { clampRenderDistance, DeviceTier, isValidTier, QUALITY_PRESETS } from "./quality-data.ts";

// ─── Module-level state ───

let activePreset: QualityPreset = QUALITY_PRESETS.medium;
let overrideRenderDistance: number | null = null;

/** Get the currently active quality preset. */
export function getActiveQuality(): QualityPreset {
	if (overrideRenderDistance !== null) {
		return { ...activePreset, renderDistance: overrideRenderDistance };
	}
	return activePreset;
}

/** Set quality preset by tier. */
export function setQualityTier(tier: DeviceTierId): void {
	activePreset = QUALITY_PRESETS[tier];
	overrideRenderDistance = null;
}

/** Override just the render distance (from settings). */
export function setRenderDistanceOverride(distance: number): void {
	overrideRenderDistance = clampRenderDistance(distance, activePreset.tier);
}

/** Reset module state (for destroyGame). */
export function resetQualityState(): void {
	activePreset = QUALITY_PRESETS.medium;
	overrideRenderDistance = null;
}

// ─── Device Detection ───

/** GPU model heuristics — known low-end GPUs. */
const LOW_END_GPU_PATTERNS = [
	/mali-4/i,
	/mali-t6/i,
	/adreno.3/i,
	/adreno.4[0-2]/i,
	/powervr/i,
	/sgx/i,
	/intel.hd.[2-4]/i,
	/intel.uhd.6[0-2]/i,
];

/** GPU model heuristics — known high-end GPUs. */
const HIGH_END_GPU_PATTERNS = [
	/nvidia.rtx/i,
	/nvidia.gtx.1[0-9]/i,
	/radeon.rx.[5-7]/i,
	/apple.m[2-9]/i,
	/apple.gpu.*/i,
	/adreno.7[3-9]/i,
	/mali-g[7-9]/i,
];

/**
 * Detect GPU renderer string from WebGL context.
 * Returns null if unavailable or if debug info is not exposed.
 */
export function detectGpuRenderer(): string | null {
	if (typeof document === "undefined") return null;
	try {
		const canvas = document.createElement("canvas");
		const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
		if (!gl) return null;
		const glCtx = gl as WebGLRenderingContext;
		const ext = glCtx.getExtension("WEBGL_debug_renderer_info");
		if (!ext) return null;
		return glCtx.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
	} catch {
		return null;
	}
}

/**
 * Classify GPU renderer string into a device tier.
 * Returns null if the string doesn't match any known pattern.
 */
export function classifyGpu(renderer: string): DeviceTierId | null {
	for (const pat of LOW_END_GPU_PATTERNS) {
		if (pat.test(renderer)) return DeviceTier.Low;
	}
	for (const pat of HIGH_END_GPU_PATTERNS) {
		if (pat.test(renderer)) return DeviceTier.High;
	}
	return null;
}

/**
 * Detect device memory tier.
 * Uses navigator.deviceMemory (Chrome/Android) — GB of RAM.
 */
export function detectMemoryTier(): DeviceTierId | null {
	const nav = typeof navigator !== "undefined" ? navigator : null;
	if (!nav) return null;
	const mem = (nav as Navigator & { deviceMemory?: number }).deviceMemory;
	if (typeof mem !== "number") return null;
	if (mem <= 2) return DeviceTier.Low;
	if (mem <= 4) return DeviceTier.Medium;
	return DeviceTier.High;
}

/** Detect logical processor count tier. */
export function detectCpuTier(): DeviceTierId | null {
	const nav = typeof navigator !== "undefined" ? navigator : null;
	if (!nav) return null;
	const cores = nav.hardwareConcurrency;
	if (typeof cores !== "number") return null;
	if (cores <= 2) return DeviceTier.Low;
	if (cores <= 4) return DeviceTier.Medium;
	return DeviceTier.High;
}

/**
 * Auto-detect device tier from available heuristics.
 * Priority: GPU > memory > CPU > mobile fallback.
 * Returns the detected tier and applies it.
 */
export function detectDeviceTier(): DeviceTierId {
	// Try GPU detection
	const renderer = detectGpuRenderer();
	if (renderer) {
		const gpuTier = classifyGpu(renderer);
		if (gpuTier) return gpuTier;
	}

	// Try memory detection
	const memTier = detectMemoryTier();
	if (memTier) return memTier;

	// Try CPU core count
	const cpuTier = detectCpuTier();
	if (cpuTier) return cpuTier;

	// Mobile user agent fallback
	if (typeof navigator !== "undefined") {
		if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
			return DeviceTier.Medium;
		}
	}

	return DeviceTier.Medium;
}

/**
 * Initialize quality system — detects tier or restores saved preference.
 * Call once at game startup.
 */
export function initQuality(savedTier?: string): DeviceTierId {
	if (savedTier && isValidTier(savedTier)) {
		setQualityTier(savedTier);
		return savedTier;
	}
	const tier = detectDeviceTier();
	setQualityTier(tier);
	return tier;
}
