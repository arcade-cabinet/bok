import { motion } from 'framer-motion';

interface Props {
  /** Player world X position */
  playerX: number;
  /** Player world Z position */
  playerZ: number;
  /** Player camera Y rotation in radians */
  playerYaw: number;
  /** Boss world position */
  bossPosition: { x: number; y: number; z: number };
}

/**
 * BossCompass — directional indicator pointing toward the boss.
 * Shown after all goals are completed and boss is unlocked but not yet defeated.
 * Renders a small arrow at the bottom-center of the screen that rotates to
 * always point from the player toward the boss, with distance text.
 */
export function BossCompass({ playerX, playerZ, playerYaw, bossPosition }: Props) {
  const dx = bossPosition.x - playerX;
  const dz = bossPosition.z - playerZ;
  const distance = Math.round(Math.sqrt(dx * dx + dz * dz));

  // Angle from player to boss in world space (atan2 gives angle from +Z toward +X)
  const angleToTarget = Math.atan2(dx, dz);

  // Relative angle: subtract player yaw to get screen-space direction
  const relativeAngle = angleToTarget - playerYaw;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-36 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 pointer-events-none"
    >
      {/* Distance text */}
      <div
        className="text-[11px] tabular-nums px-2 py-0.5 rounded bg-[#3a2a1a]/70 border border-[#8b5a2b]/50"
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          color: '#e8c170',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        }}
      >
        {distance}m
      </div>

      {/* Rotating arrow */}
      <div className="w-8 h-8 flex items-center justify-center" style={{ transform: `rotate(${relativeAngle}rad)` }}>
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Directional arrow pointing toward boss"
        >
          <title>Boss direction</title>
          {/* Arrow pointing up (toward boss when relativeAngle=0) */}
          <path
            d="M14 4 L20 18 L14 14 L8 18 Z"
            fill="#c44a4a"
            stroke="#2c1e16"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Glow effect */}
          <path d="M14 4 L20 18 L14 14 L8 18 Z" fill="#c44a4a" opacity="0.4" filter="url(#glow)" />
          <defs>
            <filter id="glow" x="-2" y="-2" width="32" height="32">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>
      </div>

      {/* Label */}
      <div
        className="text-[9px] uppercase tracking-widest"
        style={{
          fontFamily: 'Cinzel, Georgia, serif',
          color: '#c44a4a',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        }}
      >
        Boss
      </div>
    </motion.div>
  );
}
