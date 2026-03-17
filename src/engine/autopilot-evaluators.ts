/**
 * GOAP Goal Evaluators for the dev autopilot.
 *
 * Each evaluator scores a goal's desirability [0, 1].
 * Think picks the highest score each frame and activates that goal.
 */

import { GoalEvaluator, type Think } from "yuka";
import type { AutopilotWorldState } from "./autopilot-goals.ts";
import { BuildGoal, EatGoal, ExploreGoal, LookAroundGoal, MineGoal } from "./autopilot-goals.ts";

// ─── Explore Evaluator ───

export class ExploreEvaluator extends GoalEvaluator<AutopilotWorldState> {
	calculateDesirability(owner: AutopilotWorldState): number {
		// Baseline exploration desire — always moderately useful
		let score = 0.4;
		// Higher when health/stamina are good
		if (owner.health > 50 && owner.stamina > 30) score += 0.1;
		return score;
	}

	setGoal(owner: AutopilotWorldState): void {
		const brain = (this as unknown as { owner: Think<AutopilotWorldState> }).owner;
		if (brain) {
			brain.clearSubgoals();
			brain.addSubgoal(new ExploreGoal(owner));
		}
	}
}

// ─── Mine Evaluator ───

export class MineEvaluator extends GoalEvaluator<AutopilotWorldState> {
	calculateDesirability(owner: AutopilotWorldState): number {
		// Mine when we have energy to do it
		let score = 0.3;
		if (owner.stamina > 50) score += 0.1;
		return score;
	}

	setGoal(owner: AutopilotWorldState): void {
		const brain = (this as unknown as { owner: Think<AutopilotWorldState> }).owner;
		if (brain) {
			brain.clearSubgoals();
			brain.addSubgoal(new MineGoal(owner));
		}
	}
}

// ─── Build Evaluator ───

export class BuildEvaluator extends GoalEvaluator<AutopilotWorldState> {
	calculateDesirability(_owner: AutopilotWorldState): number {
		// Lower priority than explore/mine
		return 0.25;
	}

	setGoal(owner: AutopilotWorldState): void {
		const brain = (this as unknown as { owner: Think<AutopilotWorldState> }).owner;
		if (brain) {
			brain.clearSubgoals();
			brain.addSubgoal(new BuildGoal(owner));
		}
	}
}

// ─── Eat Evaluator ───

export class EatEvaluator extends GoalEvaluator<AutopilotWorldState> {
	calculateDesirability(owner: AutopilotWorldState): number {
		// Very high when hungry — survival priority
		if (owner.hunger < 15) return 0.95;
		if (owner.hunger < 25) return 0.8;
		if (owner.hunger < 50) return 0.5;
		return 0.1;
	}

	setGoal(owner: AutopilotWorldState): void {
		const brain = (this as unknown as { owner: Think<AutopilotWorldState> }).owner;
		if (brain) {
			brain.clearSubgoals();
			brain.addSubgoal(new EatGoal(owner));
		}
	}
}

// ─── Look Around Evaluator ───

export class LookAroundEvaluator extends GoalEvaluator<AutopilotWorldState> {
	calculateDesirability(_owner: AutopilotWorldState): number {
		// Low priority idle behavior
		return 0.2;
	}

	setGoal(owner: AutopilotWorldState): void {
		const brain = (this as unknown as { owner: Think<AutopilotWorldState> }).owner;
		if (brain) {
			brain.clearSubgoals();
			brain.addSubgoal(new LookAroundGoal(owner));
		}
	}
}

// ─── Factory ───

/**
 * Register all evaluators on a Think brain.
 * characterBias is a multiplier unique to each evaluator that
 * GoalEvaluator uses internally to bias goal selection.
 */
export function registerAllEvaluators(brain: Think<AutopilotWorldState>): void {
	brain.addEvaluator(new ExploreEvaluator(1.0));
	brain.addEvaluator(new MineEvaluator(0.9));
	brain.addEvaluator(new BuildEvaluator(0.7));
	brain.addEvaluator(new EatEvaluator(1.2));
	brain.addEvaluator(new LookAroundEvaluator(0.5));
}
