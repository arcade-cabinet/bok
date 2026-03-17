import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { DeathScreen } from "./DeathScreen.tsx";

const SCREENSHOT_DIR = "src/ui/screens/__screenshots__";

describe("DeathScreen", () => {
	test("renders FALLEN header and lore text", async () => {
		const screen = await render(<DeathScreen onRespawn={() => {}} />);
		await expect.element(screen.getByText("FALLEN")).toBeVisible();
		await expect.element(screen.getByText(/wilderness claims/)).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/death-screen-base.png` });
	});

	test("renders Return button with type=button", async () => {
		const screen = await render(<DeathScreen onRespawn={() => {}} />);
		const btn = screen.getByRole("button", { name: "Return" });
		await expect.element(btn).toBeVisible();
		await expect.element(btn).toHaveAttribute("type", "button");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/death-screen-return-button.png` });
	});

	test("calls onRespawn when Return is clicked", async () => {
		const onRespawn = vi.fn();
		const screen = await render(<DeathScreen onRespawn={onRespawn} />);
		await screen.getByRole("button", { name: "Return" }).click();
		expect(onRespawn).toHaveBeenCalledOnce();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/death-screen-after-click.png` });
	});
});
