/**
 * Invisible split-half touch controls.
 *
 * Left half: drag = movement (relative to drag origin)
 * Right half: drag = camera look (continuous from position)
 *
 * No visible joystick widgets. Clean, invisible, responsive.
 * Action buttons are a SEPARATE component (ActionPanel).
 */
import { useCallback, useEffect, useRef } from 'react';

export interface TouchControlOutput {
  moveX: number; // -1 to 1
  moveZ: number; // -1 to 1 (negative = forward, matches desktop WASD)
  lookX: number; // -1 to 1 (continuous rotation rate)
  lookY: number; // -1 to 1 (continuous rotation rate)
}

interface TouchState {
  id: number | null;
  originX: number;
  originY: number;
  currentX: number;
  currentY: number;
}

const MOVE_RADIUS = 60; // pixels from origin = full speed
const LOOK_SENSITIVITY = 0.8; // multiplier for look delta → rate

interface Props {
  onOutput: (o: TouchControlOutput) => void;
  enabled: boolean;
}

export function TouchControls({ onOutput, enabled }: Props) {
  const moveRef = useRef<TouchState>({ id: null, originX: 0, originY: 0, currentX: 0, currentY: 0 });
  const lookRef = useRef<TouchState>({ id: null, originX: 0, originY: 0, currentX: 0, currentY: 0 });
  const outputRef = useRef<TouchControlOutput>({ moveX: 0, moveZ: 0, lookX: 0, lookY: 0 });
  const rafRef = useRef<number>(0);

  // Continuous output loop — reads current touch positions each frame
  const tick = useCallback(() => {
    const m = moveRef.current;
    const l = lookRef.current;

    if (m.id !== null) {
      const dx = m.currentX - m.originX;
      const dy = m.currentY - m.originY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clampedDist = Math.min(dist, MOVE_RADIUS);
      if (dist > 2) {
        const angle = Math.atan2(dy, dx);
        outputRef.current.moveX = (Math.cos(angle) * clampedDist) / MOVE_RADIUS;
        outputRef.current.moveZ = (Math.sin(angle) * clampedDist) / MOVE_RADIUS; // positive Y = positive Z = backward (matches WASD S key)
      } else {
        outputRef.current.moveX = 0;
        outputRef.current.moveZ = 0;
      }
    } else {
      outputRef.current.moveX = 0;
      outputRef.current.moveZ = 0;
    }

    if (l.id !== null) {
      // Look: distance from origin determines rotation rate
      const dx = l.currentX - l.originX;
      const dy = l.currentY - l.originY;
      outputRef.current.lookX = (dx / 80) * LOOK_SENSITIVITY; // Normalize to roughly -1..1
      outputRef.current.lookY = (dy / 80) * LOOK_SENSITIVITY;
    } else {
      outputRef.current.lookX = 0;
      outputRef.current.lookY = 0;
    }

    onOutput({ ...outputRef.current });
    rafRef.current = requestAnimationFrame(tick);
  }, [onOutput]);

  useEffect(() => {
    if (!enabled) return;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled, tick]);

  // Touch handlers on the full-screen canvas
  useEffect(() => {
    if (!enabled) return;

    // Find whichever canvas is active (game-canvas or hub-canvas)
    const canvas = document.getElementById('game-canvas') || document.getElementById('hub-canvas');
    if (!canvas) return;

    const onStart = (e: globalThis.TouchEvent) => {
      e.preventDefault();
      const halfW = window.innerWidth / 2;

      for (const t of Array.from(e.changedTouches)) {
        if (t.clientX < halfW && moveRef.current.id === null) {
          moveRef.current = {
            id: t.identifier,
            originX: t.clientX,
            originY: t.clientY,
            currentX: t.clientX,
            currentY: t.clientY,
          };
        } else if (t.clientX >= halfW && lookRef.current.id === null) {
          lookRef.current = {
            id: t.identifier,
            originX: t.clientX,
            originY: t.clientY,
            currentX: t.clientX,
            currentY: t.clientY,
          };
        }
      }
    };

    const onMove = (e: globalThis.TouchEvent) => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === moveRef.current.id) {
          moveRef.current.currentX = t.clientX;
          moveRef.current.currentY = t.clientY;
        }
        if (t.identifier === lookRef.current.id) {
          lookRef.current.currentX = t.clientX;
          lookRef.current.currentY = t.clientY;
        }
      }
    };

    const onEnd = (e: globalThis.TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === moveRef.current.id) {
          moveRef.current.id = null;
        }
        if (t.identifier === lookRef.current.id) {
          lookRef.current.id = null;
        }
      }
    };

    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd);
    canvas.addEventListener('touchcancel', onEnd);

    return () => {
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onEnd);
      canvas.removeEventListener('touchcancel', onEnd);
    };
  }, [enabled]);

  // Invisible — no DOM rendered
  return null;
}
