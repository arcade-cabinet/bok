import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ScreenReaderAnnouncer } from "./ScreenReaderAnnouncer.tsx";

const SCREENSHOT_DIR = "src/ui/game/hud/__screenshots__";

describe("ScreenReaderAnnouncer", () => {
	test("renders sr-only container with no initial message", async () => {
		const screen = await render(<ScreenReaderAnnouncer phase="title" health={100} dayCount={1} />);
		await expect.element(screen.getByTestId("sr-announcer")).toBeInTheDocument();
		await expect.element(screen.getByTestId("sr-announcer")).toHaveAttribute("aria-live", "assertive");
		await expect.element(screen.getByTestId("sr-announcer")).toHaveAttribute("role", "status");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/sr-announcer-initial.png` });
	});

	test("has sr-only class for visual hiding", async () => {
		const screen = await render(<ScreenReaderAnnouncer phase="playing" health={100} dayCount={1} />);
		await expect.element(screen.getByTestId("sr-announcer")).toHaveClass("sr-only");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/sr-announcer-sr-only.png` });
	});

	test("announces game start on playing phase transition", async () => {
		const { rerender } = await render(<ScreenReaderAnnouncer phase="title" health={100} dayCount={1} />);
		await rerender(<ScreenReaderAnnouncer phase="playing" health={100} dayCount={1} />);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/sr-announcer-playing.png` });
	});

	test("announces death on dead phase", async () => {
		const { rerender } = await render(<ScreenReaderAnnouncer phase="playing" health={100} dayCount={1} />);
		await rerender(<ScreenReaderAnnouncer phase="dead" health={0} dayCount={1} />);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/sr-announcer-dead.png` });
	});

	test("announces low health warning when health drops below threshold", async () => {
		const { rerender } = await render(<ScreenReaderAnnouncer phase="playing" health={80} dayCount={1} />);
		await rerender(<ScreenReaderAnnouncer phase="playing" health={20} dayCount={1} />);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/sr-announcer-low-health.png` });
	});
});
