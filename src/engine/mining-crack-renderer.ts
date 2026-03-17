// ─── Mining Crack Renderer ───
// Maps mining progress [0, 1] to crack overlay stage, chip particles,
// and shatter burst data. Pure math — no Three.js, no ECS.

/** Crack stage visual config: opacity of overlay and number of crack lines. */
export interface CrackStageConfig {
	/** Overlay opacity [0, 1]. */
	opacity: number;
	/** Number of crack lines to draw on the block face. */
	lineCount: number;
}

/** Particle burst data for block shatter on completion. */
export interface ShatterData {
	/** Number of particles in the burst. */
	count: number;
	/** Outward velocity of shatter particles. */
	burstSpeed: number;
}

/**
 * Four crack stages mapped to mining progress thresholds.
 * Stage 0: [0%, 25%)  — hairline cracks, barely visible
 * Stage 1: [25%, 50%) — visible cracks forming
 * Stage 2: [50%, 75%) — deep cracks spreading
 * Stage 3: [75%, 100%] — about to shatter
 */
export const CRACK_STAGES: readonly CrackStageConfig[] = [
	{ opacity: 0.15, lineCount: 2 },
	{ opacity: 0.35, lineCount: 4 },
	{ opacity: 0.6, lineCount: 6 },
	{ opacity: 0.85, lineCount: 8 },
] as const;

/** Progress thresholds for crack stages (exclusive lower bounds). */
const THRESHOLDS = [0, 0.25, 0.5, 0.75];

/**
 * Map mining progress [0, 1+] to a crack stage index (0–3).
 * - [0, 0.25)  → stage 0
 * - [0.25, 0.5) → stage 1
 * - [0.5, 0.75) → stage 2
 * - [0.75, 1+]  → stage 3
 */
export function computeCrackStage(progress: number): number {
	const clamped = Math.max(0, progress);
	let stage = 0;
	for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
		if (clamped >= THRESHOLDS[i]) {
			stage = i;
			break;
		}
	}
	return stage;
}

/**
 * Compute the number of chip particles to spawn when entering a new crack stage.
 * Stage 0 = no chips, stage N = N chips.
 */
export function computeChipCount(stage: number): number {
	return Math.max(0, stage);
}

/**
 * Compute shatter burst data when mining completes (progress >= 1.0).
 * Returns null if mining is still in progress.
 */
export function computeShatterParticles(progress: number): ShatterData | null {
	if (progress < 1.0) return null;
	return { count: 15, burstSpeed: 3.5 };
}
