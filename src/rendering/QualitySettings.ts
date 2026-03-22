/**
 * @module rendering/QualitySettings
 * @role Quality preset management and auto-detection
 * @input Device capabilities, user preference
 * @output QualityConfig used by rendering, particle, and LOD systems
 */

export type QualityPreset = 'low' | 'medium' | 'high';

export interface QualityConfig {
  /** Maximum particle count for ParticleSystem */
  particleBudget: number;
  /** Number of chunks to render */
  renderDistance: number;
  /** Whether shadows are enabled */
  shadowsEnabled: boolean;
  /** Whether day/night cycle is active */
  dayNightEnabled: boolean;
  /** Whether weather effects are rendered */
  weatherEnabled: boolean;
  /** Whether post-processing passes are enabled */
  postProcessing: boolean;
  /** LOD distance thresholds */
  lodDistances: { low: number; cull: number };
}

export const QUALITY_PRESETS: Record<QualityPreset, QualityConfig> = {
  low: {
    particleBudget: 50,
    renderDistance: 4,
    shadowsEnabled: false,
    dayNightEnabled: false,
    weatherEnabled: false,
    postProcessing: false,
    lodDistances: { low: 15, cull: 30 },
  },
  medium: {
    particleBudget: 100,
    renderDistance: 6,
    shadowsEnabled: true,
    dayNightEnabled: true,
    weatherEnabled: true,
    postProcessing: false,
    lodDistances: { low: 25, cull: 45 },
  },
  high: {
    particleBudget: 200,
    renderDistance: 8,
    shadowsEnabled: true,
    dayNightEnabled: true,
    weatherEnabled: true,
    postProcessing: true,
    lodDistances: { low: 40, cull: 60 },
  },
};

const STORAGE_KEY = 'bok-quality-settings';

/**
 * Auto-detect the best quality preset based on device capabilities.
 * Falls back conservatively: mobile -> low, integrated GPU -> low, otherwise high.
 */
export function detectQualityPreset(): QualityPreset {
  if (typeof navigator === 'undefined') return 'medium';
  if (typeof document === 'undefined') return 'medium';

  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  if (isMobile) return 'low';

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  if (!gl) return 'low';

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
    if (/Mali|Adreno|Apple GPU|Intel|SwiftShader/i.test(renderer)) return 'medium';
  }

  return 'high';
}

/**
 * Load saved quality settings from localStorage.
 * Returns null if no saved settings exist.
 */
export function loadQualitySettings(): { preset: QualityPreset; overrides: Partial<QualityConfig> } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { preset: QualityPreset; overrides: Partial<QualityConfig> };
    // Validate that preset is a known value
    if (!QUALITY_PRESETS[parsed.preset]) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Save quality settings to localStorage.
 */
export function saveQualitySettings(preset: QualityPreset, overrides: Partial<QualityConfig>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset, overrides }));
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded)
  }
}

/**
 * Resolve the effective quality config by merging preset defaults with user overrides.
 */
export function resolveQualityConfig(preset: QualityPreset, overrides?: Partial<QualityConfig>): QualityConfig {
  return { ...QUALITY_PRESETS[preset], ...overrides };
}

/**
 * Load or auto-detect quality settings and return the resolved config.
 */
export function getEffectiveQualityConfig(): { preset: QualityPreset; config: QualityConfig } {
  const saved = loadQualitySettings();
  if (saved) {
    return {
      preset: saved.preset,
      config: resolveQualityConfig(saved.preset, saved.overrides),
    };
  }
  const preset = detectQualityPreset();
  return { preset, config: QUALITY_PRESETS[preset] };
}
