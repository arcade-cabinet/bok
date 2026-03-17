import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { BokPage } from "./BokPage.tsx";

const SCREENSHOT_DIR = "src/ui/game/bok/__screenshots__";

describe("BokPage", () => {
	test("renders title", async () => {
		const screen = await render(<BokPage title="Test Page" />);
		await expect.element(screen.getByText("Test Page")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-page-base.png` });
	});

	test("renders children content", async () => {
		const screen = await render(
			<BokPage title="My Page">
				<p>Custom content here</p>
			</BokPage>,
		);
		await expect.element(screen.getByText("Custom content here")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-page-with-content.png` });
	});

	test("shows placeholder when no children", async () => {
		const screen = await render(<BokPage title="Empty Page" />);
		await expect.element(screen.getByText("These pages are yet unwritten...")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-page-empty.png` });
	});

	test("has rune border decorations", async () => {
		const screen = await render(<BokPage title="Runes" />);
		const decorations = screen.container.querySelectorAll("[aria-hidden='true']");
		expect(decorations.length).toBe(2);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-page-rune-borders.png` });
	});

	test("has data-testid", async () => {
		const screen = await render(<BokPage title="Test" />);
		await expect.element(screen.getByTestId("bok-page")).toBeVisible();
	});
});
