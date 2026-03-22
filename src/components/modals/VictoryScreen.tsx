import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

export interface VictoryStats {
  biome: string;
  enemiesDefeated: number;
  timeSurvived: number; // seconds
  lootCollected: number;
  tomePageUnlocked?: string;
  abilityName?: string;
  abilityDescription?: string;
}

interface Props {
  stats: VictoryStats;
  onContinueVoyage: () => void;
  onReturnToHub: () => void;
}

/** Format seconds as M:SS */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * VictoryScreen — modal overlay shown after boss defeat.
 * Displays run stats, optional tome page unlock card with glow animation,
 * and buttons to continue voyage or return to hub.
 * Uses daisyUI modal, card, stat, and btn components with the parchment theme.
 */
export function VictoryScreen({ stats, onContinueVoyage, onReturnToHub }: Props) {
  const primaryRef = useRef<HTMLButtonElement>(null);

  // Focus the primary action button on mount
  useEffect(() => {
    primaryRef.current?.focus();
  }, []);

  return (
    <AnimatePresence>
      <div
        className="modal modal-open overlay-safe-area"
        role="dialog"
        aria-modal="true"
        aria-labelledby="victory-screen-title"
      >
        <div className="modal-backdrop bg-black/90" />
        <motion.div
          className="modal-box card bg-base-100 border-2 border-secondary max-w-xs sm:max-w-md text-center"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h2
            id="victory-screen-title"
            className="text-2xl sm:text-3xl mb-1 tracking-widest"
            style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#c9a227' }}
          >
            A NEW PAGE IS WRITTEN
          </h2>
          <p className="text-sm italic mb-4 text-secondary" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
            The ink settles, a new chapter begins.
          </p>

          {/* Tome page unlock card with glow animation */}
          {stats.tomePageUnlocked && stats.abilityName && (
            <motion.div
              className="card bg-base-200/50 border-2 border-warning/50 mb-4 p-4 relative overflow-hidden"
              role="alert"
              aria-label={`Tome page unlocked: ${stats.abilityName}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
            >
              {/* Glow pulse behind the card */}
              <motion.div
                className="absolute inset-0 rounded-lg pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(201,162,39,0.3) 0%, transparent 70%)',
                }}
                animate={{
                  opacity: [0.4, 1, 0.4],
                  scale: [0.95, 1.05, 0.95],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <div className="relative z-10">
                <div className="text-xs tracking-widest text-secondary mb-1">TOME PAGE UNLOCKED</div>
                <motion.div
                  className="text-xl font-bold mb-1"
                  style={{ color: '#c9a227' }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.4 }}
                >
                  {stats.abilityName.toUpperCase()}
                </motion.div>
                {stats.abilityDescription && (
                  <motion.div
                    className="text-xs italic opacity-80 text-base-content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.8 }}
                    transition={{ delay: 1.0, duration: 0.4 }}
                  >
                    {stats.abilityDescription}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Run stats */}
          <div className="stats stats-vertical bg-base-200/50 border border-secondary/30 w-full mb-6">
            <div className="stat py-2">
              <div className="stat-title">Biome</div>
              <div className="stat-value text-lg text-base-content capitalize">{stats.biome}</div>
            </div>
            <div className="stat py-2">
              <div className="stat-title">Enemies Defeated</div>
              <div className="stat-value text-lg text-base-content">{stats.enemiesDefeated}</div>
            </div>
            <div className="stat py-2">
              <div className="stat-title">Time</div>
              <div className="stat-value text-lg text-base-content">{formatTime(stats.timeSurvived)}</div>
            </div>
            <div className="stat py-2">
              <div className="stat-title">Loot Collected</div>
              <div className="stat-value text-lg text-base-content">{stats.lootCollected}</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button
              ref={primaryRef}
              type="button"
              className="btn btn-primary w-full focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
              onClick={onContinueVoyage}
            >
              CONTINUE VOYAGE
            </button>
            <button
              type="button"
              className="btn btn-ghost border border-secondary w-full focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
              onClick={onReturnToHub}
            >
              RETURN TO HUB
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
