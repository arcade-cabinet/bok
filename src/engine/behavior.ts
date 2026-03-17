/**
 * Behavior base class — local replacement for @jolly-pixel/engine Behavior.
 *
 * Provides the lifecycle contract: awake() runs once, update(dt) runs each frame.
 * The game loop calls these methods on all registered behaviors.
 */

export abstract class Behavior {
	/** Set to true in awake() to receive per-frame update() calls. */
	needUpdate = false;

	/** Called once when the behavior is registered with the game loop. */
	awake(): void {}

	/** Called each frame with delta time in seconds. Override in subclasses. */
	update(_dt: number): void {}

	/** Called on cleanup. Override to dispose Three.js resources. */
	dispose(): void {}
}
