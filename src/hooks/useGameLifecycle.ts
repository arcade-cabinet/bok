/**
 * @module hooks/useGameLifecycle
 * @role Canvas ref management, engine init/cleanup, keyboard shortcuts
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TouchControlOutput } from '../components/ui/TouchControls';
import type { GameInstance } from '../engine/GameEngine';
import { initGame } from '../engine/GameEngine';
import type { EngineEvent } from '../engine/types';

export interface GameLifecycleResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  gameRef: React.RefObject<GameInstance | null>;
  showTome: boolean;
  setShowTome: React.Dispatch<React.SetStateAction<boolean>>;
  handleResume: () => void;
  handleTouchOutput: (output: TouchControlOutput) => void;
}

/**
 * Manages engine lifecycle: canvas ref, init/cleanup, keyboard shortcuts, canvas resize.
 * Returns refs and state needed by other game hooks and the view.
 */
export function useGameLifecycle(
  config: { biome: string; seed: string },
  onEngineEvent: (event: EngineEvent) => void,
  screenWidth: number,
  screenHeight: number,
): GameLifecycleResult {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameInstance | null>(null);
  const [showTome, setShowTome] = useState(false);

  // Stable ref for the event callback to avoid stale closures in the init effect
  const onEngineEventRef = useRef(onEngineEvent);
  onEngineEventRef.current = onEngineEvent;

  // Initialize engine
  useEffect(() => {
    if (!canvasRef.current || gameRef.current) return;

    initGame(canvasRef.current, { biome: config.biome, seed: config.seed }).then((game) => {
      gameRef.current = game;
      game.onEvent((event: EngineEvent) => onEngineEventRef.current(event));
    });

    return () => {
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, [config.biome, config.seed]);

  // Keyboard shortcuts: Escape → pause, Tab → tome browser
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (showTome) {
          setShowTome(false);
        } else {
          gameRef.current?.togglePause();
        }
      }
      if (e.code === 'Tab') {
        e.preventDefault();
        setShowTome((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showTome]);

  // Resize canvas on orientation/screen change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = screenWidth * devicePixelRatio;
    canvas.height = screenHeight * devicePixelRatio;
  }, [screenWidth, screenHeight]);

  const handleResume = useCallback(() => {
    gameRef.current?.togglePause();
  }, []);

  const handleTouchOutput = useCallback((output: TouchControlOutput) => {
    gameRef.current?.setMobileInput({ ...output, action: null });
  }, []);

  return {
    canvasRef,
    gameRef,
    showTome,
    setShowTome,
    handleResume,
    handleTouchOutput,
  };
}
