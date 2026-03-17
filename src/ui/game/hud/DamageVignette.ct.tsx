import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { DamageVignette } from "./DamageVignette.tsx";

const SCREENSHOT_DIR = "src/ui/game/hud/__screenshots__";

describe("DamageVignette", () => {
	test("renders with full health invisible", async () => {
		const screen = await render(<DamageVignette health={100} damageFlash={0} />);
		const el = screen.container.querySelector("[data-testid='damage-vignette']");
		expect(el).not.toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/damage-vignette-full-health.png` });
	});

	test("renders vignette element at low health", async () => {
		const screen = await render(<DamageVignette health={30} damageFlash={0} />);
		const el = screen.container.querySelector("[data-testid='damage-vignette']");
		expect(el).not.toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/damage-vignette-low-health.png` });
	});

	test("renders vignette element during damage flash", async () => {
		const screen = await render(<DamageVignette health={100} damageFlash={0.8} />);
		const el = screen.container.querySelector("[data-testid='damage-vignette']");
		expect(el).not.toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/damage-vignette-flash.png` });
	});

	test("has animate-low-health class at critical health", async () => {
		const screen = await render(<DamageVignette health={10} damageFlash={0} />);
		const el = screen.container.querySelector("[data-testid='damage-vignette']");
		expect(el?.className).toContain("animate-low-health");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/damage-vignette-critical.png` });
	});

	test("does not have animate-low-health class above critical threshold", async () => {
		const screen = await render(<DamageVignette health={50} damageFlash={0} />);
		const el = screen.container.querySelector("[data-testid='damage-vignette']");
		expect(el?.className).not.toContain("animate-low-health");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/damage-vignette-medium-health.png` });
	});

	test("has aria-hidden for accessibility", async () => {
		const screen = await render(<DamageVignette health={50} damageFlash={0} />);
		const el = screen.container.querySelector("[data-testid='damage-vignette']");
		expect(el?.getAttribute("aria-hidden")).toBe("true");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/damage-vignette-aria.png` });
	});
});
