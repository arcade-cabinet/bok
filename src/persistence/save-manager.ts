/**
 * Save/Load Manager
 *
 * Uses localStorage for web builds as the primary storage backend.
 * Designed to be swapped to Capacitor-SQLite for native builds.
 *
 * Save format:
 * {
 *   version: 1,
 *   seed: string,
 *   player: { position, health, hunger, stamina, inventory, hotbar, quest },
 *   worldTime: { timeOfDay, dayCount },
 *   voxelWorld: VoxelWorldJSON (from Jolly Pixel serializer)
 * }
 */

const SAVE_KEY_PREFIX = "bok_save_";
const MAX_SAVE_SLOTS = 3;

export interface SaveSlot {
  id: number;
  name: string;
  seed: string;
  timestamp: number;
  dayCount: number;
}

export interface GameSaveData {
  version: number;
  seed: string;
  player: {
    position: { x: number; y: number; z: number };
    health: number;
    hunger: number;
    stamina: number;
    inventory: Record<string, number>;
    hotbar: { slots: unknown[]; activeSlot: number };
    quest: { step: number; progress: number };
  };
  worldTime: {
    timeOfDay: number;
    dayCount: number;
  };
  voxelWorld: unknown;
}

/**
 * List all save slots.
 */
export function listSaveSlots(): SaveSlot[] {
  const slots: SaveSlot[] = [];
  for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
    const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${i}`);
    if (raw) {
      try {
        const data = JSON.parse(raw) as GameSaveData;
        slots.push({
          id: i,
          name: `Save ${i + 1}`,
          seed: data.seed,
          timestamp: parseInt(localStorage.getItem(`${SAVE_KEY_PREFIX}${i}_ts`) || "0", 10),
          dayCount: data.worldTime?.dayCount ?? 1,
        });
      } catch {
        // Corrupted save — skip
      }
    }
  }
  return slots;
}

/**
 * Save game state to a slot.
 */
export function saveToSlot(slotId: number, data: GameSaveData): void {
  if (slotId < 0 || slotId >= MAX_SAVE_SLOTS) return;
  try {
    localStorage.setItem(`${SAVE_KEY_PREFIX}${slotId}`, JSON.stringify(data));
    localStorage.setItem(`${SAVE_KEY_PREFIX}${slotId}_ts`, Date.now().toString());
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.error("Save failed: localStorage quota exceeded. Try deleting old saves.");
    } else {
      console.error("Failed to save game:", error);
    }
  }
}

/**
 * Load game state from a slot.
 */
export function loadFromSlot(slotId: number): GameSaveData | null {
  const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${slotId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameSaveData;
  } catch {
    return null;
  }
}

/**
 * Delete a save slot.
 */
export function deleteSlot(slotId: number): void {
  if (slotId < 0 || slotId >= MAX_SAVE_SLOTS) return;
  localStorage.removeItem(`${SAVE_KEY_PREFIX}${slotId}`);
  localStorage.removeItem(`${SAVE_KEY_PREFIX}${slotId}_ts`);
}

/**
 * Auto-save to slot 0.
 */
export function autoSave(data: GameSaveData): void {
  saveToSlot(0, data);
}
