import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { BlothogenFogOverlay } from "./BlothogenFogOverlay.tsx";

const SCREENSHOT_DIR = "src/ui/hud/__screenshots__";

describe("BlothogenFogOverlay", () => {
	test("renders nothing when inactive", async () => {
		const { container } = await render(<BlothogenFogOverlay active={false} />);
		const fog = container.querySelector("[data-testid='blothogen-fog']");
		expect(fog).toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/blothogen-fog-inactive.png` });
	});

	test("renders fog overlay when active", async () => {
		const screen = await render(<BlothogenFogOverlay active={true} />);
		await expect.element(screen.getByTestId("blothogen-fog")).toBeInTheDocument();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/blothogen-fog-active.png` });
	});

	test("fog overlay has pointer-events-none class so it does not block input", async () => {
		const { container } = await render(<BlothogenFogOverlay active={true} />);
		const fog = container.querySelector("[data-testid='blothogen-fog']");
		expect(fog?.classList.contains("pointer-events-none")).toBe(true);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/blothogen-fog-pointer-events.png` });
	});

	test("transitioning from inactive to active shows fog", async () => {
		// Render inactive first, then active to verify the state change
		const { rerender, container } = await render(<BlothogenFogOverlay active={false} />);
		expect(container.querySelector("[data-testid='blothogen-fog']")).toBeNull();

		await rerender(<BlothogenFogOverlay active={true} />);
		const fog = container.querySelector("[data-testid='blothogen-fog']");
		expect(fog).not.toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/blothogen-fog-transition.png` });
	});
});
