import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { BokScreen } from "./BokScreen.tsx";

const SCREENSHOT_DIR = "src/ui/game/modals/__screenshots__";

describe("BokScreen", () => {
	test("renders nothing when closed", async () => {
		const screen = await render(<BokScreen isOpen={false} onClose={() => {}} />);
		const dialog = screen.container.querySelector("[role='dialog']");
		expect(dialog).toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-screen-closed.png` });
	});

	test("renders journal overlay when open", async () => {
		const screen = await render(<BokScreen isOpen={true} onClose={() => {}} />);
		await expect.element(screen.getByTestId("bok-screen")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-screen-open.png` });
	});

	test("renders all 4 tab buttons", async () => {
		const screen = await render(<BokScreen isOpen={true} onClose={() => {}} />);
		await expect.element(screen.getByTestId("bok-tab-kartan")).toBeVisible();
		await expect.element(screen.getByTestId("bok-tab-listan")).toBeVisible();
		await expect.element(screen.getByTestId("bok-tab-kunskapen")).toBeVisible();
		await expect.element(screen.getByTestId("bok-tab-sagan")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-screen-tabs.png` });
	});

	test("starts on Kartan tab", async () => {
		const screen = await render(<BokScreen isOpen={true} onClose={() => {}} />);
		await expect.element(screen.getByText("Kartan — The Map")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-screen-kartan-tab.png` });
	});

	test("switches tab on click", async () => {
		const screen = await render(<BokScreen isOpen={true} onClose={() => {}} />);
		await screen.getByTestId("bok-tab-sagan").click();
		await expect.element(screen.getByText("Sagan — The Saga")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-screen-sagan-tab.png` });
	});

	test("switches through all tabs", async () => {
		const screen = await render(<BokScreen isOpen={true} onClose={() => {}} />);

		await screen.getByTestId("bok-tab-listan").click();
		await expect.element(screen.getByText("Listan — Inventory")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-screen-listan-tab.png` });

		await screen.getByTestId("bok-tab-kunskapen").click();
		await expect.element(screen.getByText("Kunskapen — Knowledge")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-screen-kunskapen-tab.png` });

		await screen.getByTestId("bok-tab-sagan").click();
		await expect.element(screen.getByText("Sagan — The Saga")).toBeVisible();

		await screen.getByTestId("bok-tab-kartan").click();
		await expect.element(screen.getByText("Kartan — The Map")).toBeVisible();
	});

	test("calls onClose when backdrop is clicked", async () => {
		const onClose = vi.fn();
		const screen = await render(<BokScreen isOpen={true} onClose={onClose} />);
		// Click the backdrop (first child div with aria-hidden)
		const backdrop = screen.container.querySelector("[aria-hidden='true']");
		if (backdrop) (backdrop as HTMLElement).click();
		// Wait for close animation timeout
		await new Promise((r) => setTimeout(r, 400));
		expect(onClose).toHaveBeenCalled();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-screen-backdrop-click.png` });
	});

	test("has dialog role and aria-modal", async () => {
		const screen = await render(<BokScreen isOpen={true} onClose={() => {}} />);
		const dialog = screen.container.querySelector("[role='dialog']");
		expect(dialog?.getAttribute("aria-modal")).toBe("true");
		expect(dialog?.getAttribute("aria-label")).toBe("Bok journal");
	});

	test("all tab buttons have type=button", async () => {
		const screen = await render(<BokScreen isOpen={true} onClose={() => {}} />);
		const tabs = screen.getByTestId("bok-tabs");
		const buttons = tabs.element().querySelectorAll("button");
		expect(buttons.length).toBe(4);
		for (const btn of buttons) {
			expect(btn.getAttribute("type")).toBe("button");
		}
	});

	test("has open animation class", async () => {
		const screen = await render(<BokScreen isOpen={true} onClose={() => {}} />);
		const el = screen.getByTestId("bok-screen").element();
		expect(el.className).toMatch(/bok-open/);
	});

	test("shows bok-page content area", async () => {
		const screen = await render(<BokScreen isOpen={true} onClose={() => {}} />);
		// BokPage is rendered — verify the page structure exists
		await expect.element(screen.getByTestId("bok-page")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-screen-page-content.png` });
	});
});
