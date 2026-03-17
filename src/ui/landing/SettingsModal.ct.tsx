import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { SettingsModal } from "./SettingsModal.tsx";

const SCREENSHOT_DIR = "src/ui/landing/__screenshots__";

describe("SettingsModal", () => {
	test("renders with dialog role and aria attributes", async () => {
		const screen = await render(<SettingsModal onClose={() => {}} />);
		const dialog = screen.container.querySelector("[role='dialog']");
		expect(dialog?.getAttribute("aria-modal")).toBe("true");
		expect(dialog?.getAttribute("aria-label")).toBe("Settings");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-modal-base.png` });
	});

	test("renders Settings title", async () => {
		const screen = await render(<SettingsModal onClose={() => {}} />);
		await expect.element(screen.getByText("Settings")).toBeVisible();
	});

	test("renders all 4 tabs", async () => {
		const screen = await render(<SettingsModal onClose={() => {}} />);
		const tabs = screen.getByTestId("settings-tabs");
		await expect.element(tabs).toBeVisible();
		await expect.element(screen.getByText("Keybindings")).toBeVisible();
		await expect.element(screen.getByText("Audio")).toBeVisible();
		await expect.element(screen.getByText("Graphics")).toBeVisible();
		await expect.element(screen.getByText("Controls")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-modal-tabs.png` });
	});

	test("starts on Keybindings tab with all bindings", async () => {
		const screen = await render(<SettingsModal onClose={() => {}} />);
		const keybindingsTab = screen.getByTestId("settings-tab-keybindings");
		await expect.element(keybindingsTab).toHaveAttribute("aria-selected", "true");
		// Action labels match input-config.ts actionLabel()
		await expect.element(screen.getByText("Move Forward")).toBeVisible();
		await expect.element(screen.getByText("Mine")).toBeVisible();
		await expect.element(screen.getByText("Bok Journal")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-modal-keybindings.png` });
	});

	test("switches to Audio tab with volume sliders", async () => {
		const screen = await render(<SettingsModal onClose={() => {}} />);
		await screen.getByTestId("settings-tab-audio").click();
		await expect.element(screen.getByTestId("settings-tab-audio")).toHaveAttribute("aria-selected", "true");
		await expect.element(screen.getByText("Master Volume")).toBeVisible();
		await expect.element(screen.getByText("Ambient Volume")).toBeVisible();
		await expect.element(screen.getByText("Interaction Volume")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-modal-audio.png` });
	});

	test("switches to Graphics tab with controls", async () => {
		const screen = await render(<SettingsModal onClose={() => {}} />);
		await screen.getByTestId("settings-tab-graphics").click();
		await expect.element(screen.getByTestId("settings-tab-graphics")).toHaveAttribute("aria-selected", "true");
		await expect.element(screen.getByText("Render Distance")).toBeVisible();
		await expect.element(screen.getByText("Particle Density")).toBeVisible();
		await expect.element(screen.getByText("Shadow Quality")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-modal-graphics.png` });
	});

	test("switches to Controls tab", async () => {
		const screen = await render(<SettingsModal onClose={() => {}} />);
		await screen.getByTestId("settings-tab-controls").click();
		await expect.element(screen.getByTestId("settings-tab-controls")).toHaveAttribute("aria-selected", "true");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-modal-controls.png` });
	});

	test("calls onClose when Back is clicked", async () => {
		const onClose = vi.fn();
		const screen = await render(<SettingsModal onClose={onClose} />);
		// Click Back button directly via DOM to avoid strict mode ambiguity
		const backBtn = Array.from(screen.container.querySelectorAll("button")).find(
			(btn) => btn.textContent?.trim() === "Back",
		) as HTMLButtonElement;
		expect(backBtn).not.toBeNull();
		backBtn.click();
		expect(onClose).toHaveBeenCalled();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-modal-back.png` });
	});

	test("all buttons have type=button", async () => {
		const screen = await render(<SettingsModal onClose={() => {}} />);
		const buttons = screen.container.querySelectorAll("button");
		for (const btn of buttons) {
			expect(btn.getAttribute("type")).toBe("button");
		}
	});

	test("has rune border decorations", async () => {
		const screen = await render(<SettingsModal onClose={() => {}} />);
		const decorations = screen.container.querySelectorAll("[aria-hidden='true']");
		expect(decorations.length).toBe(2);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-modal-rune-borders.png` });
	});
});
