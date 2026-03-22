import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const STORAGE_PREFIX = 'bok-inscription-seen-';
const AUTO_DISMISS_MS = 5000;

export interface Inscription {
  id: string;
  title: string;
  text: string;
  icon: string;
}

/** Check if an inscription has been shown before. */
function isInscriptionSeen(id: string): boolean {
  try {
    return localStorage.getItem(STORAGE_PREFIX + id) === 'true';
  } catch {
    return false;
  }
}

/** Mark an inscription as seen. */
function markInscriptionSeen(id: string): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + id, 'true');
  } catch {
    // localStorage unavailable
  }
}

export interface InscriptionsProps {
  /** Inscriptions that should be shown. The component filters to unseen entries
   *  and displays the first one, auto-dismissing after 5 seconds. */
  pending: Inscription[];
}

/**
 * Inscriptions — discovery-based tooltips shown at top-center when the player
 * encounters something new (biome, enemy, weapon, etc.).
 * Each inscription shows once per player (tracked in localStorage).
 * Auto-dismisses after 5 seconds with parchment styling.
 */
export function Inscriptions({ pending }: InscriptionsProps) {
  const [visible, setVisible] = useState<Inscription | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Find the first unseen inscription from the pending list
    for (const inscription of pending) {
      if (shownIds.current.has(inscription.id)) continue;
      if (isInscriptionSeen(inscription.id)) {
        shownIds.current.add(inscription.id);
        continue;
      }

      // Show this inscription
      shownIds.current.add(inscription.id);
      markInscriptionSeen(inscription.id);
      setVisible(inscription);

      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => {
        setVisible(null);
      }, AUTO_DISMISS_MS);
      break;
    }

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [pending]);

  return (
    <div
      className="fixed top-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
      data-testid="inscriptions-container"
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            key={visible.id}
            initial={{ y: -30, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 250, damping: 25 }}
            className="bg-base-100/95 border-2 border-secondary rounded-lg px-6 py-4 shadow-2xl text-center min-w-[260px] max-w-[400px]"
            data-testid="inscription-popup"
          >
            <div className="text-3xl mb-1" aria-hidden="true">
              {visible.icon}
            </div>
            <h3
              className="text-lg font-bold text-accent mb-1"
              style={{ fontFamily: 'Cinzel, Georgia, serif' }}
              data-testid="inscription-title"
            >
              {visible.title}
            </h3>
            <p
              className="text-xs leading-relaxed text-base-content/70"
              style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
              data-testid="inscription-text"
            >
              {visible.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
