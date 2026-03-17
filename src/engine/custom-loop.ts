/**
 * Custom game loop — pure rAF-based loop with pause/resume support.
 * No Three.js or renderer dependency — just calls a callback each frame.
 */

export interface GameLoopOptions {
	/** Maximum dt in seconds (clamps spikes). Default: 0.1 (100ms). */
	maxDt?: number;
}

export interface GameLoop {
	start(): void;
	stop(): void;
	pause(): void;
	resume(): void;
	isRunning(): boolean;
	isPaused(): boolean;
}

/**
 * Create a game loop that calls `callback(dt)` each frame.
 * @param callback Called with delta time in seconds each frame (0 on first frame).
 * @param opts Optional configuration.
 */
export function createGameLoop(callback: (dt: number) => void, opts: GameLoopOptions = {}): GameLoop {
	const maxDt = opts.maxDt ?? 0.1;

	let rafId: number | null = null;
	let running = false;
	let paused = false;
	let lastTime: number | null = null;

	function loop(timestamp: number): void {
		if (!running) return;

		rafId = requestAnimationFrame(loop);

		if (paused) return;

		let dt: number;
		if (lastTime === null) {
			dt = 0;
		} else {
			dt = Math.min((timestamp - lastTime) / 1000, maxDt);
		}
		lastTime = timestamp;

		callback(dt);
	}

	return {
		start() {
			if (running) return;
			running = true;
			paused = false;
			lastTime = null;
			rafId = requestAnimationFrame(loop);
		},

		stop() {
			if (!running) return;
			running = false;
			paused = false;
			lastTime = null;
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
		},

		pause() {
			paused = true;
		},

		resume() {
			if (!paused) return;
			paused = false;
			lastTime = null; // Reset so first frame after resume has dt=0
		},

		isRunning() {
			return running;
		},

		isPaused() {
			return paused;
		},
	};
}
