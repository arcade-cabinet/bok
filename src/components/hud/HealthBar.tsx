interface Props {
  current: number;
  max: number;
  stamina?: number;
  maxStamina?: number;
}

const LOW_HEALTH_THRESHOLD = 0.2;

/**
 * Player health + stamina bars — daisyUI progress with parchment theme styling.
 * Pulses opacity when health drops below 20%, matching the original
 * dead-code behavior from src/ui/hud/HealthBar.ts.
 * Stamina bar shown below health when stamina props are provided.
 */
export function HealthBar({ current, max, stamina, maxStamina }: Props) {
  const ratio = max > 0 ? current / max : 0;
  const isLow = ratio < LOW_HEALTH_THRESHOLD;
  const staminaRatio = maxStamina && maxStamina > 0 ? (stamina ?? maxStamina) / maxStamina : 1;

  return (
    <div
      className={`absolute top-4 left-4 bg-base-100/85 border-2 border-secondary rounded-md
        px-2 py-1 sm:px-3 sm:py-2${isLow ? ' animate-[health-pulse_600ms_ease-in-out_infinite]' : ''}`}
      style={{
        fontFamily: 'Georgia, serif',
        marginTop: 'env(safe-area-inset-top)',
        marginLeft: 'env(safe-area-inset-left)',
      }}
    >
      <div className="text-[9px] sm:text-xs mb-1 text-base-content" id="health-label">
        Health
      </div>
      <progress
        className="progress progress-error w-24 sm:w-36 h-2 sm:h-3"
        value={current}
        max={max}
        aria-labelledby="health-label"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
      />
      <div className="text-[8px] sm:text-[10px] mt-0.5 text-base-content" aria-hidden="true">
        {current} / {max}
      </div>
      {maxStamina != null && maxStamina > 0 && (
        <>
          <div className="text-[9px] sm:text-xs mt-1.5 mb-1 text-base-content" id="stamina-label">
            Stamina
          </div>
          <div
            className="w-24 sm:w-36 h-1.5 sm:h-2 bg-black/50 rounded-full overflow-hidden"
            role="progressbar"
            aria-labelledby="stamina-label"
            aria-valuenow={Math.round(stamina ?? maxStamina)}
            aria-valuemin={0}
            aria-valuemax={maxStamina}
          >
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${staminaRatio * 100}%`,
                backgroundColor: staminaRatio < 0.25 ? '#ef4444' : '#facc15',
              }}
            />
          </div>
          <div className="text-[8px] sm:text-[10px] mt-0.5 text-base-content" aria-hidden="true">
            {Math.round(stamina ?? maxStamina)} / {maxStamina}
          </div>
        </>
      )}
    </div>
  );
}
