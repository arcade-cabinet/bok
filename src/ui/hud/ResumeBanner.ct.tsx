import { expect, test } from "@playwright/experimental-ct-react";
import { ResumeBanner } from "./ResumeBanner.tsx";

test.describe("ResumeBanner", () => {
	test("renders nothing when context is null", async ({ mount }) => {
		const component = await mount(<ResumeBanner context={null} onDismiss={() => {}} />);
		const text = await component.textContent();
		expect(text).toBe("");
	});

	test("renders resume text when context provided", async ({ mount }) => {
		const context = {
			text: "Day 5 — You stood in the wilds at dawn.",
			objectiveHint: null,
		};
		const component = await mount(<ResumeBanner context={context} onDismiss={() => {}} />);
		await expect(component).toContainText("Day 5");
		await expect(component).toContainText("in the wilds at dawn");
	});

	test("renders objective hint when present", async ({ mount }) => {
		const context = {
			text: "Day 3 — You stood in the wilds.",
			objectiveHint: "Build your first shelter",
		};
		const component = await mount(<ResumeBanner context={context} onDismiss={() => {}} />);
		await expect(component).toContainText("Build your first shelter");
	});

	test("does not render objective hint when null", async ({ mount }) => {
		const context = {
			text: "Day 1 — You stood in the wilds.",
			objectiveHint: null,
		};
		const component = await mount(<ResumeBanner context={context} onDismiss={() => {}} />);
		const allText = await component.textContent();
		expect(allText).not.toContain("undefined");
	});

	test("calls onDismiss when clicked", async ({ mount }) => {
		let dismissed = false;
		const context = {
			text: "Day 1 — You stood in the wilds.",
			objectiveHint: null,
		};
		const component = await mount(
			<ResumeBanner
				context={context}
				onDismiss={() => {
					dismissed = true;
				}}
			/>,
		);
		await component.click();
		expect(dismissed).toBe(true);
	});

	test("has pointer-events-auto for click dismissal", async ({ mount }) => {
		const context = {
			text: "Day 1 — Resume.",
			objectiveHint: null,
		};
		const component = await mount(<ResumeBanner context={context} onDismiss={() => {}} />);
		const button = component.locator("button").first();
		const classes = await button.getAttribute("class");
		expect(classes).toContain("pointer-events-auto");
	});
});
