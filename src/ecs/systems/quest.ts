import type { World } from "koota";
import { Hotbar, PlayerTag, QuestProgress } from "../traits/index.ts";

export function questSystem(world: World, _dt: number) {
	world.query(PlayerTag, QuestProgress, Hotbar).updateEach(([quest, hotbar]) => {
		if (quest.step === 0 && quest.progress >= 5) {
			quest.step = 1;
			quest.progress = 0;
		} else if (quest.step === 1) {
			const hasAxe = hotbar.slots.some((s) => s && s.type === "item" && s.id === 101);
			if (hasAxe) {
				quest.step = 2;
				quest.progress = 0;
			}
		} else if (quest.step === 2 && quest.progress >= 10) {
			quest.step = 3;
			quest.progress = 0;
		}
	});
}

export function getQuestText(step: number, progress: number): string {
	switch (step) {
		case 0:
			return `Gather Wood: ${progress}/5`;
		case 1:
			return "Craft a Wooden Axe [E]";
		case 2:
			return `Mine Stone: ${progress}/10`;
		default:
			return "Build & Survive";
	}
}
