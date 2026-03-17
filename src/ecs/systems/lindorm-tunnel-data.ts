/**
 * Lindorm tunneling constants and state types.
 * Extracted from lindorm-tunnel.ts to keep it under 200 LOC.
 */

// ─── Constants ───

/** Number of body segments (including head). */
export const SEGMENT_COUNT = 12;

/** Spacing between segments in blocks. */
export const SEGMENT_SPACING = 0.6;

/** Speed while tunneling underground. */
export const TUNNEL_SPEED = 3.0;

/** Speed during breach arc attack. */
export const BREACH_SPEED = 5.0;

/** Arc height during breach. */
export const BREACH_ARC_HEIGHT = 6.0;

/** Damage on contact during breach. */
export const BREACH_DAMAGE = 20;

/** Range at which mining vibrations attract. */
export const VIBRATION_RANGE = 25;

/** Range at which Lindorm decides to breach near player. */
export const BREACH_TRIGGER_RANGE = 5;

/** Time underground before next breach attempt. */
export const TUNNEL_DURATION = 4.0;

/** Time for a full breach arc. */
export const BREACH_DURATION = 2.0;

/** HP for Lindorm. */
export const LINDORM_HP = 15;

/** Tunnel depth — how many blocks below surface the wyrm carves. */
export const TUNNEL_DEPTH = 3;

// ─── State ───

export const LindormPhase = {
	Underground: 0,
	Breaching: 1,
	Diving: 2,
} as const;
export type LindormPhaseId = (typeof LindormPhase)[keyof typeof LindormPhase];

export interface LindormData {
	phase: LindormPhaseId;
	phaseTimer: number;
	/** Underground movement target. */
	targetX: number;
	targetZ: number;
	/** Breach origin (where it surfaces). */
	breachX: number;
	breachZ: number;
	/** Breach arc progress [0,1]. */
	breachProgress: number;
	/** Direction of breach arc (radians). */
	breachAngle: number;
}

export interface TunnelBlock {
	x: number;
	y: number;
	z: number;
}
