import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { SettingsControls } from "./SettingsControls.tsx";

const SCREENSHOT_DIR = "src/ui/components/__screenshots__";

const defaultProps = {
	mouseSensitivity: 1.0,
	touchSensitivity: 1.5,
	invertY: false,
	onMouseSensitivity: vi.fn(),
	onTouchSensitivity: vi.fn(),
	onInvertY: vi.fn(),
};

describe("SettingsControls", () => {
	test("renders controls settings root", async () => {
		const screen = await render(<SettingsControls {...defaultProps} />);
		await expect.element(screen.getByTestId("settings-controls")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-controls-default.png` });
	});

	test("invert Y toggle shows Normal when invertY is false", async () => {
		const screen = await render(<SettingsControls {...defaultProps} invertY={false} />);
		await expect.element(screen.getByTestId("invert-y-toggle")).not.toBeChecked();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-controls-invert-off.png` });
	});

	test("invert Y toggle shows Inverted when invertY is true", async () => {
		const screen = await render(<SettingsControls {...defaultProps} invertY={true} />);
		await expect.element(screen.getByTestId("invert-y-toggle")).toBeChecked();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-controls-invert-on.png` });
	});

	test("calls onInvertY callback when toggle is clicked", async () => {
		const onInvertY = vi.fn();
		const screen = await render(<SettingsControls {...defaultProps} onInvertY={onInvertY} />);
		await screen.getByTestId("invert-y-toggle").click();
		expect(onInvertY).toHaveBeenCalledOnce();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-controls-toggle-click.png` });
	});
});
