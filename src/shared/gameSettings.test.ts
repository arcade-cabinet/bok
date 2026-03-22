import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type GameSettings, getDefaultGameSettings, loadGameSettings, saveGameSettings } from './gameSettings.ts';

// Mock localStorage
const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
    get length() {
      return storage.size;
    },
    key: (_i: number) => null,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('gameSettings', () => {
  describe('getDefaultGameSettings', () => {
    it('returns all defaults as true', () => {
      const defaults = getDefaultGameSettings();
      expect(defaults.governorEnabled).toBe(true);
      expect(defaults.autoTargetEnabled).toBe(true);
      expect(defaults.screenShakeEnabled).toBe(true);
      expect(defaults.showDamageNumbers).toBe(true);
    });

    it('returns a fresh copy each time', () => {
      const a = getDefaultGameSettings();
      const b = getDefaultGameSettings();
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });
  });

  describe('loadGameSettings', () => {
    it('returns defaults when no settings stored', () => {
      const settings = loadGameSettings();
      expect(settings).toEqual(getDefaultGameSettings());
    });

    it('returns defaults on corrupted JSON', () => {
      storage.set('bok-game-settings', 'not valid json');
      const settings = loadGameSettings();
      expect(settings).toEqual(getDefaultGameSettings());
    });

    it('merges stored partial settings with defaults', () => {
      storage.set('bok-game-settings', JSON.stringify({ governorEnabled: false }));
      const settings = loadGameSettings();
      expect(settings.governorEnabled).toBe(false);
      expect(settings.autoTargetEnabled).toBe(true);
      expect(settings.screenShakeEnabled).toBe(true);
      expect(settings.showDamageNumbers).toBe(true);
    });

    it('loads all stored settings', () => {
      const custom: GameSettings = {
        governorEnabled: false,
        autoTargetEnabled: false,
        screenShakeEnabled: false,
        showDamageNumbers: false,
      };
      storage.set('bok-game-settings', JSON.stringify(custom));
      const settings = loadGameSettings();
      expect(settings).toEqual(custom);
    });
  });

  describe('saveGameSettings', () => {
    it('persists settings to localStorage', () => {
      const custom: GameSettings = {
        governorEnabled: false,
        autoTargetEnabled: true,
        screenShakeEnabled: false,
        showDamageNumbers: true,
      };
      saveGameSettings(custom);
      const raw = storage.get('bok-game-settings');
      expect(raw).toBeDefined();
      expect(JSON.parse(raw ?? '{}')).toEqual(custom);
    });
  });

  describe('round-trip save/load', () => {
    it('save then load returns the same settings', () => {
      const custom: GameSettings = {
        governorEnabled: false,
        autoTargetEnabled: false,
        screenShakeEnabled: true,
        showDamageNumbers: false,
      };
      saveGameSettings(custom);
      const loaded = loadGameSettings();
      expect(loaded).toEqual(custom);
    });

    it('handles overwriting previous settings', () => {
      saveGameSettings({
        governorEnabled: true,
        autoTargetEnabled: true,
        screenShakeEnabled: true,
        showDamageNumbers: true,
      });
      const updated: GameSettings = {
        governorEnabled: false,
        autoTargetEnabled: false,
        screenShakeEnabled: false,
        showDamageNumbers: false,
      };
      saveGameSettings(updated);
      expect(loadGameSettings()).toEqual(updated);
    });
  });
});
