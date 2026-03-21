/**
 * @module hooks/useHubBuildings
 * @role Manage hub building state: levels, resources, proximity detection, and upgrades
 * @input Building definitions from content JSON, player position from engine frame loop
 * @output Building state, nearby building, upgrade function, resource totals
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import buildingsData from '../content/hub/buildings.json';
import type { SaveManager } from '../persistence/index';

// --- Types ported from dead HubScene.ts ---

interface BuildingLevel {
  level: number;
  effect: string;
  cost: Record<string, number>;
}

export interface HubBuilding {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  levels: BuildingLevel[];
  position: { x: number; y: number; z: number };
}

export interface HubBuildingState {
  buildingLevels: Record<string, number>;
  resources: Record<string, number>;
}

export interface NearbyBuilding {
  building: HubBuilding;
  currentLevel: number;
  currentEffect: string;
  nextLevel: BuildingLevel | null;
  isMaxLevel: boolean;
  canAfford: boolean;
}

export interface UseHubBuildingsResult {
  ready: boolean;
  buildings: HubBuilding[];
  resources: Record<string, number>;
  nearbyBuilding: NearbyBuilding | null;
  /** Call each frame with player world position to update proximity. */
  updatePlayerPosition: (px: number, pz: number) => void;
  /** Attempt to upgrade the nearby building. Returns true on success. */
  upgradeBuilding: (buildingId: string) => boolean;
}

const INTERACTION_RANGE = 3;

const ALL_BUILDINGS: HubBuilding[] = buildingsData as HubBuilding[];

/**
 * Hub building progression hook.
 *
 * Ported from dead `src/scenes/HubScene.ts` building interaction system.
 * Manages building levels, resource tracking, proximity detection, and upgrades.
 * State is persisted via SaveManager when a saveManager is provided.
 */
export function useHubBuildings(saveManager?: SaveManager | null): UseHubBuildingsResult {
  const [ready, setReady] = useState(false);
  const [resources, setResources] = useState<Record<string, number>>({ wood: 500, stone: 500 });
  const [, setBuildingLevels] = useState<Record<string, number>>({});
  const [nearbyBuilding, setNearbyBuilding] = useState<NearbyBuilding | null>(null);

  // Mutable refs for frame-loop access (avoids re-renders per frame)
  const stateRef = useRef<HubBuildingState>({ buildingLevels: {}, resources: { wood: 500, stone: 500 } });

  // Load persisted state
  useEffect(() => {
    let cancelled = false;

    if (!saveManager) {
      // No persistence — use defaults and mark ready
      setReady(true);
      return;
    }

    saveManager
      .loadState()
      .then((state) => {
        if (cancelled) return;
        if (state?.koota && typeof state.koota === 'object') {
          const saved = state.koota as { hubState?: HubBuildingState };
          if (saved.hubState) {
            stateRef.current = saved.hubState;
            setBuildingLevels(saved.hubState.buildingLevels);
            setResources(saved.hubState.resources);
          }
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [saveManager]);

  // Proximity detection — called from the frame loop via ref to avoid re-renders per frame.
  // Only triggers a React state update when the nearby building changes.
  const prevNearbyIdRef = useRef<string | null>(null);

  const updatePlayerPosition = useCallback((px: number, pz: number) => {
    let closest: HubBuilding | null = null;
    let closestDist = INTERACTION_RANGE;

    for (const building of ALL_BUILDINGS) {
      // Building positions in content JSON are relative to hub center (±offset).
      // The live engine (hub.ts) places buildings at absolute grid coords defined in BUILDINGS array.
      // We use the building name to look up the engine position instead.
      // For proximity, we match against the content JSON positions shifted to world space.
      // HubScene.ts used: bx = position.x + HUB_SIZE/2, bz = position.z + HUB_SIZE/2
      const bx = building.position.x + 16; // HUB_SIZE / 2 = 16
      const bz = building.position.z + 16;
      const dx = px - bx;
      const dz = pz - bz;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < closestDist) {
        closestDist = dist;
        closest = building;
      }
    }

    const newId = closest?.id ?? null;
    if (newId !== prevNearbyIdRef.current) {
      prevNearbyIdRef.current = newId;

      if (!closest) {
        setNearbyBuilding(null);
      } else {
        const levels = stateRef.current.buildingLevels;
        const res = stateRef.current.resources;
        const currentLevel = levels[closest.id] ?? 1;
        const currentLevelDef = closest.levels.find((l) => l.level === currentLevel);
        const nextLevel = closest.levels.find((l) => l.level === currentLevel + 1) ?? null;
        const isMaxLevel = currentLevel >= closest.maxLevel;

        let canAfford = false;
        if (nextLevel) {
          canAfford = Object.entries(nextLevel.cost).every(([resource, amount]) => (res[resource] ?? 0) >= amount);
        }

        setNearbyBuilding({
          building: closest,
          currentLevel,
          currentEffect: currentLevelDef?.effect ?? '',
          nextLevel,
          isMaxLevel,
          canAfford,
        });
      }
    }
  }, []);

  const upgradeBuilding = useCallback(
    (buildingId: string): boolean => {
      const building = ALL_BUILDINGS.find((b) => b.id === buildingId);
      if (!building) return false;

      const state = stateRef.current;
      const currentLevel = state.buildingLevels[buildingId] ?? 1;
      const nextLevel = building.levels.find((l) => l.level === currentLevel + 1);
      if (!nextLevel) return false;

      // Check resources
      for (const [resource, amount] of Object.entries(nextLevel.cost)) {
        if ((state.resources[resource] ?? 0) < amount) return false;
      }

      // Deduct resources
      const newResources = { ...state.resources };
      for (const [resource, amount] of Object.entries(nextLevel.cost)) {
        newResources[resource] = (newResources[resource] ?? 0) - amount;
      }

      // Level up
      const newLevels = { ...state.buildingLevels, [buildingId]: currentLevel + 1 };

      // Update mutable ref + React state
      stateRef.current = { buildingLevels: newLevels, resources: newResources };
      setBuildingLevels(newLevels);
      setResources(newResources);

      // Refresh nearby building info
      prevNearbyIdRef.current = null; // Force re-evaluation on next frame

      // Persist
      if (saveManager) {
        saveManager
          .saveState({
            koota: { hubState: stateRef.current },
            yuka: null,
            scene: 'hub',
          })
          .catch((err) => {
            console.warn('[useHubBuildings] Failed to save hub state:', err);
          });
      }

      return true;
    },
    [saveManager],
  );

  return {
    ready,
    buildings: ALL_BUILDINGS,
    resources,
    nearbyBuilding,
    updatePlayerPosition,
    upgradeBuilding,
  };
}
