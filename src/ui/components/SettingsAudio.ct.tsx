import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { SettingsAudio } from "./SettingsAudio.tsx";

const SCREENSHOT_DIR = "src/ui/components/__screenshots__";

const defaultProps = {
	masterVolume: 80,
	ambientVolume: 60,
	interactionVolume: 70,
	muted: false,
	onMasterVolume: vi.fn(),
	onAmbientVolume: vi.fn(),
	onInteractionVolume: vi.fn(),
	onMuted: vi.fn(),
};

describe("SettingsAudio", () => {
	test("renders audio settings root", async () => {
		const screen = await render(<SettingsAudio {...defaultProps} />);
		await expect.element(screen.getByTestId("settings-audio")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-audio-default.png` });
	});

	test("renders unmuted state with volume sliders visible", async () => {
		const screen = await render(<SettingsAudio {...defaultProps} muted={false} />);
		await expect.element(screen.getByTestId("settings-audio")).toBeVisible();
		const muteBtn = screen.getByRole("switch");
		await expect.element(muteBtn).toHaveAttribute("aria-checked", "false");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-audio-unmuted.png` });
	});

	test("renders muted state with mute button aria-checked true", async () => {
		const screen = await render(<SettingsAudio {...defaultProps} muted={true} />);
		const muteBtn = screen.getByRole("switch");
		await expect.element(muteBtn).toHaveAttribute("aria-checked", "true");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-audio-muted.png` });
	});

	test("calls onMuted when mute toggle is clicked", async () => {
		const onMuted = vi.fn();
		const screen = await render(<SettingsAudio {...defaultProps} muted={false} onMuted={onMuted} />);
		await screen.getByRole("switch").click();
		expect(onMuted).toHaveBeenCalledWith(true);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-audio-mute-click.png` });
	});
});
