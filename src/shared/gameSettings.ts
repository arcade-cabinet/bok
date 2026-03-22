/** Persistent game settings stored in localStorage. */

const SETTINGS_KEY = 'bok-game-settings';

export interface GameSettings {
  governorEnabled: boolean; // GOAP player governor
  autoTargetEnabled: boolean; // Auto-target nearest enemy
  screenShakeEnabled: boolean; // Camera shake on hits
  showDamageNumbers: boolean; // Floating damage numbers
}

const DEFAULTS: GameSettings = {
  governorEnabled: true,
  autoTargetEnabled: true,
  screenShakeEnabled: true,
  showDamageNumbers: true,
};

export function getDefaultGameSettings(): GameSettings {
  return { ...DEFAULTS };
}

export function loadGameSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveGameSettings(settings: GameSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
