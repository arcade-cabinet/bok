/**
 * @module systems/update-chunks
 * @role Update terrain chunks around the player position
 *
 * Reads the player's Transform and calls ChunkWorld.updateAroundPlayer to
 * load/unload terrain chunks as the player moves.
 */
import type { World } from 'koota';
import type { ChunkWorld } from '../engine/chunkWorld';
import { IsPlayer, Transform } from '../traits';

/**
 * Create a chunk update system bound to a specific ChunkWorld instance.
 * The ChunkWorld is created during engine init and passed in via closure.
 */
export function createUpdateChunks(chunkWorld: ChunkWorld): (world: World) => void {
  return function updateChunks(world: World): void {
    const players = world.query(IsPlayer, Transform);
    if (players.length === 0) return;

    const playerTransform = players[0].get(Transform);
    if (!playerTransform) return;

    chunkWorld.updateAroundPlayer(playerTransform.position.x, playerTransform.position.z);
  };
}
