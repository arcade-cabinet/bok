import { expect, test } from "@playwright/experimental-ct-react";
import { SettingsModal } from "./SettingsModal.tsx";

test.describe("SettingsModal", () => {
	test("renders with dialog role and aria attributes", async ({ mount }) => {
		const component = await mount(<SettingsModal onClose={() => {}} />);
		const dialog = component.getByRole("dialog");
		await expect(dialog).toHaveAttribute("aria-modal", "true");
		await expect(dialog).toHaveAttribute("aria-label", "Settings");
	});

	test("renders Settings title", async ({ mount }) => {
		const component = await mount(<SettingsModal onClose={() => {}} />);
		await expect(component.getByText("Settings")).toBeVisible();
	});

	test("renders all 3 tabs", async ({ mount }) => {
		const component = await mount(<SettingsModal onClose={() => {}} />);
		const tabs = component.getByTestId("settings-tabs");
		await expect(tabs.getByText("Keybindings")).toBeVisible();
		await expect(tabs.getByText("Display")).toBeVisible();
		await expect(tabs.getByText("Audio")).toBeVisible();
	});

	test("starts on Keybindings tab with all bindings", async ({ mount }) => {
		const component = await mount(<SettingsModal onClose={() => {}} />);
		await expect(component.getByTestId("settings-tab-keybindings")).toHaveAttribute("aria-selected", "true");
		await expect(component.getByText("Move")).toBeVisible();
		await expect(component.getByText("W A S D")).toBeVisible();
		await expect(component.getByText("Mine")).toBeVisible();
		await expect(component.getByText("Bok Journal")).toBeVisible();
	});

	test("switches to Display tab with controls", async ({ mount }) => {
		const component = await mount(<SettingsModal onClose={() => {}} />);
		await component.getByTestId("settings-tab-display").click();
		await expect(component.getByTestId("settings-tab-display")).toHaveAttribute("aria-selected", "true");
		await expect(component.getByText("Show Vitals Bars")).toBeVisible();
		await expect(component.getByText("Render Distance")).toBeVisible();
	});

	test("switches to Audio tab with volume sliders", async ({ mount }) => {
		const component = await mount(<SettingsModal onClose={() => {}} />);
		await component.getByTestId("settings-tab-audio").click();
		await expect(component.getByTestId("settings-tab-audio")).toHaveAttribute("aria-selected", "true");
		await expect(component.getByText("Master Volume")).toBeVisible();
		await expect(component.getByText("Music Volume")).toBeVisible();
		await expect(component.getByText("SFX Volume")).toBeVisible();
	});

	test("calls onClose when Back is clicked", async ({ mount }) => {
		let closed = false;
		const component = await mount(
			<SettingsModal
				onClose={() => {
					closed = true;
				}}
			/>,
		);
		await component.getByText("Back").click();
		await expect.poll(() => closed, { timeout: 500 }).toBe(true);
	});

	test("all buttons have type=button", async ({ mount }) => {
		const component = await mount(<SettingsModal onClose={() => {}} />);
		const buttons = component.locator("button");
		const count = await buttons.count();
		for (let i = 0; i < count; i++) {
			await expect(buttons.nth(i)).toHaveAttribute("type", "button");
		}
	});

	test("has rune border decorations", async ({ mount }) => {
		const component = await mount(<SettingsModal onClose={() => {}} />);
		const decorations = component.locator("[aria-hidden='true']");
		await expect(decorations).toHaveCount(2);
	});
});
