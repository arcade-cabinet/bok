/**
 * Capacitor platform bridge — native device detection, status bar,
 * screen orientation, haptics, and platform-specific behaviors.
 */
import { Capacitor } from '@capacitor/core';

export interface PlatformInfo {
  platform: 'web' | 'ios' | 'android';
  isNative: boolean;
  isWeb: boolean;
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
  try {
    const { StatusBar } = await import('@capacitor/status-bar' as string);
    await StatusBar.hide();
  } catch {
    // StatusBar plugin not installed — skip
  }
}

/** Lock screen to landscape on native */
export async function lockLandscape(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { ScreenOrientation } = await import('@capacitor/screen-orientation' as string);
    await ScreenOrientation.lock({ orientation: 'landscape' });
  } catch {
    // ScreenOrientation plugin not installed — try web API
    try {
      await (screen.orientation as any).lock?.('landscape');
    } catch { /* not supported */ }
  }
}

/** Trigger haptic feedback on native (light impact for combat hits) */
export async function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics' as string);
    const styleMap = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: styleMap[style] });
  } catch {
    // Haptics plugin not installed — skip
  }
}

/** Keep screen awake during gameplay on native */
export async function keepScreenAwake(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { KeepAwake } = await import('@capacitor-community/keep-awake' as string);
    await KeepAwake.keepAwake();
  } catch {
    // Plugin not installed — try web API
    try {
      await (navigator as any).wakeLock?.request('screen');
    } catch { /* not supported */ }
  }
}

/** Initialize all platform-specific behaviors */
export async function initPlatform(): Promise<PlatformInfo> {
  const info = getPlatform();
  console.log(`[Bok] Platform: ${info.platform} (native: ${info.isNative})`);

  if (info.isNative) {
    await hideStatusBar();
    await lockLandscape();
    await keepScreenAwake();
  } else {
    // Web-specific: request wake lock to prevent screen sleep
    try {
      await (navigator as any).wakeLock?.request('screen');
    } catch { /* not available */ }
  }

  return info;
}
