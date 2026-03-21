import { AnimatePresence, motion } from 'framer-motion';

import type { DiegeticContext } from '../../engine/diegetic';

interface Props {
  context: DiegeticContext;
}

/**
 * Subtle diegetic context hints rendered as screen-edge effects.
 * No forced UI buttons — purely ambient visual feedback.
 */
export function ContextIndicator({ context }: Props) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[5]">
      <AnimatePresence>
        {context === 'combat' && (
          <motion.div
            key="combat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
            style={{
              boxShadow: 'inset 0 0 80px 20px rgba(180, 30, 30, 0.15)',
            }}
          />
        )}

        {context === 'climb' && (
          <motion.div
            key="climb"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.35, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.5 }}
            className="absolute bottom-[40%] left-1/2 -translate-x-1/2"
          >
            <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
              <title>Climb hint</title>
              <path d="M16 4L6 18h20L16 4z" fill="white" fillOpacity="0.3" />
            </svg>
          </motion.div>
        )}

        {context === 'drop' && (
          <motion.div
            key="drop"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 0.35, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            className="absolute top-[55%] left-1/2 -translate-x-1/2"
          >
            <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
              <title>Drop hint</title>
              <path d="M16 20L6 6h20L16 20z" fill="white" fillOpacity="0.3" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
