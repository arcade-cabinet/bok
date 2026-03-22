import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

const AUTO_DISMISS_MS = 5000;

export interface TomeUnlockBannerProps {
  /** Ability name to display, e.g. "Dash" */
  abilityName: string | null;
  /** Ability icon emoji */
  abilityIcon: string | null;
  /** Called when the banner is dismissed */
  onDismiss?: () => void;
}

/**
 * TomeUnlockBanner — full-width banner shown briefly when a tome page is unlocked
 * after defeating a boss. Golden glow animation via Framer Motion.
 * Auto-dismisses after 5 seconds or on click.
 */
export function TomeUnlockBanner({ abilityName, abilityIcon, onDismiss }: TomeUnlockBannerProps) {
  const [visible, setVisible] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAbility = useRef<string | null>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    if (abilityName && abilityName !== lastAbility.current) {
      lastAbility.current = abilityName;
      setVisible(true);

      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    }

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [abilityName, dismiss]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none" data-testid="tome-unlock-container">
      <AnimatePresence>
        {visible && abilityName && (
          <motion.div
            key={abilityName}
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="w-full pointer-events-auto cursor-pointer"
            onClick={dismiss}
            data-testid="tome-unlock-banner"
          >
            {/* Golden glow background */}
            <motion.div
              className="relative py-5 px-4 text-center"
              style={{
                background: 'linear-gradient(180deg, rgba(196,165,114,0.95) 0%, rgba(139,90,43,0.9) 100%)',
                boxShadow: '0 4px 30px rgba(196,165,114,0.5), inset 0 -2px 10px rgba(0,0,0,0.2)',
              }}
              animate={{
                boxShadow: [
                  '0 4px 30px rgba(196,165,114,0.5), inset 0 -2px 10px rgba(0,0,0,0.2)',
                  '0 4px 50px rgba(255,215,0,0.7), inset 0 -2px 10px rgba(0,0,0,0.2)',
                  '0 4px 30px rgba(196,165,114,0.5), inset 0 -2px 10px rgba(0,0,0,0.2)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: 'easeInOut',
              }}
            >
              {/* Star sparkle accents */}
              <motion.div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-yellow-200 rounded-full"
                    style={{
                      left: `${20 + i * 20}%`,
                      top: `${30 + (i % 2) * 40}%`,
                    }}
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
                    transition={{
                      duration: 1.5,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: i * 0.3,
                    }}
                  />
                ))}
              </motion.div>

              <div className="relative">
                <div
                  className="text-xs uppercase tracking-[0.3em] text-yellow-100/80 mb-1"
                  style={{ fontFamily: 'Cinzel, Georgia, serif', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
                >
                  New Tome Page!
                </div>
                <div className="flex items-center justify-center gap-3">
                  {abilityIcon && (
                    <span className="text-3xl" aria-hidden="true">
                      {abilityIcon}
                    </span>
                  )}
                  <span
                    className="text-2xl font-bold text-white"
                    style={{ fontFamily: 'Cinzel, Georgia, serif', textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}
                    data-testid="tome-unlock-ability-name"
                  >
                    {abilityName}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
