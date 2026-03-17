/**
 * Session data — pure constants for session management.
 * Auto-save intervals, resume context, micro-goal parameters.
 * No ECS/Three.js/React.
 */

/** Auto-save fires every 60 seconds during active play. */
export const AUTO_SAVE_INTERVAL_MS = 60_000;

/** How long (ms) to show the resume context banner after loading. */
export const RESUME_BANNER_DURATION_MS = 5_000;

/** Micro-goal scan radius in chunks around the player. */
export const MICRO_GOAL_SCAN_RADIUS = 3;

/** Maximum seconds of play before a micro-goal hint should appear. */
export const MICRO_GOAL_HINT_DELAY_S = 120;
