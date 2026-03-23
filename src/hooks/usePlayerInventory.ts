/**
 * @module hooks/usePlayerInventory
 * @role Manage player resource inventory: add/remove items, afford checks, persistence
 * @input SaveManager for persistence, saveId for inventory table binding
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
 *
 * When saveId and saveManager are provided, inventory is persisted to
 * the SQLite `inventory` table per-resource. On mount it loads existing
 * rows; on every add/remove it writes back immediately.
 */
export function usePlayerInventory(saveManager?: SaveManager | null, saveId?: number): PlayerInventory {
  const [resources, setResources] = useState<Record<string, number>>({ ...DEFAULT_RESOURCES });
  const [equippedWeapon, setEquippedWeaponState] = useState<string | null>(null);
  const stateRef = useRef<InventoryState>({
    resources: { ...DEFAULT_RESOURCES },
    equippedWeapon: null,
  });

  // Load persisted inventory from the dedicated inventory table
  useEffect(() => {
    let cancelled = false;

    if (!saveManager || !saveId) return;

    saveManager
      .getInventory(saveId)
      .then((saved) => {
        if (cancelled) return;
        // If the inventory table has data, use it. Otherwise keep defaults
        // (first session — defaults will be written on first mutation).
        if (Object.keys(saved).length > 0) {
          stateRef.current = { ...stateRef.current, resources: saved };
          setResources(saved);
        } else {
          // First session: seed the inventory table with default resources
          const defaults = { ...DEFAULT_RESOURCES };
          stateRef.current = { ...stateRef.current, resources: defaults };
          setResources(defaults);
          for (const [resourceId, amount] of Object.entries(defaults)) {
            saveManager.setResource(saveId, resourceId, amount).catch(() => {
              // Best-effort seeding
            });
          }
        }
      })
      .catch(() => {
        // Use defaults on failure
      });

    return () => {
      cancelled = true;
    };
  }, [saveManager, saveId]);

  const persistResource = useCallback(
    (resourceId: string, amount: number) => {
      if (!saveManager || !saveId) return;
      saveManager.setResource(saveId, resourceId, amount).catch((err) => {
        console.warn('[usePlayerInventory] Failed to persist resource:', err);
      });
    },
    [saveManager, saveId],
  );

  const addResource = useCallback(
    (itemId: string, amount: number) => {
      const newResources = { ...stateRef.current.resources };
      newResources[itemId] = (newResources[itemId] ?? 0) + amount;
      stateRef.current = { ...stateRef.current, resources: newResources };
      setResources(newResources);
      persistResource(itemId, newResources[itemId]);
    },
    [persistResource],
  );

  const removeResource = useCallback(
    (itemId: string, amount: number): boolean => {
      const current = stateRef.current.resources[itemId] ?? 0;
      if (current < amount) return false;
      const newResources = { ...stateRef.current.resources };
      newResources[itemId] = current - amount;
      stateRef.current = { ...stateRef.current, resources: newResources };
      setResources(newResources);
      persistResource(itemId, newResources[itemId]);
      return true;
    },
    [persistResource],
  );

  const canAfford = useCallback((costs: Record<string, number>): boolean => {
    return Object.entries(costs).every(([resource, amount]) => (stateRef.current.resources[resource] ?? 0) >= amount);
  }, []);

  const getCount = useCallback((itemId: string): number => {
    return stateRef.current.resources[itemId] ?? 0;
  }, []);

  const setEquippedWeapon = useCallback((weaponId: string | null) => {
    stateRef.current = { ...stateRef.current, equippedWeapon: weaponId };
    setEquippedWeaponState(weaponId);
    // Equipped weapon is not stored in inventory table — it's a UI concern
  }, []);

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
