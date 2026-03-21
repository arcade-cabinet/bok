import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';

const VIGNETTE_COLOR = 'rgba(139, 26, 26, 0.4)';
const FADE_DURATION = 300;
const SHAKE_INTENSITY = 6;
const SHAKE_DURATION = 150;

export interface DamageIndicatorHandle {
  flash: () => void;
}

interface Props {
  /** Ref to the canvas element for screen shake transforms */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

/**
 * Damage feedback overlay — red radial vignette + canvas screen shake.
 * Ported from dead src/ui/hud/DamageIndicator.ts.
 *
 * Call `flash()` via the imperative handle when the player takes damage.
 */
export const DamageIndicator = forwardRef<DamageIndicatorHandle, Props>(function DamageIndicator({ canvasRef }, ref) {
  const [visible, setVisible] = useState(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeRafRef = useRef<number>(0);

  const shake = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Cancel any in-flight shake
    if (shakeRafRef.current) cancelAnimationFrame(shakeRafRef.current);

    const start = performance.now();
    const originalTransform = canvas.style.transform;

    const step = (now: number) => {
      const elapsed = now - start;
      if (elapsed > SHAKE_DURATION) {
        canvas.style.transform = originalTransform;
        shakeRafRef.current = 0;
        return;
      }

      // Linear decay from 1→0 over SHAKE_DURATION
      const decay = 1 - elapsed / SHAKE_DURATION;
      const dx = (Math.random() * 2 - 1) * SHAKE_INTENSITY * decay;
      const dy = (Math.random() * 2 - 1) * SHAKE_INTENSITY * decay;
      canvas.style.transform = `translate(${dx}px, ${dy}px)`;
      shakeRafRef.current = requestAnimationFrame(step);
    };

    shakeRafRef.current = requestAnimationFrame(step);
  }, [canvasRef]);

  const flash = useCallback(() => {
    // Show vignette immediately
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setVisible(true);

    // Begin fade-out after a brief flash hold (50ms matches dead code)
    fadeTimerRef.current = setTimeout(() => {
      setVisible(false);
      fadeTimerRef.current = null;
    }, 50);

    // Screen shake
    shake();
  }, [shake]);

  useImperativeHandle(ref, () => ({ flash }), [flash]);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-20"
      style={{
        opacity: visible ? 1 : 0,
        transition: visible ? 'none' : `opacity ${FADE_DURATION}ms ease-out`,
        background: `radial-gradient(ellipse at center, transparent 50%, ${VIGNETTE_COLOR} 100%)`,
      }}
    />
  );
});
