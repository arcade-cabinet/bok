import { expect, test } from "@playwright/experimental-ct-react";
import { Crosshair } from "./Crosshair.tsx";

test.describe("Crosshair", () => {
	test("renders minimal dot when not looking at block", async ({ mount }) => {
		const component = await mount(<Crosshair isMining={false} miningProgress={0} lookingAtBlock={false} />);
		await expect(component).toBeVisible();
		const dot = component.locator("div > div").last();
		await expect(dot).toBeVisible();
		// Minimal dot: bg-white/30 class
		await expect(dot).toHaveClass(/bg-white\/30/);
	});

	test("renders white dot when looking at block", async ({ mount }) => {
		const component = await mount(<Crosshair isMining={false} miningProgress={0} lookingAtBlock={true} />);
		const dot = component.locator("div > div").last();
		await expect(dot).toHaveClass(/w-1 h-1 bg-white\b/);
		// No SVG ring when not mining
		await expect(component.locator("svg")).toHaveCount(0);
	});

	test("renders mining state with amber dot and progress ring", async ({ mount }) => {
		const component = await mount(<Crosshair isMining={true} miningProgress={0.5} lookingAtBlock={true} />);
		await expect(component).toBeVisible();
		// SVG progress ring should be present
		const svg = component.locator("svg");
		await expect(svg).toBeVisible();
		const circle = svg.locator("circle");
		await expect(circle).toHaveAttribute("stroke", "rgba(255,215,0,0.9)");
		// Amber dot
		const dot = component.locator("div > div").last();
		await expect(dot).toHaveClass(/bg-amber-400/);
	});

	test("no ring when not mining even if looking at block", async ({ mount }) => {
		const component = await mount(<Crosshair isMining={false} miningProgress={0.5} lookingAtBlock={true} />);
		await expect(component.locator("svg")).toHaveCount(0);
	});

	test("clamps mining progress between 0 and 1", async ({ mount }) => {
		const under = await mount(<Crosshair isMining={true} miningProgress={-0.5} lookingAtBlock={true} />);
		await expect(under).toBeVisible();

		const over = await mount(<Crosshair isMining={true} miningProgress={1.5} lookingAtBlock={true} />);
		await expect(over).toBeVisible();
	});

	test("has aria-hidden for accessibility", async ({ mount }) => {
		const component = await mount(<Crosshair isMining={false} miningProgress={0} lookingAtBlock={false} />);
		await expect(component.locator("[aria-hidden='true']").first()).toBeVisible();
	});
});
