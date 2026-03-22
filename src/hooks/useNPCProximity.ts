/**
 * @module hooks/useNPCProximity
 * @role Track player distance to hub NPCs, return nearest NPC within interaction range
 * @input Player position (from camera), NPC entity list
 * @output Nearest NPC within range or null, updated at 10fps
 */
import { useCallback, useRef, useState } from 'react';
import type { NPCEntity } from '../engine/npcEntities.ts';

/** Interaction range in world units. */
const NPC_INTERACTION_RANGE = 3;

export interface UseNPCProximityResult {
  /** Nearest NPC within interaction range, or null if none. */
  nearbyNPC: NPCEntity | null;
  /** Call each frame with player world position to update proximity. */
  updatePlayerPosition: (px: number, pz: number) => void;
}

/**
 * NPC proximity hook for the hub island.
 *
 * Uses the same pattern as `useHubBuildings`: a mutable ref tracks the
 * previous nearby NPC ID so React state only updates when the nearest NPC
 * changes, avoiding per-frame re-renders.
 */
export function useNPCProximity(npcs: NPCEntity[]): UseNPCProximityResult {
  const [nearbyNPC, setNearbyNPC] = useState<NPCEntity | null>(null);
  const prevNearbyIdRef = useRef<string | null>(null);
  const npcsRef = useRef(npcs);
  npcsRef.current = npcs;

  const updatePlayerPosition = useCallback((px: number, pz: number) => {
    const currentNPCs = npcsRef.current;
    if (currentNPCs.length === 0) {
      if (prevNearbyIdRef.current !== null) {
        prevNearbyIdRef.current = null;
        setNearbyNPC(null);
      }
      return;
    }

    let closest: NPCEntity | null = null;
    let closestDist = NPC_INTERACTION_RANGE;

    for (const npc of currentNPCs) {
      const dx = px - npc.worldPos.x;
      const dz = pz - npc.worldPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < closestDist) {
        closestDist = dist;
        closest = npc;
      }
    }

    const newId = closest?.id ?? null;
    if (newId !== prevNearbyIdRef.current) {
      prevNearbyIdRef.current = newId;
      setNearbyNPC(closest);
    }
  }, []);

  return { nearbyNPC, updatePlayerPosition };
}
