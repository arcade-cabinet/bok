import { useEffect, useRef } from 'react';

interface DeathStats {
  enemiesDefeated: number;
  timeSurvived: number;
  biome: string;
}

interface Props {
  stats: DeathStats;
  onReturnToHub: () => void;
}

/** Format seconds as M:SS */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * DeathScreen — modal overlay shown when the player dies.
 * Displays run stats (enemies defeated, time survived, biome)
 * and a button to return to hub.
 * Uses daisyUI modal, stat, and btn components with the parchment theme.
 */
export function DeathScreen({ stats, onReturnToHub }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Focus the primary action button on mount
  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <div
      className="modal modal-open overlay-safe-area"
      role="dialog"
      aria-modal="true"
      aria-labelledby="death-screen-title"
    >
      <div className="modal-backdrop bg-black/90" />
      <div className="modal-box card bg-base-100 border-2 border-secondary max-w-xs sm:max-w-sm text-center">
        <h2
          id="death-screen-title"
          className="text-2xl sm:text-3xl mb-1 text-base-content"
          style={{ fontFamily: 'Cinzel, Georgia, serif' }}
        >
          THE CHAPTER ENDS
        </h2>
        <p className="text-sm italic mb-4 text-secondary" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
          The ink fades, but the story can be rewritten.
        </p>

        <div className="stats stats-vertical bg-base-200/50 border border-secondary/30 w-full mb-6">
          <div className="stat py-2">
            <div className="stat-title">Enemies Defeated</div>
            <div className="stat-value text-lg text-base-content">{stats.enemiesDefeated}</div>
          </div>
          <div className="stat py-2">
            <div className="stat-title">Time Survived</div>
            <div className="stat-value text-lg text-base-content">{formatTime(stats.timeSurvived)}</div>
          </div>
          <div className="stat py-2">
            <div className="stat-title">Biome</div>
            <div className="stat-value text-lg text-base-content capitalize">{stats.biome}</div>
          </div>
        </div>

        <button
          ref={buttonRef}
          type="button"
          className="btn btn-neutral w-full focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
          onClick={onReturnToHub}
          aria-label="Return to hub"
        >
          TURN THE PAGE
        </button>
      </div>
    </div>
  );
}
