/**
 * Session pause — module-level pause state for the game loop.
 * GameBridge checks this each frame and skips ECS updates when paused.
 * Same module-cache pattern as getSignalMap(), getActiveWards(), etc.
 *
 * No ECS/Three.js/React — just a boolean flag with accessors.
 */

let paused = false;

/** Returns true if the game loop should skip ECS updates. */
export function isGamePaused(): boolean {
	return paused;
}

/** Set the game pause state. Called from visibilitychange handler. */
export function setGamePaused(value: boolean): void {
	paused = value;
}

/** Reset pause state — called from destroyGame(). */
export function resetPauseState(): void {
	paused = false;
}
