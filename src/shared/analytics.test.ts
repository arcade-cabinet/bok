import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isAnalyticsOptedIn,
  setAnalyticsOptIn,
  trackBossKill,
  trackEvent,
  trackRunEnd,
  trackRunStart,
  trackSessionStart,
} from './analytics.ts';

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

describe('analytics', () => {
  describe('isAnalyticsOptedIn', () => {
    it('returns false when no preference is stored', () => {
      expect(isAnalyticsOptedIn()).toBe(false);
    });

    it('returns false when preference is "false"', () => {
      storage.set('bok-analytics-optin', 'false');
      expect(isAnalyticsOptedIn()).toBe(false);
    });

    it('returns true when preference is "true"', () => {
      storage.set('bok-analytics-optin', 'true');
      expect(isAnalyticsOptedIn()).toBe(true);
    });

    it('returns false for any non-"true" value', () => {
      storage.set('bok-analytics-optin', 'yes');
      expect(isAnalyticsOptedIn()).toBe(false);
    });
  });

  describe('setAnalyticsOptIn', () => {
    it('stores "true" when opting in', () => {
      setAnalyticsOptIn(true);
      expect(storage.get('bok-analytics-optin')).toBe('true');
    });

    it('stores "false" when opting out', () => {
      setAnalyticsOptIn(false);
      expect(storage.get('bok-analytics-optin')).toBe('false');
    });

    it('round-trips with isAnalyticsOptedIn', () => {
      setAnalyticsOptIn(true);
      expect(isAnalyticsOptedIn()).toBe(true);
      setAnalyticsOptIn(false);
      expect(isAnalyticsOptedIn()).toBe(false);
    });
  });

  describe('trackEvent', () => {
    it('is a no-op when not opted in', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      trackEvent('test_event', { key: 'value' });
      expect(spy).not.toHaveBeenCalled();
    });

    it('logs in dev mode when opted in', () => {
      setAnalyticsOptIn(true);
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      trackEvent('test_event', { key: 'value' });
      // In test environment (DEV=true), should log
      expect(spy).toHaveBeenCalledWith('[Analytics]', 'test_event', { key: 'value' });
    });

    it('logs without data when no data is provided', () => {
      setAnalyticsOptIn(true);
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      trackEvent('simple_event');
      expect(spy).toHaveBeenCalledWith('[Analytics]', 'simple_event', undefined);
    });
  });

  describe('pre-defined event helpers', () => {
    it('trackSessionStart calls trackEvent', () => {
      setAnalyticsOptIn(true);
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      trackSessionStart();
      expect(spy).toHaveBeenCalledWith('[Analytics]', 'session_start', undefined);
    });

    it('trackRunStart includes biome', () => {
      setAnalyticsOptIn(true);
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      trackRunStart('volcanic');
      expect(spy).toHaveBeenCalledWith('[Analytics]', 'run_start', { biome: 'volcanic' });
    });

    it('trackRunEnd includes result and duration', () => {
      setAnalyticsOptIn(true);
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      trackRunEnd('victory', 300);
      expect(spy).toHaveBeenCalledWith('[Analytics]', 'run_end', { result: 'victory', duration: 300 });
    });

    it('trackBossKill includes bossId', () => {
      setAnalyticsOptIn(true);
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      trackBossKill('magma-wyrm');
      expect(spy).toHaveBeenCalledWith('[Analytics]', 'boss_kill', { bossId: 'magma-wyrm' });
    });

    it('pre-defined helpers are no-ops when not opted in', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      trackSessionStart();
      trackRunStart('forest');
      trackRunEnd('death', 60);
      trackBossKill('ent-lord');
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
