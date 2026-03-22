import { useEffect, useRef, useState } from 'react';
import { createPlayerGovernor, type GovernorOutput, type PlayerGovernor, type ThreatLevel } from '../ai/index';

export interface PlayerGovernorState {
  suggestedTarget: number;
  threatLevel: ThreatLevel;
  canDodge: boolean;
}

/**
 * React hook wrapping the PlayerGovernor.
 * Returns the governor instance (for the engine to call setContext + update)
 * and the latest recommendation state for the HUD.
 */
export function usePlayerGovernor() {
  const governorRef = useRef<PlayerGovernor | null>(null);
  const [state, setState] = useState<PlayerGovernorState>({
    suggestedTarget: -1,
    threatLevel: 'none',
    canDodge: true,
  });

  useEffect(() => {
    governorRef.current = createPlayerGovernor();
    return () => {
      governorRef.current = null;
    };
  }, []);

  return {
    governor: governorRef,
    suggestedTarget: state.suggestedTarget,
    threatLevel: state.threatLevel,
    canDodge: state.canDodge,
    /** Call from the engine polling interval to push latest output to React */
    pushOutput(output: GovernorOutput) {
      setState((prev) => {
        if (
          prev.suggestedTarget === output.suggestedTarget &&
          prev.threatLevel === output.threatLevel &&
          prev.canDodge === output.canDodge
        )
          return prev;
        return output;
      });
    },
  };
}
