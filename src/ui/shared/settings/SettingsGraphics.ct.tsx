import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { SettingsGraphics } from "./SettingsGraphics.tsx";

const SCREENSHOT_DIR = "src/ui/shared/settings/__screenshots__";

const defaultProps = {
	renderDistance: 3,
	particleDensity: "medium",
	shadowQuality: "low",
	onRenderDistance: vi.fn(),
	onParticleDensity: vi.fn(),
	onShadowQuality: vi.fn(),
};

describe("SettingsGraphics", () => {
	test("renders graphics settings root", async () => {
		const screen = await render(<SettingsGraphics {...defaultProps} />);
		await expect.element(screen.getByTestId("settings-graphics")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-graphics-default.png` });
	});

	test("renders with low quality preset (min render distance, low particles, shadows off)", async () => {
		const screen = await render(
			<SettingsGraphics {...defaultProps} renderDistance={2} particleDensity="low" shadowQuality="off" />,
		);
		await expect.element(screen.getByTestId("settings-graphics")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-graphics-low.png` });
	});

	test("renders with high quality preset (max render distance, high particles, high shadows)", async () => {
		const screen = await render(
			<SettingsGraphics {...defaultProps} renderDistance={5} particleDensity="high" shadowQuality="high" />,
		);
		await expect.element(screen.getByTestId("settings-graphics")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-graphics-high.png` });
	});

	test("calls onParticleDensity when a density option is clicked", async () => {
		const onParticleDensity = vi.fn();
		const screen = await render(<SettingsGraphics {...defaultProps} onParticleDensity={onParticleDensity} />);
		// "High" appears in both Particle and Shadow rows — click the first one (Particle)
		await screen.getByRole("button", { name: "High" }).first().click();
		expect(onParticleDensity).toHaveBeenCalledWith("high");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settings-graphics-particle-click.png` });
	});
});
