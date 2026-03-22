import { AnimatePresence, motion } from 'framer-motion';

/** A single floating damage number to display */
export interface DamageNumber {
  id: number;
  value: number;
  /** Screen-space X position (0-100%) */
  x: number;
  /** Screen-space Y position (0-100%) */
  y: number;
  timestamp: number;
}

interface Props {
  numbers: DamageNumber[];
}

/**
 * Floating damage numbers overlay. Each number floats upward and fades out.
 * Positioned in screen-space percentages so it works at any resolution.
 */
export function DamageNumbers({ numbers }: Props) {
  return (
    <div className="fixed inset-0 pointer-events-none z-30" aria-hidden="true">
      <AnimatePresence>
        {numbers.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -40 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute text-lg font-bold"
            style={{
              left: `${n.x}%`,
              top: `${n.y}%`,
              color: '#ff4444',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              fontFamily: 'Cinzel, serif',
            }}
          >
            {n.value}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
