/**
 * Dev Autopilot — toggle with F9 for automated playtesting.
 *
 * Delegates to Yuka GOAP autopilot (yuka-autopilot.ts) for goal-oriented
 * behavior. This file provides the init/toggle API and dev bridge wiring.
 */

import type { World } from "koota";
import { getYukaAutopilotStatus, initYukaAutopilot, updateYukaAutopilot } from "./yuka-autopilot.ts";

// ─── State ───

let enabled = false;

// ─── Public API ───

export function isAutopilotEnabled(): boolean {
	return enabled;
}

export function getAutopilotLog(): string[] {
	return getYukaAutopilotStatus().log;
}

export function initAutopilot(): void {
	if (!import.meta.env.DEV) return;

	initYukaAutopilot();

	window.addEventListener("keydown", (e) => {
		if (e.key === "F9") {
			enabled = !enabled;
			console.log(`[autopilot] ${enabled ? "ON" : "OFF"}`);
		}
	});

	// Expose to dev bridge
	(window as unknown as Record<string, unknown>).__bokAutopilot = {
		toggle: () => {
			enabled = !enabled;
			return enabled;
		},
		status: () => ({
			enabled,
			...getYukaAutopilotStatus(),
		}),
	};
}

export function updateAutopilot(world: World, dt: number): void {
	if (!enabled) return;
	updateYukaAutopilot(world, dt);
}
