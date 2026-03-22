import { motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';

const SAIL_DURATION = 4; // seconds
const REDUCED_MOTION_DURATION = 1; // shorter duration when reduced motion is preferred

interface Props {
  biomeName: string;
  onComplete: () => void;
}

/**
 * Full-screen sailing transition — boat crosses left-to-right over an
 * ocean gradient while "Sailing to {biomeName}..." text is displayed.
 * Auto-completes after SAIL_DURATION seconds.
 * Respects prefers-reduced-motion: skips boat animation and shortens duration.
 *
 * Ported from dead src/scenes/SailingScene.ts.
 */
export function SailingTransition({ biomeName, onComplete }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const duration = prefersReducedMotion ? REDUCED_MOTION_DURATION : SAIL_DURATION;

  useEffect(() => {
    const timer = setTimeout(onComplete, duration * 1000);
    return () => clearTimeout(timer);
  }, [onComplete, duration]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center overflow-hidden"
      role="status"
      aria-label={`Sailing to ${biomeName}`}
      style={{
        background: 'linear-gradient(180deg, #87CEEB 0%, #1a6fa0 40%, #0d3b66 100%)',
      }}
    >
      {/* Water layer — bottom 40% */}
      <div
        className="absolute bottom-0 w-full"
        aria-hidden="true"
        style={{
          height: '40%',
          background: 'linear-gradient(180deg, #1a6fa0 0%, #0a2540 100%)',
        }}
      />

      {/* Animated sailboat — crosses from left to right (skipped if reduced motion) */}
      {!prefersReducedMotion && (
        <motion.div
          className="absolute text-6xl"
          aria-hidden="true"
          style={{
            bottom: '38%',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
          }}
          initial={{ left: '-10%' }}
          animate={{ left: '110%' }}
          transition={{ duration: SAIL_DURATION, ease: 'linear' }}
        >
          ⛵
        </motion.div>
      )}

      {/* Sailing text */}
      <div
        className="relative z-[1] text-3xl tracking-wider"
        style={{
          fontFamily: '"Cinzel", Georgia, serif',
          color: '#fdf6e3',
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}
      >
        Sailing to {biomeName}...
      </div>
    </div>
  );
}
