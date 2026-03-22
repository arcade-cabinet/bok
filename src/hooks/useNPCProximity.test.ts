import { describe, expect, it } from 'vitest';

/**
 * Pure-logic tests for NPC proximity detection.
 *
 * Since useNPCProximity is a React hook, we extract the core distance logic
 * and test it directly to avoid needing DOM/React rendering infrastructure.
 * This matches the project's testing philosophy: no mock-heavy unit tests for
 * DOM/rendering code (those use browser tests).
 */

/** Interaction range matching the hook constant. */
const NPC_INTERACTION_RANGE = 3;

interface NPCPos {
  id: string;
  x: number;
  z: number;
}

/**
 * Core proximity logic extracted from useNPCProximity.
 * Finds the nearest NPC within interaction range.
 */
function findNearestNPC(playerX: number, playerZ: number, npcs: NPCPos[]): NPCPos | null {
  let closest: NPCPos | null = null;
  let closestDist = NPC_INTERACTION_RANGE;

  for (const npc of npcs) {
    const dx = playerX - npc.x;
    const dz = playerZ - npc.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < closestDist) {
      closestDist = dist;
      closest = npc;
    }
  }

  return closest;
}

describe('NPC Proximity Detection', () => {
  const shopkeeper: NPCPos = { id: 'shopkeeper', x: 13, z: 10 };
  const blacksmith: NPCPos = { id: 'blacksmith', x: 30, z: 11 };
  const scholar: NPCPos = { id: 'scholar', x: 23, z: 6 };
  const navigator: NPCPos = { id: 'navigator', x: 3, z: 26 };

  const allNPCs = [shopkeeper, blacksmith, scholar, navigator];

  it('returns null when no NPC is within range', () => {
    // Player is far from all NPCs
    const result = findNearestNPC(0, 0, allNPCs);
    expect(result).toBeNull();
  });

  it('returns the nearest NPC when player is within range', () => {
    // Player is right next to the shopkeeper
    const result = findNearestNPC(13.5, 10.5, allNPCs);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('shopkeeper');
  });

  it('returns the closest NPC when multiple are within range', () => {
    // Place two NPCs close together
    const closeNPCs: NPCPos[] = [
      { id: 'npc-a', x: 10, z: 10 },
      { id: 'npc-b', x: 11, z: 10 },
    ];

    // Player at 10.8, 10 — closer to npc-b (0.2) than npc-a (0.8)
    const result = findNearestNPC(10.8, 10, closeNPCs);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('npc-b');
  });

  it('returns null when player is exactly at the boundary (equal to range)', () => {
    // Place player exactly 3 units away
    const npc: NPCPos = { id: 'boundary-npc', x: 10, z: 10 };
    // Distance of exactly 3 units along X axis
    const result = findNearestNPC(13, 10, [npc]);
    // At exactly the boundary distance (3.0), the condition is < not <=, so null
    expect(result).toBeNull();
  });

  it('returns NPC when player is just inside the boundary', () => {
    const npc: NPCPos = { id: 'inside-npc', x: 10, z: 10 };
    // Distance of 2.99 units — just inside the range
    const result = findNearestNPC(12.99, 10, [npc]);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('inside-npc');
  });

  it('returns null for an empty NPC list', () => {
    const result = findNearestNPC(10, 10, []);
    expect(result).toBeNull();
  });
});
