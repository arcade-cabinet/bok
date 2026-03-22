import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_PREFIX = 'bok-hint-seen-';
const AUTO_DISMISS_MS = 4000;

/** Trigger IDs that the game can fire to show contextual hints. */
export type HintTrigger = 'enemyNearby' | 'chestNearby' | 'healthLow' | 'bossNearby' | 'takeDamage';

interface HintDef {
  id: string;
  text: string;
  trigger: HintTrigger;
}

const HINTS: HintDef[] = [
  { id: 'first-enemy', text: 'Click to attack nearby enemies', trigger: 'enemyNearby' },
  { id: 'first-chest', text: 'Walk over chests to collect loot', trigger: 'chestNearby' },
  { id: 'low-health', text: 'Find health potions or return to hub', trigger: 'healthLow' },
  { id: 'boss-area', text: 'A powerful enemy lurks ahead...', trigger: 'bossNearby' },
  { id: 'dodge-tip', text: 'Press Space to dodge enemy attacks', trigger: 'takeDamage' },
];

/** Check if a hint has been shown before. */
function isHintSeen(id: string): boolean {
  try {
    return localStorage.getItem(STORAGE_PREFIX + id) === 'true';
  } catch {
    return false;
  }
}

/** Mark a hint as seen. */
function markHintSeen(id: string): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + id, 'true');
  } catch {
    // localStorage unavailable
  }
}

export interface HintToastProps {
  /** Active triggers from the game engine. When a trigger is active,
   *  the corresponding hint is shown (once). */
  activeTriggers: HintTrigger[];
}

/**
 * HintToast — contextual gameplay hints shown at bottom-center.
 * Each hint displays once per player (tracked in localStorage).
 * Auto-dismisses after 4 seconds with a slide-up Framer Motion animation.
 */
export function HintToast({ activeTriggers }: HintToastProps) {
  const [visibleHint, setVisibleHint] = useState<HintDef | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedTriggers = useRef<Set<HintTrigger>>(new Set());

  const dismiss = useCallback(() => {
    setVisibleHint(null);
  }, []);

  useEffect(() => {
    // Find the first matching trigger that has an unseen hint
    for (const trigger of activeTriggers) {
      if (processedTriggers.current.has(trigger)) continue;

      const hint = HINTS.find((h) => h.trigger === trigger);
      if (hint && !isHintSeen(hint.id)) {
        processedTriggers.current.add(trigger);
        markHintSeen(hint.id);
        setVisibleHint(hint);

        // Auto-dismiss
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
        dismissTimer.current = setTimeout(() => {
          setVisibleHint(null);
        }, AUTO_DISMISS_MS);
        break;
      }
    }

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [activeTriggers]);

  return (
    <div
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
      data-testid="hint-toast-container"
    >
      <AnimatePresence>
        {visibleHint && (
          <motion.div
            key={visibleHint.id}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-base-100/90 border-2 border-secondary/50 rounded-lg px-5 py-3 shadow-lg pointer-events-auto cursor-pointer"
            onClick={dismiss}
            data-testid="hint-toast"
          >
            <p
              className="text-sm text-base-content whitespace-nowrap"
              style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
              data-testid="hint-text"
            >
              {visibleHint.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
