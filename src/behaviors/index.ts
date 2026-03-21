/**
 * @module behaviors
 * @role JollyPixel ActorComponents for render sync, camera, and visual effects
 * @input Koota entity references, camera, input
 * @output Updated Actor transforms and visual state
 * @depends traits, @jolly-pixel/engine
 * @tested (browser tests)
 */

export { PlayerCameraBehavior } from './PlayerCameraBehavior.ts';
export { RenderSyncBehavior } from './RenderSyncBehavior.ts';
