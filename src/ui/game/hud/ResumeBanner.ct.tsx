import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ResumeBanner } from "./ResumeBanner.tsx";

const SCREENSHOT_DIR = "src/ui/game/hud/__screenshots__";

describe("ResumeBanner", () => {
	test("renders nothing when context is null", async () => {
		const screen = await render(<ResumeBanner context={null} onDismiss={() => {}} />);
		const banner = screen.container.querySelector("button");
		expect(banner).toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/resume-banner-null.png` });
	});

	test("renders resume text when context provided", async () => {
		const context = {
			text: "Day 5 — You stood in the wilds at dawn.",
			objectiveHint: null,
		};
		const screen = await render(<ResumeBanner context={context} onDismiss={() => {}} />);
		await expect.element(screen.getByTestId("resume-banner")).toBeVisible();
		await expect.element(screen.getByTestId("resume-banner")).toHaveTextContent("Day 5");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/resume-banner-text.png` });
	});

	test("renders objective hint when present", async () => {
		const context = {
			text: "Day 3 — You stood in the wilds.",
			objectiveHint: "Build your first shelter",
		};
		const screen = await render(<ResumeBanner context={context} onDismiss={() => {}} />);
		await expect.element(screen.getByTestId("resume-banner")).toHaveTextContent("Build your first shelter");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/resume-banner-with-hint.png` });
	});

	test("does not render objective text when hint is null", async () => {
		const context = {
			text: "Day 1 — You stood in the wilds.",
			objectiveHint: null,
		};
		const screen = await render(<ResumeBanner context={context} onDismiss={() => {}} />);
		const el = screen.container.querySelector("[data-testid='resume-banner']");
		expect(el?.textContent).not.toContain("undefined");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/resume-banner-no-hint.png` });
	});

	test("calls onDismiss when clicked", async () => {
		const onDismiss = vi.fn();
		const context = {
			text: "Day 1 — You stood in the wilds.",
			objectiveHint: null,
		};
		const screen = await render(<ResumeBanner context={context} onDismiss={onDismiss} />);
		await screen.getByTestId("resume-banner").click();
		expect(onDismiss).toHaveBeenCalledOnce();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/resume-banner-dismissed.png` });
	});
});
