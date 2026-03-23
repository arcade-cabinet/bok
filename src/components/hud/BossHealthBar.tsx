/**
 * @module components/hud/BossHealthBar
 * @role Prominent boss health bar at top-center of screen
 * @input Boss health percentage, phase number, boss name, visibility flag
 * @output Full-width boss health bar with name and phase indicator
 */

interface Props {
  bossName: string;
  healthPct: number;
  phase: number;
  visible: boolean;
  isMobile?: boolean;
}

/** Roman numeral phase labels. */
const PHASE_LABELS = ['', 'I', 'II', 'III', 'IV', 'V'];

/** Boss health bar gradient: red at low HP, orange-red at mid, deep red at high. */
function getBarGradient(pct: number): string {
  if (pct > 0.5) return 'linear-gradient(90deg, #b91c1c, #dc2626)';
  if (pct > 0.25) return 'linear-gradient(90deg, #c2410c, #ea580c)';
  return 'linear-gradient(90deg, #991b1b, #b91c1c)';
}

export function BossHealthBar({ bossName, healthPct, phase, visible, isMobile }: Props) {
  if (!visible || healthPct <= 0) return null;

  const phaseLabel = PHASE_LABELS[phase] ?? `${phase}`;

  return (
    <div
      className={`absolute ${isMobile ? 'top-14' : 'top-8'} left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-30`}
      style={{ marginTop: 'env(safe-area-inset-top)' }}
    >
      {/* Boss name */}
      <div
        className="text-center text-sm mb-1 tracking-wider uppercase"
        style={{
          fontFamily: 'Cinzel, Georgia, serif',
          color: '#fdf6e3',
          textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 12px rgba(139,0,0,0.4)',
        }}
      >
        {bossName}
        {phase > 1 && (
          <span className="ml-2 text-xs text-red-300/80" style={{ fontFamily: 'Georgia, serif' }}>
            Phase {phaseLabel}
          </span>
        )}
      </div>
      {/* Health bar container */}
      <div className="w-full h-3 bg-[#1a0a0a] rounded-sm overflow-hidden border border-[#8b2020]/60 shadow-[0_0_8px_rgba(139,0,0,0.3)]">
        <div
          className="h-full rounded-sm transition-all duration-300"
          style={{
            width: `${healthPct * 100}%`,
            background: getBarGradient(healthPct),
          }}
        />
      </div>
    </div>
  );
}
