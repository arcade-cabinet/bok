import { motion } from 'framer-motion';
import { useEffect } from 'react';

const SAIL_DURATION = 4; // seconds

interface Props {
  biomeName: string;
  onComplete: () => void;
}

/**
 * Full-screen sailing transition — boat crosses left-to-right over an
 * ocean gradient while "Sailing to {biomeName}..." text is displayed.
 * Auto-completes after SAIL_DURATION seconds.
 *
 * Ported from dead src/scenes/SailingScene.ts.
 */
export function SailingTransition({ biomeName, onComplete }: Props) {
  useEffect(() => {
    const timer = setTimeout(onComplete, SAIL_DURATION * 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #87CEEB 0%, #1a6fa0 40%, #0d3b66 100%)',
      }}
    >
      {/* Water layer — bottom 40% */}
      <div
        className="absolute bottom-0 w-full"
        style={{
          height: '40%',
          background: 'linear-gradient(180deg, #1a6fa0 0%, #0a2540 100%)',
        }}
      />

      {/* Animated sailboat — crosses from left to right */}
      <motion.div
        className="absolute text-6xl"
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
