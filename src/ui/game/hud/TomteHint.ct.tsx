import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { TomteHint } from "./TomteHint.tsx";

const SCREENSHOT_DIR = "src/ui/game/hud/__screenshots__";

// ─── Layer 1: Hidden when no hint ───

describe("TomteHint — hidden state", () => {
	test("renders nothing when not visible", async () => {
		const screen = await render(<TomteHint text="" visible={false} />);
		const el = screen.container.querySelector("[data-testid='tomte-hint']");
		expect(el).toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/tomte-hint-hidden.png` });
	});

	test("renders nothing when visible but text is empty", async () => {
		const screen = await render(<TomteHint text="" visible={true} />);
		const el = screen.container.querySelector("[data-testid='tomte-hint']");
		expect(el).toBeNull();
	});
});

// ─── Layer 2: Visible speech bubble ───

describe("TomteHint — visible speech bubble", () => {
	test("renders diegetic speech bubble with hint text", async () => {
		const screen = await render(<TomteHint text="Punch a tree to gather wood." visible={true} />);
		const bubble = screen.getByTestId("tomte-hint");
		await expect.element(bubble).toBeVisible();
		await expect.element(bubble).toHaveAttribute("data-visible", "true");
		await expect.element(screen.getByTestId("tomte-hint-text")).toHaveTextContent("Punch a tree to gather wood.");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/tomte-hint-visible.png` });
	});

	test("has carved-wood diegetic styling", async () => {
		const screen = await render(<TomteHint text="Build a shelter before nightfall." visible={true} />);
		const bubble = screen.getByTestId("tomte-hint");
		await expect.element(bubble).toBeVisible();
		// Should have the speech-bubble tail indicator
		const tail = screen.container.querySelector("[data-testid='tomte-hint-tail']");
		expect(tail).not.toBeNull();
		await page.screenshot({
			path: `${SCREENSHOT_DIR}/tomte-hint-carved-wood.png`,
		});
	});
});

// ─── Layer 3: Different hint texts ───

describe("TomteHint — varied tutorial hints", () => {
	test("shows crafting hint", async () => {
		const screen = await render(<TomteHint text="Open your Bok to see recipes." visible={true} />);
		await expect.element(screen.getByTestId("tomte-hint-text")).toHaveTextContent("Open your Bok to see recipes.");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/tomte-hint-crafting.png` });
	});

	test("shows long hint text without overflow", async () => {
		const screen = await render(
			<TomteHint
				text="The runes hold ancient power — inscribe them on stone to shape the world around you."
				visible={true}
			/>,
		);
		const bubble = screen.getByTestId("tomte-hint");
		await expect.element(bubble).toBeVisible();
		await page.screenshot({
			path: `${SCREENSHOT_DIR}/tomte-hint-long-text.png`,
		});
	});
});

// ─── Layer 4: Dismiss callback ───

describe("TomteHint — dismiss interaction", () => {
	test("calls onDismiss when bubble is tapped", async () => {
		let dismissed = false;
		const screen = await render(
			<TomteHint
				text="Tap to dismiss this hint."
				visible={true}
				onDismiss={() => {
					dismissed = true;
				}}
			/>,
		);
		await screen.getByTestId("tomte-hint").click();
		expect(dismissed).toBe(true);
	});
});
