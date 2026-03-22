import { useCallback, useEffect, useState } from 'react';
import { isAnalyticsOptedIn, setAnalyticsOptIn } from '../../shared/analytics.ts';
import { type GameSettings, loadGameSettings, saveGameSettings } from '../../shared/gameSettings.ts';

interface Props {
  onOpenPrivacyPolicy: () => void;
}

/**
 * GameSettingsPanel -- embeddable panel with game-settings toggles,
 * analytics opt-in, and a privacy-policy link.
 * Uses daisyUI toggle components with the parchment theme.
 * Can be placed inside any modal (SettingsModal, PauseMenu, etc.).
 */
export function GameSettingsPanel({ onOpenPrivacyPolicy }: Props) {
  const [settings, setSettings] = useState<GameSettings>(loadGameSettings);
  const [analyticsOptIn, setAnalyticsOptInState] = useState(isAnalyticsOptedIn);

  // Persist game settings whenever they change
  useEffect(() => {
    saveGameSettings(settings);
  }, [settings]);

  const toggleSetting = useCallback((key: keyof GameSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleAnalyticsToggle = useCallback(() => {
    const next = !analyticsOptIn;
    setAnalyticsOptIn(next);
    setAnalyticsOptInState(next);
  }, [analyticsOptIn]);

  return (
    <div className="space-y-4">
      {/* Game Settings */}
      <div>
        <h3 className="text-lg font-semibold text-base-content mb-3" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
          Gameplay
        </h3>
        <div className="space-y-2">
          <ToggleRow
            label="Player Governor (GOAP)"
            description="AI-assisted combat recommendations"
            checked={settings.governorEnabled}
            onChange={() => toggleSetting('governorEnabled')}
          />
          <ToggleRow
            label="Auto-Target"
            description="Automatically target nearest enemy"
            checked={settings.autoTargetEnabled}
            onChange={() => toggleSetting('autoTargetEnabled')}
          />
          <ToggleRow
            label="Screen Shake"
            description="Camera shake on hits"
            checked={settings.screenShakeEnabled}
            onChange={() => toggleSetting('screenShakeEnabled')}
          />
          <ToggleRow
            label="Damage Numbers"
            description="Floating damage numbers"
            checked={settings.showDamageNumbers}
            onChange={() => toggleSetting('showDamageNumbers')}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="divider my-2" />

      {/* Privacy & Analytics */}
      <div>
        <h3 className="text-lg font-semibold text-base-content mb-3" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
          Privacy & Analytics
        </h3>
        <div className="space-y-2">
          <ToggleRow
            label="Anonymous Analytics"
            description="Help improve the game with usage data"
            checked={analyticsOptIn}
            onChange={handleAnalyticsToggle}
          />
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm mt-3 text-secondary underline focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
          onClick={onOpenPrivacyPolicy}
        >
          View Privacy Policy
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal components
// ---------------------------------------------------------------------------

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer p-2 rounded hover:bg-base-200/50 transition-colors">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-base-content block">{label}</span>
        <span className="text-xs text-base-content/60 block">{description}</span>
      </div>
      <input type="checkbox" className="toggle toggle-sm toggle-primary" checked={checked} onChange={onChange} />
    </label>
  );
}
