import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { MobileControls } from "./MobileControls.tsx";

const SCREENSHOT_DIR = "src/ui/hud/__screenshots__";

const noop = () => {};

const defaultProps = {
	joystickActive: false,
	joystickX: 0,
	joystickY: 0,
	joystickCenterX: 0,
	joystickCenterY: 0,
	onButtonPress: noop,
	onButtonRelease: noop,
};

describe("MobileControls", () => {
	test("renders the mobile controls container", async () => {
		const screen = await render(<MobileControls {...defaultProps} />);
		await expect.element(screen.getByTestId("mobile-controls")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/mobile-controls-base.png` });
	});

	test("renders all 5 action buttons", async () => {
		const screen = await render(<MobileControls {...defaultProps} />);
		await expect.element(screen.getByTestId("mobile-btn-mine")).toBeVisible();
		await expect.element(screen.getByTestId("mobile-btn-place")).toBeVisible();
		await expect.element(screen.getByTestId("mobile-btn-jump")).toBeVisible();
		await expect.element(screen.getByTestId("mobile-btn-bok")).toBeVisible();
		await expect.element(screen.getByTestId("mobile-btn-inventory")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/mobile-controls-buttons.png` });
	});

	test("buttons have correct aria-labels", async () => {
		const screen = await render(<MobileControls {...defaultProps} />);
		await expect.element(screen.getByTestId("mobile-btn-mine")).toHaveAttribute("aria-label", "Mine");
		await expect.element(screen.getByTestId("mobile-btn-jump")).toHaveAttribute("aria-label", "Jump");
		await expect.element(screen.getByTestId("mobile-btn-bok")).toHaveAttribute("aria-label", "Bok");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/mobile-controls-aria.png` });
	});

	test("joystick is hidden when inactive and no center", async () => {
		const screen = await render(<MobileControls {...defaultProps} />);
		const base = screen.container.querySelector("[data-testid='joystick-base']");
		const nub = screen.container.querySelector("[data-testid='joystick-nub']");
		expect(base).toBeNull();
		expect(nub).toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/mobile-controls-joystick-hidden.png` });
	});

	test("joystick is visible when active", async () => {
		const screen = await render(
			<MobileControls
				{...defaultProps}
				joystickActive={true}
				joystickX={10}
				joystickY={-15}
				joystickCenterX={100}
				joystickCenterY={400}
			/>,
		);
		await expect.element(screen.getByTestId("joystick-base")).toBeVisible();
		await expect.element(screen.getByTestId("joystick-nub")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/mobile-controls-joystick-active.png` });
	});

	test("container has pointer-events-none and correct z-index", async () => {
		const screen = await render(<MobileControls {...defaultProps} />);
		const container = screen.getByTestId("mobile-controls");
		await expect.element(container).toHaveClass("pointer-events-none");
		await expect.element(container).toHaveClass("z-20");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/mobile-controls-z-index.png` });
	});
});
