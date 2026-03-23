/**
 * @module hooks/useGameLifecycle
 * @role Canvas ref management, engine init/cleanup, keyboard shortcuts, auto-save
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TouchControlOutput } from '../components/ui/TouchControls';
import type { GameInstance } from '../engine/GameEngine';
import { initGame } from '../engine/GameEngine';
import type { EngineEvent } from '../engine/types';
import type { SerializedGameState } from '../persistence/GameStateSerializer.ts';
import { SaveManager } from '../persistence/SaveManager.ts';

const AUTO_SAVE_INTERVAL_MS = 60_000;

export interface GameLifecycleResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  gameRef: React.RefObject<GameInstance | null>;
  showTome: boolean;
  setShowTome: React.Dispatch<React.SetStateAction<boolean>>;
  handleResume: () => void;
  handleTouchOutput: (output: TouchControlOutput) => void;
}

/**
 * Save a snapshot of the running game to the persistence layer.
 * Fails silently — save errors must not crash the game loop.
 */
async function performAutoSave(game: GameInstance, saveManager: SaveManager): Promise<void> {
  try {
    const snapshot = game.captureSnapshot();
    await saveManager.saveGameState(snapshot);
  } catch (err) {
    console.warn('[Bok] Auto-save failed:', err);
  }
}

/**
 * Manages engine lifecycle: canvas ref, init/cleanup, keyboard shortcuts, canvas resize.
 * Also wires auto-save on pause and periodic 60-second auto-save.
 * Returns refs and state needed by other game hooks and the view.
 */
export function useGameLifecycle(
  config: {
    biome: string;
    seed: string;
    mode?: string;
    saveId?: number;
    restoredDeltas?: Array<{ x: number; y: number; z: number; blockId: number }>;
    restoredGoalIds?: string[];
    /** Set to true once persistence data is loaded (delays engine init until ready) */
    persistenceReady?: boolean;
  },
  onEngineEvent: (event: EngineEvent) => void,
  screenWidth: number,
  screenHeight: number,
  _savedState?: SerializedGameState | null,
): GameLifecycleResult {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameInstance | null>(null);
  const saveManagerRef = useRef<SaveManager | null>(null);
  const [showTome, setShowTome] = useState(false);

  // Stable ref for the event callback to avoid stale closures in the init effect
  const onEngineEventRef = useRef(onEngineEvent);
  onEngineEventRef.current = onEngineEvent;

  // Initialize SaveManager once
  useEffect(() => {
    SaveManager.createInMemory().then((mgr) => {
      saveManagerRef.current = mgr;
    });
  }, []);

  // Initialize engine — waits for persistence data to load before starting
  const persistenceReady = config.persistenceReady ?? true;
  useEffect(() => {
    if (!canvasRef.current || gameRef.current || !persistenceReady) return;

    initGame(canvasRef.current, {
      biome: config.biome,
      seed: config.seed,
      mode: (config.mode as 'creative' | 'survival') ?? 'survival',
      saveId: config.saveId,
      restoredDeltas: config.restoredDeltas,
      restoredGoalIds: config.restoredGoalIds,
    }).then((game) => {
      gameRef.current = game;
      game.onEvent((event: EngineEvent) => onEngineEventRef.current(event));
    });

    return () => {
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, [
    config.biome,
    config.seed,
    config.mode,
    config.saveId,
    config.restoredDeltas,
    config.restoredGoalIds,
    persistenceReady,
  ]);

  // Periodic auto-save every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const game = gameRef.current;
      const mgr = saveManagerRef.current;
      if (game && mgr) {
        const state = game.getState();
        if (state.phase === 'playing') {
          performAutoSave(game, mgr);
        }
      }
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts: Escape → pause (+ auto-save), Tab → tome browser
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (showTome) {
          setShowTome(false);
        } else {
          const game = gameRef.current;
          game?.togglePause();
          // Auto-save when pausing (not unpausing)
          const mgr = saveManagerRef.current;
          if (game && mgr) {
            const state = game.getState();
            if (state.paused) {
              performAutoSave(game, mgr);
            }
          }
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

  // Clear save on death/victory (run is over)
  useEffect(() => {
    const wrappedOnEvent = onEngineEventRef.current;
    onEngineEventRef.current = (event: EngineEvent) => {
      wrappedOnEvent(event);
      if (event.type === 'playerDied' || event.type === 'bossDefeated') {
        const mgr = saveManagerRef.current;
        if (mgr) {
          mgr.clearGameState().catch((err) => {
            console.warn('[Bok] Failed to clear save on run end:', err);
          });
        }
      }
    };
  }, []);

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
