/** Stub analytics system with localStorage opt-in. */

const ANALYTICS_KEY = 'bok-analytics-optin';

export function isAnalyticsOptedIn(): boolean {
  return localStorage.getItem(ANALYTICS_KEY) === 'true';
}

export function setAnalyticsOptIn(optIn: boolean): void {
  localStorage.setItem(ANALYTICS_KEY, optIn ? 'true' : 'false');
}

/** Track an event. No-op if not opted in. Stub for future analytics service. */
export function trackEvent(name: string, data?: Record<string, unknown>): void {
  if (!isAnalyticsOptedIn()) return;
  // Future: send to analytics service
  if (import.meta.env.DEV) {
    console.log('[Analytics]', name, data);
  }
}

// Pre-defined events
export function trackSessionStart(): void {
  trackEvent('session_start');
}

export function trackRunStart(biome: string): void {
  trackEvent('run_start', { biome });
}

export function trackRunEnd(result: string, duration: number): void {
  trackEvent('run_end', { result, duration });
}

export function trackBossKill(bossId: string): void {
  trackEvent('boss_kill', { bossId });
}
