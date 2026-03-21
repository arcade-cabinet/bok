/**
 * Capacitor platform bridge — native device detection, status bar,
 * screen orientation, haptics, and platform-specific behaviors.
 *
 * NO SILENT FALLBACKS. Errors display a visible modal and fail properly.
 */
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { ScreenOrientation } from '@capacitor/screen-orientation';

export interface PlatformInfo {
  platform: 'web' | 'ios' | 'android';
  isNative: boolean;
  isWeb: boolean;
}

/** Collected errors during platform init */
const platformErrors: string[] = [];

/** Show a visible error modal overlaying the game */
function showErrorModal(errors: string[]): void {
  const overlay = document.createElement('div');
  overlay.id = 'platform-error-modal';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);';

  const panel = document.createElement('div');
  panel.style.cssText = 'background:#fdf6e3;border:3px solid #c0392b;border-radius:12px;padding:32px;max-width:500px;max-height:80vh;overflow-y:auto;';

  const title = document.createElement('h2');
  title.textContent = 'Platform Errors';
  title.style.cssText = 'font-family:Georgia,serif;font-size:24px;color:#c0392b;margin:0 0 16px 0;';

  const list = document.createElement('ul');
  list.style.cssText = 'font-family:monospace;font-size:13px;color:#2c1e16;padding-left:20px;margin:0 0 20px 0;line-height:1.8;';
  for (const err of errors) {
    const li = document.createElement('li');
    li.textContent = err;
    list.appendChild(li);
  }

  const dismissBtn = document.createElement('button');
  dismissBtn.textContent = 'Continue Anyway';
  dismissBtn.style.cssText = 'padding:10px 24px;border:2px solid #8b5a2b;border-radius:6px;background:#2c1e16;color:#fdf6e3;font-family:Georgia,serif;font-size:14px;cursor:pointer;pointer-events:auto;margin-right:8px;';
  dismissBtn.addEventListener('click', () => overlay.remove());

  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy Errors';
  copyBtn.style.cssText = 'padding:10px 24px;border:2px solid #8b5a2b;border-radius:6px;background:#fef9ef;color:#2c1e16;font-family:Georgia,serif;font-size:14px;cursor:pointer;pointer-events:auto;';
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(errors.join('\n')).then(() => {
      copyBtn.textContent = 'Copied!';
    });
  });

  panel.append(title, list, dismissBtn, copyBtn);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}

/** Record an error — logs and stores for modal display */
function recordError(context: string, error: unknown): void {
  const msg = `[${context}] ${error instanceof Error ? error.message : String(error)}`;
  platformErrors.push(msg);
  console.error(msg, error);
}

/** Get current platform info from Capacitor */
export function getPlatform(): PlatformInfo {
  const platform = Capacitor.getPlatform() as 'web' | 'ios' | 'android';
  return {
    platform,
    isNative: Capacitor.isNativePlatform(),
    isWeb: platform === 'web',
  };
}

/** Hide the native status bar on mobile (iOS/Android) */
export async function hideStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!Capacitor.isPluginAvailable('StatusBar')) {
    recordError('StatusBar', 'Plugin not available on this platform');
    return;
  }
  try {
    await StatusBar.hide();
  } catch (e) {
    recordError('StatusBar.hide', e);
  }
}

/** Lock screen to landscape on native */
export async function lockLandscape(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!Capacitor.isPluginAvailable('ScreenOrientation')) {
    recordError('ScreenOrientation', 'Plugin not available on this platform');
    return;
  }
  try {
    await ScreenOrientation.lock({ orientation: 'landscape' });
  } catch (e) {
    recordError('ScreenOrientation.lock', e);
  }
}

/** Trigger haptic feedback on native */
export async function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!Capacitor.isPluginAvailable('Haptics')) return; // Silent on web — haptics don't exist
  try {
    const styleMap = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: styleMap[style] });
  } catch (e) {
    recordError('Haptics.impact', e);
  }
}

/** Web wake lock — prevents screen sleep during gameplay */
export async function requestWebWakeLock(): Promise<void> {
  if (Capacitor.isNativePlatform()) return;
  if (!('wakeLock' in navigator)) return; // API not available in this browser
  try {
    await (navigator as any).wakeLock.request('screen');
  } catch (e) {
    recordError('WebWakeLock', e);
  }
}

/**
 * Initialize all platform-specific behaviors.
 * Collects ALL errors and shows them in a modal — nothing is silenced.
 */
export async function initPlatform(): Promise<PlatformInfo> {
  const info = getPlatform();
  console.log(`[Bok] Platform: ${info.platform} (native: ${info.isNative})`);

  if (info.isNative) {
    await hideStatusBar();
    await lockLandscape();
  } else {
    await requestWebWakeLock();
  }

  // Show errors if any occurred
  if (platformErrors.length > 0) {
    showErrorModal(platformErrors);
  }

  return info;
}

/** Global error handler — catches uncaught errors and shows modal */
export function installGlobalErrorHandler(): void {
  window.addEventListener('error', (event) => {
    showErrorModal([`Uncaught: ${event.message} at ${event.filename}:${event.lineno}`]);
  });
  window.addEventListener('unhandledrejection', (event) => {
    showErrorModal([`Unhandled Promise: ${event.reason}`]);
  });
}
