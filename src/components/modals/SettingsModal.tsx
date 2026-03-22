import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getEffectiveQualityConfig,
  QUALITY_PRESETS,
  type QualityConfig,
  type QualityPreset,
  resolveQualityConfig,
  saveQualitySettings,
} from '../../rendering/QualitySettings.ts';

interface Props {
  onClose: () => void;
}

const VOLUME_STORAGE_KEY = 'bok-volume-settings';

interface VolumeSettings {
  master: number;
  sfx: number;
  music: number;
}

function loadVolumeSettings(): VolumeSettings {
  try {
    const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (!raw) return { master: 80, sfx: 80, music: 60 };
    return JSON.parse(raw) as VolumeSettings;
  } catch {
    return { master: 80, sfx: 80, music: 60 };
  }
}

function saveVolumeSettings(settings: VolumeSettings): void {
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable
  }
}

/**
 * SettingsModal — quality and audio settings accessible from the pause menu.
 * Persists to localStorage. Uses daisyUI with parchment theme styling.
 */
export function SettingsModal({ onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Quality state
  const [preset, setPreset] = useState<QualityPreset>(() => {
    return getEffectiveQualityConfig().preset;
  });
  const [overrides, setOverrides] = useState<Partial<QualityConfig>>(() => {
    const effective = getEffectiveQualityConfig();
    const base = QUALITY_PRESETS[effective.preset];
    const diff: Partial<QualityConfig> = {};
    const config = effective.config;
    if (config.shadowsEnabled !== base.shadowsEnabled) diff.shadowsEnabled = config.shadowsEnabled;
    if (config.dayNightEnabled !== base.dayNightEnabled) diff.dayNightEnabled = config.dayNightEnabled;
    if (config.weatherEnabled !== base.weatherEnabled) diff.weatherEnabled = config.weatherEnabled;
    if (config.postProcessing !== base.postProcessing) diff.postProcessing = config.postProcessing;
    if (config.particleBudget !== base.particleBudget) diff.particleBudget = config.particleBudget;
    return diff;
  });

  // Volume state
  const [volume, setVolume] = useState<VolumeSettings>(loadVolumeSettings);

  const resolved = resolveQualityConfig(preset, overrides);

  // Focus trap
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const firstFocusable = modal.querySelector<HTMLElement>('button, input, select');
    firstFocusable?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = modal.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handlePresetChange = useCallback((newPreset: QualityPreset) => {
    setPreset(newPreset);
    setOverrides({});
  }, []);

  const handleToggle = useCallback((key: keyof QualityConfig, value: boolean) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleParticleBudget = useCallback((value: number) => {
    setOverrides((prev) => ({ ...prev, particleBudget: value }));
  }, []);

  const handleApply = useCallback(() => {
    saveQualitySettings(preset, overrides);
    saveVolumeSettings(volume);
    onClose();
  }, [preset, overrides, volume, onClose]);

  const handleReset = useCallback(() => {
    setPreset('medium');
    setOverrides({});
    setVolume({ master: 80, sfx: 80, music: 60 });
  }, []);

  return (
    <div
      className="modal modal-open overlay-safe-area"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      ref={modalRef}
    >
      <div className="modal-backdrop bg-black/70 backdrop-blur-sm" />
      <div className="modal-box card bg-base-100 border-2 border-secondary max-w-md sm:max-w-lg overflow-y-auto max-h-[85vh]">
        <h2
          id="settings-title"
          className="text-2xl sm:text-3xl mb-4 text-base-content text-center"
          style={{ fontFamily: 'Cinzel, Georgia, serif' }}
        >
          Settings
        </h2>

        {/* Quality Preset */}
        <section className="mb-4">
          <h3 className="text-lg font-semibold mb-2 text-base-content" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
            Graphics Quality
          </h3>
          <div className="flex gap-2 justify-center">
            {(['low', 'medium', 'high'] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={`btn btn-sm ${preset === p ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handlePresetChange(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </section>

        {/* Individual Toggles */}
        <section className="mb-4 space-y-2">
          <h3 className="text-lg font-semibold mb-2 text-base-content" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
            Features
          </h3>

          <label className="flex items-center justify-between cursor-pointer px-2">
            <span className="label-text text-base-content">Shadows</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={resolved.shadowsEnabled}
              onChange={(e) => handleToggle('shadowsEnabled', e.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer px-2">
            <span className="label-text text-base-content">Day/Night Cycle</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={resolved.dayNightEnabled}
              onChange={(e) => handleToggle('dayNightEnabled', e.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer px-2">
            <span className="label-text text-base-content">Weather Effects</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={resolved.weatherEnabled}
              onChange={(e) => handleToggle('weatherEnabled', e.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer px-2">
            <span className="label-text text-base-content">Post Processing</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={resolved.postProcessing}
              onChange={(e) => handleToggle('postProcessing', e.target.checked)}
            />
          </label>
        </section>

        {/* Particle Budget */}
        <section className="mb-4 px-2">
          <label className="block">
            <span className="flex items-center justify-between">
              <span className="label-text text-base-content">Particle Budget</span>
              <span className="text-sm text-base-content/70 tabular-nums">{resolved.particleBudget}</span>
            </span>
            <input
              type="range"
              min="50"
              max="200"
              step="10"
              className="range range-primary range-sm w-full"
              value={resolved.particleBudget}
              onChange={(e) => handleParticleBudget(Number(e.target.value))}
            />
          </label>
        </section>

        {/* Audio */}
        <section className="mb-4 px-2 space-y-3">
          <h3 className="text-lg font-semibold mb-2 text-base-content" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
            Audio
          </h3>

          <label className="block">
            <span className="flex items-center justify-between">
              <span className="label-text text-base-content">Master Volume</span>
              <span className="text-sm text-base-content/70 tabular-nums">{volume.master}%</span>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              className="range range-primary range-sm w-full"
              value={volume.master}
              onChange={(e) => setVolume((v) => ({ ...v, master: Number(e.target.value) }))}
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between">
              <span className="label-text text-base-content">SFX Volume</span>
              <span className="text-sm text-base-content/70 tabular-nums">{volume.sfx}%</span>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              className="range range-primary range-sm w-full"
              value={volume.sfx}
              onChange={(e) => setVolume((v) => ({ ...v, sfx: Number(e.target.value) }))}
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between">
              <span className="label-text text-base-content">Music Volume</span>
              <span className="text-sm text-base-content/70 tabular-nums">{volume.music}%</span>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              className="range range-primary range-sm w-full"
              value={volume.music}
              onChange={(e) => setVolume((v) => ({ ...v, music: Number(e.target.value) }))}
            />
          </label>
        </section>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-center mt-4">
          <button
            type="button"
            className="btn btn-ghost focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
            onClick={handleReset}
          >
            Reset Defaults
          </button>
          <button
            type="button"
            className="btn btn-primary focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
            onClick={handleApply}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
