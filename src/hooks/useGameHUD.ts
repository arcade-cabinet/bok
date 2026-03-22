/**
 * @module hooks/useGameHUD
 * @role Polls engine state at 10fps for React HUD (health, stamina, enemies, boss)
 */
import { useEffect, useState } from 'react';
import type { GameInstance } from '../engine/GameEngine';
import type { EngineState } from '../engine/types';

/**
 * Bridges the imperative game loop to React by polling engine state every 100ms.
 * Returns the latest snapshot plus a setter for event-driven immediate updates.
 */
export function useGameHUD(
  gameRef: React.RefObject<GameInstance | null>,
): [EngineState | null, React.Dispatch<React.SetStateAction<EngineState | null>>] {
  const [engineState, setEngineState] = useState<EngineState | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (gameRef.current) {
        setEngineState(gameRef.current.getState());
      }
    }, 100);
    return () => clearInterval(interval);
  }, [gameRef]);

  return [engineState, setEngineState];
}
