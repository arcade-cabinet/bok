import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';
import { ALL_TOME_PAGE_IDS, TOME_PAGE_EXTENDED } from '../../content/tomePages';

/** Display metadata for a tome page ability. */
export interface TomePage {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number;
}

interface Props {
  /** Currently unlocked tome page data. */
  pages: TomePage[];
  onClose: () => void;
  /** ID of a newly unlocked page to highlight with a golden glow. */
  newlyUnlockedId?: string | null;
}

/**
 * TomePageBrowser — full-screen modal overlay showing all 8 tome abilities.
 * Unlocked pages show full details (name, description, boss, biome).
 * Locked pages show as dark/greyed with "???" text.
 * Newly unlocked pages have a golden glow animation.
 * Uses daisyUI modal, card, badge, and CSS Grid.
 */
export function TomePageBrowser({ pages, onClose, newlyUnlockedId }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Build a set of unlocked IDs for quick lookup
  const unlockedIds = useMemo(() => new Set(pages.map((p) => p.id)), [pages]);

  // Focus the close button on mount
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Escape key to close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal modal-open overlay-safe-area"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tome-browser-title"
    >
      <button
        type="button"
        className="modal-backdrop bg-black/85 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close tome pages"
      />
      <div className="modal-box card bg-base-100 border-2 border-secondary max-w-4xl w-[90%] max-h-[85vh] overflow-y-auto">
        <h2
          id="tome-browser-title"
          className="text-2xl sm:text-3xl text-center mb-2 pb-3 border-b-2 border-secondary text-base-content"
          style={{ fontFamily: 'Cinzel, Georgia, serif' }}
        >
          Tome Pages
        </h2>
        <p
          className="text-center text-base-content/50 text-xs mb-5"
          style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
        >
          {pages.length} of {ALL_TOME_PAGE_IDS.length} pages inscribed
        </p>

        <ul
          className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 list-none p-0 m-0"
          aria-label="Tome pages"
        >
          <AnimatePresence>
            {ALL_TOME_PAGE_IDS.map((abilityId) => {
              const isUnlocked = unlockedIds.has(abilityId);
              const meta = TOME_PAGE_EXTENDED[abilityId];
              const unlockedPage = pages.find((p) => p.id === abilityId);
              const isNewlyUnlocked = newlyUnlockedId === abilityId;

              if (!meta) return null;

              return (
                <motion.li
                  key={abilityId}
                  layout
                  initial={isNewlyUnlocked ? { scale: 0.9, opacity: 0 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className={`card p-3 text-center relative overflow-hidden ${
                    isUnlocked
                      ? 'bg-base-200/60 border border-secondary/40'
                      : 'bg-base-300/40 border border-base-content/10'
                  }`}
                  data-testid={`tome-page-${abilityId}`}
                >
                  {/* Golden glow for newly unlocked */}
                  {isNewlyUnlocked && (
                    <motion.div
                      className="absolute inset-0 rounded-lg"
                      style={{
                        boxShadow: 'inset 0 0 20px rgba(255,215,0,0.4), 0 0 15px rgba(196,165,114,0.3)',
                      }}
                      animate={{
                        boxShadow: [
                          'inset 0 0 20px rgba(255,215,0,0.4), 0 0 15px rgba(196,165,114,0.3)',
                          'inset 0 0 30px rgba(255,215,0,0.6), 0 0 25px rgba(196,165,114,0.5)',
                          'inset 0 0 20px rgba(255,215,0,0.4), 0 0 15px rgba(196,165,114,0.3)',
                        ],
                      }}
                      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                      data-testid="newly-unlocked-glow"
                    />
                  )}

                  {/* Icon */}
                  <div
                    className={`text-3xl mb-1 relative ${!isUnlocked ? 'grayscale opacity-30' : ''}`}
                    aria-hidden="true"
                  >
                    {isUnlocked ? meta.icon : '???'}
                  </div>

                  {/* Name */}
                  <div
                    className={`font-bold text-sm mb-1 relative ${
                      isUnlocked ? 'text-base-content' : 'text-base-content/30'
                    }`}
                    style={{ fontFamily: 'Cinzel, Georgia, serif' }}
                  >
                    {isUnlocked ? meta.name : '???'}
                  </div>

                  {/* Level badge (unlocked only) */}
                  {isUnlocked && unlockedPage && (
                    <div className="badge badge-sm badge-outline badge-secondary mb-2 relative">
                      Lv. {unlockedPage.level}
                    </div>
                  )}

                  {/* Description */}
                  <div
                    className={`text-xs leading-relaxed relative ${
                      isUnlocked ? 'text-base-content/70' : 'text-base-content/20'
                    }`}
                    style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
                  >
                    {isUnlocked ? meta.description : 'Defeat the guardian to reveal this page.'}
                  </div>

                  {/* Boss & Biome info (unlocked only) */}
                  {isUnlocked && (
                    <div
                      className="mt-2 pt-2 border-t border-secondary/20 text-[10px] text-base-content/50 relative"
                      style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
                    >
                      <div>Dropped by: {meta.bossName}</div>
                      <div>Biome: {meta.biomeName}</div>
                    </div>
                  )}

                  {/* Locked indicator */}
                  {!isUnlocked && (
                    <div className="mt-2 relative">
                      <span className="badge badge-sm badge-ghost text-base-content/20">Locked</span>
                    </div>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        <div className="mt-4 text-center">
          <button
            ref={closeRef}
            type="button"
            className="btn btn-ghost btn-sm focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
            onClick={onClose}
            aria-label="Close tome pages"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
