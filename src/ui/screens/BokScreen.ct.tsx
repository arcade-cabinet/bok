import { expect, test } from "@playwright/experimental-ct-react";
import { BokScreen } from "./BokScreen.tsx";

test.describe("BokScreen", () => {
	test("renders nothing when closed", async ({ mount }) => {
		const component = await mount(<BokScreen isOpen={false} onClose={() => {}} />);
		await expect(component.locator("[role='dialog']")).toHaveCount(0);
	});

	test("renders journal overlay when open", async ({ mount }) => {
		const component = await mount(<BokScreen isOpen={true} onClose={() => {}} />);
		await expect(component.getByTestId("bok-screen")).toBeVisible();
	});

	test("renders all 4 tab buttons", async ({ mount }) => {
		const component = await mount(<BokScreen isOpen={true} onClose={() => {}} />);
		const tabs = component.getByTestId("bok-tabs");
		await expect(tabs.getByText("Kartan")).toBeVisible();
		await expect(tabs.getByText("Listan")).toBeVisible();
		await expect(tabs.getByText("Kunskapen")).toBeVisible();
		await expect(tabs.getByText("Sagan")).toBeVisible();
	});

	test("starts on Kartan tab", async ({ mount }) => {
		const component = await mount(<BokScreen isOpen={true} onClose={() => {}} />);
		await expect(component.getByText("Kartan — The Map")).toBeVisible();
	});

	test("switches tab on click", async ({ mount }) => {
		const component = await mount(<BokScreen isOpen={true} onClose={() => {}} />);
		await component.getByTestId("bok-tab-sagan").click();
		await expect(component.getByText("Sagan — The Saga")).toBeVisible();
	});

	test("switches through all tabs", async ({ mount }) => {
		const component = await mount(<BokScreen isOpen={true} onClose={() => {}} />);

		await component.getByTestId("bok-tab-listan").click();
		await expect(component.getByText("Listan — Inventory")).toBeVisible();

		await component.getByTestId("bok-tab-kunskapen").click();
		await expect(component.getByText("Kunskapen — Knowledge")).toBeVisible();

		await component.getByTestId("bok-tab-sagan").click();
		await expect(component.getByText("Sagan — The Saga")).toBeVisible();

		await component.getByTestId("bok-tab-kartan").click();
		await expect(component.getByText("Kartan — The Map")).toBeVisible();
	});

	test("calls onClose when backdrop is clicked", async ({ mount }) => {
		let closed = false;
		const component = await mount(
			<BokScreen
				isOpen={true}
				onClose={() => {
					closed = true;
				}}
			/>,
		);
		// Click the backdrop (first child div with aria-hidden)
		await component.locator("[aria-hidden='true']").first().click();
		// Wait for close animation timeout
		await expect.poll(() => closed, { timeout: 500 }).toBe(true);
	});

	test("has dialog role and aria-modal", async ({ mount }) => {
		const component = await mount(<BokScreen isOpen={true} onClose={() => {}} />);
		const dialog = component.getByRole("dialog");
		await expect(dialog).toHaveAttribute("aria-modal", "true");
		await expect(dialog).toHaveAttribute("aria-label", "Bok journal");
	});

	test("all tab buttons have type=button", async ({ mount }) => {
		const component = await mount(<BokScreen isOpen={true} onClose={() => {}} />);
		const buttons = component.getByTestId("bok-tabs").locator("button");
		const count = await buttons.count();
		expect(count).toBe(4);
		for (let i = 0; i < count; i++) {
			await expect(buttons.nth(i)).toHaveAttribute("type", "button");
		}
	});

	test("has open animation class", async ({ mount }) => {
		const component = await mount(<BokScreen isOpen={true} onClose={() => {}} />);
		await expect(component.getByTestId("bok-screen")).toHaveClass(/bok-open/);
	});

	test("shows placeholder text on empty page", async ({ mount }) => {
		const component = await mount(<BokScreen isOpen={true} onClose={() => {}} />);
		await expect(component.getByText("These pages are yet unwritten...")).toBeVisible();
	});
});
