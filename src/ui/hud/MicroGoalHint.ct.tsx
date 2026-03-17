import { expect, test } from "@playwright/experimental-ct-react";
import { MicroGoalHint } from "./MicroGoalHint.tsx";

test.describe("MicroGoalHint", () => {
	test("renders nothing when goal is null", async ({ mount }) => {
		const component = await mount(<MicroGoalHint goal={null} />);
		const text = await component.textContent();
		expect(text).toBe("");
	});

	test("renders hint text when goal provided", async ({ mount }) => {
		const goal = {
			type: "explore_chunk" as const,
			hint: "Uncharted land lies just beyond — explore a new area.",
		};
		const component = await mount(<MicroGoalHint goal={goal} />);
		// Wait for the 500ms delay
		await component.page().waitForTimeout(600);
		await expect(component).toContainText("Uncharted land");
	});

	test("renders shelter hint", async ({ mount }) => {
		const goal = {
			type: "build_shelter" as const,
			hint: "Night approaches — build walls to shelter within.",
		};
		const component = await mount(<MicroGoalHint goal={goal} />);
		await component.page().waitForTimeout(600);
		await expect(component).toContainText("Night approaches");
	});

	test("renders craft hint", async ({ mount }) => {
		const goal = {
			type: "craft_tool" as const,
			hint: "Better tools bring new possibilities — craft something.",
		};
		const component = await mount(<MicroGoalHint goal={goal} />);
		await component.page().waitForTimeout(600);
		await expect(component).toContainText("Better tools");
	});
});
