interface Props {
  current: number;
  max: number;
}

const LOW_HEALTH_THRESHOLD = 0.2;

/**
 * Player health bar — daisyUI progress with parchment theme styling.
 * Pulses opacity when health drops below 20%, matching the original
 * dead-code behavior from src/ui/hud/HealthBar.ts.
 */
export function HealthBar({ current, max }: Props) {
  const ratio = max > 0 ? current / max : 0;
  const isLow = ratio < LOW_HEALTH_THRESHOLD;

  return (
    <div
      className={`absolute top-4 left-4 bg-base-100/85 border-2 border-secondary rounded-md
        px-2 py-1 sm:px-3 sm:py-2${isLow ? ' animate-[health-pulse_600ms_ease-in-out_infinite]' : ''}`}
      style={{ fontFamily: 'Georgia, serif' }}
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
    </div>
  );
}
