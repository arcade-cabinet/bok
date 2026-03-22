/**
 * @module hooks/usePlayerInventory
 * @role Manage player resource inventory: add/remove items, afford checks, persistence
 * @input SaveManager for persistence, optional initial resources
 * @output PlayerInventory interface with resource management methods
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SaveManager } from '../persistence/index.ts';

export interface PlayerInventory {
  resources: Record<string, number>;
  equippedWeapon: string | null;
  addResource: (itemId: string, amount: number) => void;
  removeResource: (itemId: string, amount: number) => boolean;
  canAfford: (costs: Record<string, number>) => boolean;
  getCount: (itemId: string) => number;
  setEquippedWeapon: (weaponId: string | null) => void;
}

const DEFAULT_RESOURCES: Record<string, number> = { wood: 100, stone: 100 };

interface InventoryState {
  resources: Record<string, number>;
  equippedWeapon: string | null;
}

/**
 * Player inventory hook.
 *
 * Manages resource counts and equipped weapon. Players start with
 * wood=100, stone=100 — enough for first building upgrades.
 * State is persisted via SaveManager when provided.
 */
export function usePlayerInventory(saveManager?: SaveManager | null): PlayerInventory {
  const [resources, setResources] = useState<Record<string, number>>({ ...DEFAULT_RESOURCES });
  const [equippedWeapon, setEquippedWeaponState] = useState<string | null>(null);
  const stateRef = useRef<InventoryState>({
    resources: { ...DEFAULT_RESOURCES },
    equippedWeapon: null,
  });

  // Load persisted state
  useEffect(() => {
    let cancelled = false;

    if (!saveManager) return;

    saveManager
      .loadState()
      .then((state) => {
        if (cancelled) return;
        if (state?.koota && typeof state.koota === 'object') {
          const saved = state.koota as { inventoryState?: InventoryState };
          if (saved.inventoryState) {
            stateRef.current = saved.inventoryState;
            setResources(saved.inventoryState.resources);
            setEquippedWeaponState(saved.inventoryState.equippedWeapon);
          }
        }
      })
      .catch(() => {
        // Use defaults on failure
      });

    return () => {
      cancelled = true;
    };
  }, [saveManager]);

  const persist = useCallback(() => {
    if (!saveManager) return;
    saveManager
      .saveState({
        koota: { inventoryState: stateRef.current },
        yuka: null,
        scene: 'hub',
      })
      .catch((err) => {
        console.warn('[usePlayerInventory] Failed to save inventory:', err);
      });
  }, [saveManager]);

  const addResource = useCallback(
    (itemId: string, amount: number) => {
      const newResources = { ...stateRef.current.resources };
      newResources[itemId] = (newResources[itemId] ?? 0) + amount;
      stateRef.current = { ...stateRef.current, resources: newResources };
      setResources(newResources);
      persist();
    },
    [persist],
  );

  const removeResource = useCallback(
    (itemId: string, amount: number): boolean => {
      const current = stateRef.current.resources[itemId] ?? 0;
      if (current < amount) return false;
      const newResources = { ...stateRef.current.resources };
      newResources[itemId] = current - amount;
      stateRef.current = { ...stateRef.current, resources: newResources };
      setResources(newResources);
      persist();
      return true;
    },
    [persist],
  );

  const canAfford = useCallback((costs: Record<string, number>): boolean => {
    return Object.entries(costs).every(([resource, amount]) => (stateRef.current.resources[resource] ?? 0) >= amount);
  }, []);

  const getCount = useCallback((itemId: string): number => {
    return stateRef.current.resources[itemId] ?? 0;
  }, []);

  const setEquippedWeapon = useCallback(
    (weaponId: string | null) => {
      stateRef.current = { ...stateRef.current, equippedWeapon: weaponId };
      setEquippedWeaponState(weaponId);
      persist();
    },
    [persist],
  );

  return {
    resources,
    equippedWeapon,
    addResource,
    removeResource,
    canAfford,
    getCount,
    setEquippedWeapon,
  };
}
