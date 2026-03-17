/**
 * Micro-goal hint — subtle prompt showing the nearest achievable goal.
 * Appears after a brief delay if the player hasn't discovered anything recently.
 */

import { useEffect, useState } from "react";
import type { MicroGoal } from "../../../ecs/systems/micro-goals.ts";

interface MicroGoalHintProps {
	goal: MicroGoal | null;
}

export function MicroGoalHint({ goal }: MicroGoalHintProps) {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		if (!goal) {
			setVisible(false);
			return;
		}
		// Small delay before showing hint to avoid flicker
		const timer = setTimeout(() => setVisible(true), 500);
		return () => clearTimeout(timer);
	}, [goal]);

	if (!goal || !visible) return null;

	return (
		<div
			data-testid="micro-goal-hint"
			className="absolute top-14 left-1/2 -translate-x-1/2
				bg-stone-800/60 border border-stone-600/40 rounded px-3 py-1.5
				text-stone-200 text-xs font-serif
				transition-opacity duration-700 opacity-90"
		>
			{goal.hint}
		</div>
	);
}
