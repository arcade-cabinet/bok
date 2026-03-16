import { expect, test } from "@playwright/experimental-ct-react";
import type { RuneIdValue } from "../../ecs/systems/rune-data.ts";
import { RuneId } from "../../ecs/systems/rune-data.ts";
import { RuneWheel } from "./RuneWheel.tsx";

test.describe("RuneWheel", () => {
	test("renders nothing when closed", async ({ mount }) => {
		const component = await mount(<RuneWheel isOpen={false} onSelectRune={() => {}} onClose={() => {}} />);
		await expect(component.locator("[role='dialog']")).toHaveCount(0);
	});

	test("renders dialog when open", async ({ mount }) => {
		const component = await mount(<RuneWheel isOpen={true} onSelectRune={() => {}} onClose={() => {}} />);
		await expect(component.getByTestId("rune-wheel")).toBeVisible();
	});

	test("renders all 8 rune buttons", async ({ mount }) => {
		const component = await mount(<RuneWheel isOpen={true} onSelectRune={() => {}} onClose={() => {}} />);
		const buttons = component.locator("button");
		await expect(buttons).toHaveCount(8);
	});

	test("renders rune glyphs", async ({ mount }) => {
		const component = await mount(<RuneWheel isOpen={true} onSelectRune={() => {}} onClose={() => {}} />);
		// Fehu glyph: ᚠ
		await expect(component.getByTestId("rune-fehu")).toBeVisible();
		await expect(component.getByTestId("rune-algiz")).toBeVisible();
		await expect(component.getByTestId("rune-berkanan")).toBeVisible();
	});

	test("calls onSelectRune with correct ID when clicking a rune", async ({ mount }) => {
		let selectedId: RuneIdValue = RuneId.None as RuneIdValue;
		const component = await mount(
			<RuneWheel
				isOpen={true}
				onSelectRune={(id) => {
					selectedId = id;
				}}
				onClose={() => {}}
			/>,
		);
		await component.getByTestId("rune-fehu").click();
		expect(selectedId).toBe(RuneId.Fehu);
	});

	test("calls onClose when backdrop is clicked", async ({ mount }) => {
		let closed = false;
		const component = await mount(
			<RuneWheel
				isOpen={true}
				onSelectRune={() => {}}
				onClose={() => {
					closed = true;
				}}
			/>,
		);
		await component.getByTestId("rune-wheel-backdrop").click({ force: true });
		expect(closed).toBe(true);
	});

	test("has accessible labels on rune buttons", async ({ mount }) => {
		const component = await mount(<RuneWheel isOpen={true} onSelectRune={() => {}} onClose={() => {}} />);
		const fehu = component.getByTestId("rune-fehu");
		await expect(fehu).toHaveAttribute("aria-label", /Fehu/);
	});

	test("highlights the selected rune", async ({ mount }) => {
		const component = await mount(
			<RuneWheel isOpen={true} onSelectRune={() => {}} onClose={() => {}} highlightedRune={RuneId.Fehu} />,
		);
		const fehu = component.getByTestId("rune-fehu");
		// Highlighted rune should have scale(1.2) transform
		const transform = await fehu.evaluate((el) => el.style.transform);
		expect(transform).toContain("scale(1.2)");
	});
});
