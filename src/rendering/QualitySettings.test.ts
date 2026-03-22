import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectQualityPreset,
  getEffectiveQualityConfig,
  loadQualitySettings,
  QUALITY_PRESETS,
  resolveQualityConfig,
  saveQualitySettings,
} from './QualitySettings.ts';

describe('QualitySettings', () => {
  describe('QUALITY_PRESETS', () => {
    it('defines low, medium, and high presets', () => {
      expect(QUALITY_PRESETS.low).toBeDefined();
      expect(QUALITY_PRESETS.medium).toBeDefined();
      expect(QUALITY_PRESETS.high).toBeDefined();
    });

    it('low preset has fewer particles than high', () => {
      expect(QUALITY_PRESETS.low.particleBudget).toBeLessThan(QUALITY_PRESETS.high.particleBudget);
    });

    it('low preset has smaller render distance', () => {
      expect(QUALITY_PRESETS.low.renderDistance).toBeLessThan(QUALITY_PRESETS.high.renderDistance);
    });

    it('low preset disables shadows', () => {
      expect(QUALITY_PRESETS.low.shadowsEnabled).toBe(false);
    });

    it('high preset enables post processing', () => {
      expect(QUALITY_PRESETS.high.postProcessing).toBe(true);
    });

    it('medium preset enables shadows but not post processing', () => {
      expect(QUALITY_PRESETS.medium.shadowsEnabled).toBe(true);
      expect(QUALITY_PRESETS.medium.postProcessing).toBe(false);
    });

    it('low LOD distances are tighter than high', () => {
      expect(QUALITY_PRESETS.low.lodDistances.cull).toBeLessThan(QUALITY_PRESETS.high.lodDistances.cull);
    });
  });

  describe('resolveQualityConfig', () => {
    it('returns preset defaults when no overrides given', () => {
      const config = resolveQualityConfig('medium');
      expect(config).toEqual(QUALITY_PRESETS.medium);
    });

    it('merges overrides with preset defaults', () => {
      const config = resolveQualityConfig('high', { shadowsEnabled: false, particleBudget: 75 });
      expect(config.shadowsEnabled).toBe(false);
      expect(config.particleBudget).toBe(75);
      // Other values should remain from preset
      expect(config.postProcessing).toBe(true);
      expect(config.renderDistance).toBe(8);
    });
  });

  describe('detectQualityPreset', () => {
    it('returns medium or low in Node environment (no document)', () => {
      // In Node test environment, navigator exists but document does not.
      // detectQualityPreset will try to create a canvas and fail, returning 'low'.
      // Or if navigator.userAgent triggers mobile detection, also 'low'.
      // This test validates it does not throw and returns a valid preset.
      const result = detectQualityPreset();
      expect(['low', 'medium', 'high']).toContain(result);
    });
  });

  describe('localStorage persistence', () => {
    let storage: Map<string, string>;

    beforeEach(() => {
      storage = new Map();
      vi.stubGlobal('localStorage', {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns null when no settings are saved', () => {
      expect(loadQualitySettings()).toBeNull();
    });

    it('round-trips preset and overrides through localStorage', () => {
      saveQualitySettings('high', { shadowsEnabled: false });
      const loaded = loadQualitySettings();
      expect(loaded).not.toBeNull();
      expect(loaded?.preset).toBe('high');
      expect(loaded?.overrides.shadowsEnabled).toBe(false);
    });

    it('returns null for invalid JSON in localStorage', () => {
      storage.set('bok-quality-settings', 'not-json');
      expect(loadQualitySettings()).toBeNull();
    });

    it('returns null for unknown preset in localStorage', () => {
      storage.set('bok-quality-settings', JSON.stringify({ preset: 'ultra', overrides: {} }));
      expect(loadQualitySettings()).toBeNull();
    });
  });

  describe('getEffectiveQualityConfig', () => {
    let storage: Map<string, string>;

    beforeEach(() => {
      storage = new Map();
      vi.stubGlobal('localStorage', {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('uses saved settings when available', () => {
      saveQualitySettings('low', { particleBudget: 75 });
      const result = getEffectiveQualityConfig();
      expect(result.preset).toBe('low');
      expect(result.config.particleBudget).toBe(75);
      // Non-overridden values come from low preset
      expect(result.config.shadowsEnabled).toBe(false);
    });

    it('auto-detects when no saved settings exist', () => {
      const result = getEffectiveQualityConfig();
      // Should return a valid preset
      expect(['low', 'medium', 'high']).toContain(result.preset);
      expect(result.config.particleBudget).toBeGreaterThan(0);
    });
  });
});
