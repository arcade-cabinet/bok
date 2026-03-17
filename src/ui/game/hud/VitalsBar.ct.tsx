import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { VitalsBar } from "./VitalsBar.tsx";

const SCREENSHOT_DIR = "src/ui/game/hud/__screenshots__";

describe("VitalsBar", () => {
	test("renders health, hunger, and stamina bars", async () => {
		const screen = await render(<VitalsBar health={100} hunger={80} stamina={60} />);
		const el = screen.container.querySelector("[data-testid='vitals-bar']");
		expect(el).not.toBeNull();
		// Three progressbars should be present
		const bars = screen.container.querySelectorAll("[role='progressbar']");
		expect(bars.length).toBe(3);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/vitals-bar-full.png` });
	});

	test("renders low health state", async () => {
		const screen = await render(<VitalsBar health={15} hunger={100} stamina={100} />);
		const el = screen.container.querySelector("[data-testid='vitals-bar']");
		expect(el).not.toBeNull();
		const healthBar = screen.container.querySelector("[aria-label='Health']");
		expect(healthBar?.getAttribute("aria-valuenow")).toBe("15");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/vitals-bar-low-health.png` });
	});

	test("renders zero values without crashing", async () => {
		const screen = await render(<VitalsBar health={0} hunger={0} stamina={0} />);
		const el = screen.container.querySelector("[data-testid='vitals-bar']");
		expect(el).not.toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/vitals-bar-zero.png` });
	});

	test("shows hunger slowed indicator when hungerSlowed", async () => {
		const screen = await render(<VitalsBar health={100} hunger={15} stamina={100} hungerSlowed />);
		await expect.element(screen.getByText("Hungry — movement slowed")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/vitals-bar-hunger-slowed.png` });
	});

	test("does not show slow indicator when not hungerSlowed", async () => {
		const screen = await render(<VitalsBar health={100} hunger={50} stamina={100} hungerSlowed={false} />);
		const el = screen.container.querySelector("[aria-live='polite']");
		expect(el).toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/vitals-bar-not-slowed.png` });
	});

	test("hides when visible is false (diegetic mode)", async () => {
		const screen = await render(<VitalsBar health={100} hunger={80} stamina={60} visible={false} />);
		const el = screen.container.querySelector("[data-testid='vitals-bar']");
		expect(el).toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/vitals-bar-hidden.png` });
	});

	test("shows when visible is explicitly true", async () => {
		const screen = await render(<VitalsBar health={100} hunger={80} stamina={60} visible={true} />);
		const el = screen.container.querySelector("[data-testid='vitals-bar']");
		expect(el).not.toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/vitals-bar-explicit-visible.png` });
	});
});
