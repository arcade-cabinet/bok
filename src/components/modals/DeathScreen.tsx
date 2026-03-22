import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';

export interface DeathStats {
  enemiesDefeated: number;
  timeSurvived: number;
  biome: string;
  lootCollected: number;
  weaponUsed?: string;
}

interface Props {
  stats: DeathStats;
  onReturnToHub: () => void;
  onTryAgain: () => void;
}

const DEATH_MESSAGES = [
  'The ink fades, but the story can be rewritten.',
  'Even the greatest tales have chapters of defeat.',
  'The tome remembers your courage, if not your victory.',
  'A page torn from the book, yet the binding holds.',
  'The quill falters, but never breaks.',
  'Darkness closes the chapter — not the story.',
  'The Builder reads on, undeterred by a single blot.',
  'What is written in blood dries strongest.',
] as const;

/** Format seconds as M:SS */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * DeathScreen — modal overlay shown when the player dies.
 * Displays run stats (enemies defeated, time survived, biome, loot collected),
 * a rotating lore-flavored death message, and buttons to return to hub or retry.
 * Uses daisyUI modal, stat, and btn components with the parchment theme.
 */
export function DeathScreen({ stats, onReturnToHub, onTryAgain }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const deathMessage = useMemo(() => DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)], []);

  // Focus the primary action button on mount
  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <AnimatePresence>
      <div
        className="modal modal-open overlay-safe-area"
        role="dialog"
        aria-modal="true"
        aria-labelledby="death-screen-title"
      >
        <div className="modal-backdrop bg-black/90" />
        <motion.div
          className="modal-box card bg-base-100 border-2 border-secondary max-w-xs sm:max-w-sm text-center"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h2
            id="death-screen-title"
            className="text-2xl sm:text-3xl mb-1 text-base-content"
            style={{ fontFamily: 'Cinzel, Georgia, serif' }}
          >
            THE CHAPTER ENDS
          </h2>
          <p className="text-sm italic mb-4 text-secondary" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
            {deathMessage}
          </p>

          {/* Run stats */}
          <div className="stats stats-vertical bg-base-200/50 border border-secondary/30 w-full mb-4">
            <div className="stat py-2">
              <div className="stat-title">Enemies Defeated</div>
              <div className="stat-value text-lg text-base-content">{stats.enemiesDefeated}</div>
            </div>
            <div className="stat py-2">
              <div className="stat-title">Time Survived</div>
              <div className="stat-value text-lg text-base-content">{formatTime(stats.timeSurvived)}</div>
            </div>
            <div className="stat py-2">
              <div className="stat-title">Biome Explored</div>
              <div className="stat-value text-lg text-base-content capitalize">{stats.biome}</div>
            </div>
            <div className="stat py-2">
              <div className="stat-title">Loot Collected</div>
              <div className="stat-value text-lg text-base-content">{stats.lootCollected}</div>
            </div>
          </div>

          {/* Lost gear notice */}
          <div className="text-xs text-error/80 italic mb-4" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
            Per-run gear has been lost. Permanent upgrades remain.
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button
              ref={buttonRef}
              type="button"
              className="btn btn-primary w-full focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
              onClick={onTryAgain}
              aria-label="Try again"
            >
              TRY AGAIN
            </button>
            <button
              type="button"
              className="btn btn-ghost border border-secondary w-full focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
              onClick={onReturnToHub}
              aria-label="Return to hub"
            >
              RETURN TO HUB
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
