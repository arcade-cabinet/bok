/**
 * @module components/hud/BossPhaseAnnouncement
 * @role Full-screen dramatic text overlay during boss phase transitions
 */
import { useEffect, useState } from 'react';

interface Props {
  /** Announcement text — e.g. "Ancient Treant enrages!" — null hides */
  text: string | null;
  /** Called after the announcement fades out */
  onDone: () => void;
}

const DISPLAY_DURATION_MS = 2000;
const FADE_IN_MS = 200;
const FADE_OUT_MS = 400;

/**
 * Shows a dramatic centered text announcement for boss phase transitions.
 * Auto-dismisses after 2 seconds with fade-in/fade-out animation.
 */
export function BossPhaseAnnouncement({ text, onDone }: Props) {
  const [opacity, setOpacity] = useState(0);
  const [currentText, setCurrentText] = useState<string | null>(null);

  useEffect(() => {
    if (!text) return;

    setCurrentText(text);
    // Fade in
    requestAnimationFrame(() => setOpacity(1));

    // Start fade out after display duration
    const fadeTimer = setTimeout(() => {
      setOpacity(0);
    }, DISPLAY_DURATION_MS);

    // Remove after fade completes
    const removeTimer = setTimeout(() => {
      setCurrentText(null);
      onDone();
    }, DISPLAY_DURATION_MS + FADE_OUT_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [text, onDone]);

  if (!currentText) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center"
      aria-live="assertive"
      role="alert"
    >
      <div
        className="text-center px-8"
        style={{
          opacity,
          transition: `opacity ${opacity === 1 ? FADE_IN_MS : FADE_OUT_MS}ms ease-${opacity === 1 ? 'out' : 'in'}`,
        }}
      >
        <div
          className="text-3xl md:text-5xl font-bold uppercase tracking-[0.2em] drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
          style={{
            fontFamily: 'Cinzel, Georgia, serif',
            color: '#ff4444',
            textShadow: '0 0 20px rgba(255,68,68,0.6), 0 0 40px rgba(255,0,0,0.3), 0 2px 4px rgba(0,0,0,0.8)',
          }}
        >
          {currentText.toUpperCase()}
        </div>
      </div>
    </div>
  );
}
