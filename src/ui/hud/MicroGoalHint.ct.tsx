import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { MicroGoalHint } from "./MicroGoalHint.tsx";

const SCREENSHOT_DIR = "src/ui/hud/__screenshots__";

describe("MicroGoalHint", () => {
	test("renders nothing when goal is null", async () => {
		const screen = await render(<MicroGoalHint goal={null} />);
		const hint = screen.container.querySelector("[data-testid='micro-goal-hint']");
		expect(hint).toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/micro-goal-hint-null.png` });
	});

	test("renders hint text after delay when goal provided", async () => {
		const goal = {
			type: "explore_chunk" as const,
			hint: "Uncharted land lies just beyond — explore a new area.",
		};
		const screen = await render(<MicroGoalHint goal={goal} />);
		// Wait for the 500ms visibility delay
		await new Promise((r) => setTimeout(r, 600));
		await expect.element(screen.getByTestId("micro-goal-hint")).toBeVisible();
		await expect.element(screen.getByTestId("micro-goal-hint")).toHaveTextContent("Uncharted land");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/micro-goal-hint-explore.png` });
	});

	test("renders shelter hint after delay", async () => {
		const goal = {
			type: "build_shelter" as const,
			hint: "Night approaches — build walls to shelter within.",
		};
		const screen = await render(<MicroGoalHint goal={goal} />);
		await new Promise((r) => setTimeout(r, 600));
		await expect.element(screen.getByTestId("micro-goal-hint")).toHaveTextContent("Night approaches");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/micro-goal-hint-shelter.png` });
	});

	test("renders craft hint after delay", async () => {
		const goal = {
			type: "craft_tool" as const,
			hint: "Better tools bring new possibilities — craft something.",
		};
		const screen = await render(<MicroGoalHint goal={goal} />);
		await new Promise((r) => setTimeout(r, 600));
		await expect.element(screen.getByTestId("micro-goal-hint")).toHaveTextContent("Better tools");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/micro-goal-hint-craft.png` });
	});
});
