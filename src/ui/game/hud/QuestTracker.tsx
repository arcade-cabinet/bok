import { getQuestText } from "../../../ecs/systems/quest.ts";

interface QuestTrackerProps {
	step: number;
	progress: number;
}

export function QuestTracker({ step, progress }: QuestTrackerProps) {
	return (
		<div className="glass-panel px-4 py-3 text-right shadow-lg">
			<div className="text-xs font-bold tracking-wider uppercase mb-1.5" style={{ color: "var(--color-bok-gold)" }}>
				Current Objective
			</div>
			<div className="text-sm font-semibold text-white">{getQuestText(step, progress)}</div>
			<div className="mt-2 text-xs text-gray-400 font-normal">[E] Inventory / Crafting</div>
		</div>
	);
}
