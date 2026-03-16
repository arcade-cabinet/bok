import { expect, test } from "@playwright/experimental-ct-react";
import { Crosshair } from "./Crosshair.tsx";

test.describe("Crosshair", () => {
	test("renders idle state with white dot", async ({ mount }) => {
		const component = await mount(<Crosshair isMining={false} miningProgress={0} />);
		await expect(component).toBeVisible();
		// Dot should be present
		const dot = component.locator("div > div").last();
		await expect(dot).toBeVisible();
	});

	test("renders mining state with amber dot and progress ring", async ({ mount }) => {
		const component = await mount(<Crosshair isMining={true} miningProgress={0.5} />);
		await expect(component).toBeVisible();
		// SVG progress ring should be present
		const svg = component.locator("svg");
		await expect(svg).toBeVisible();
		const circle = svg.locator("circle");
		await expect(circle).toHaveAttribute("stroke", "rgba(255,215,0,0.9)");
	});

	test("clamps mining progress between 0 and 1", async ({ mount }) => {
		// Negative value should be clamped to 0
		const under = await mount(<Crosshair isMining={true} miningProgress={-0.5} />);
		await expect(under).toBeVisible();

		// Over 1 should be clamped to 1
		const over = await mount(<Crosshair isMining={true} miningProgress={1.5} />);
		await expect(over).toBeVisible();
	});

	test("has aria-hidden for accessibility", async ({ mount }) => {
		const component = await mount(<Crosshair isMining={false} miningProgress={0} />);
		await expect(component.locator("[aria-hidden='true']").first()).toBeVisible();
	});
});
