import { expect, test } from "@playwright/experimental-ct-react";
import { NewGameModal } from "./NewGameModal.tsx";

test.describe("NewGameModal", () => {
	test("renders with seed input and shuffle button", async ({ mount }) => {
		const component = await mount(<NewGameModal onStart={() => {}} onClose={() => {}} />);
		await expect(component.locator("#seed-input")).toBeVisible();
		await expect(component.getByLabel("Shuffle seed")).toBeVisible();
	});

	test("generates adjective-adjective-noun seed on mount", async ({ mount }) => {
		const component = await mount(<NewGameModal onStart={() => {}} onClose={() => {}} />);
		const input = component.locator("#seed-input");
		const value = await input.inputValue();
		// Should have at least 2 words (adjective adjective noun)
		expect(value.split(" ").length).toBeGreaterThanOrEqual(2);
	});

	test("shuffle button changes the seed", async ({ mount }) => {
		const component = await mount(<NewGameModal onStart={() => {}} onClose={() => {}} />);
		const input = component.locator("#seed-input");
		const before = await input.inputValue();
		await component.getByLabel("Shuffle seed").click();
		const after = await input.inputValue();
		// Seeds should differ (extremely unlikely to be the same)
		expect(after).not.toBe(before);
	});

	test("Awaken button calls onStart with seed", async ({ mount }) => {
		let receivedSeed = "";
		const component = await mount(
			<NewGameModal
				onStart={(seed) => {
					receivedSeed = seed;
				}}
				onClose={() => {}}
			/>,
		);
		await component.getByRole("button", { name: "Awaken" }).click();
		expect(receivedSeed.length).toBeGreaterThan(0);
	});

	test("Back button calls onClose", async ({ mount }) => {
		let closed = false;
		const component = await mount(
			<NewGameModal
				onStart={() => {}}
				onClose={() => {
					closed = true;
				}}
			/>,
		);
		await component.getByRole("button", { name: "Back" }).click();
		expect(closed).toBe(true);
	});

	test("has ARIA dialog role", async ({ mount }) => {
		const component = await mount(<NewGameModal onStart={() => {}} onClose={() => {}} />);
		await expect(component.locator("[role='dialog']")).toBeVisible();
	});

	test("all buttons have type=button", async ({ mount }) => {
		const component = await mount(<NewGameModal onStart={() => {}} onClose={() => {}} />);
		const buttons = component.locator("button");
		const count = await buttons.count();
		for (let i = 0; i < count; i++) {
			await expect(buttons.nth(i)).toHaveAttribute("type", "button");
		}
	});
});
