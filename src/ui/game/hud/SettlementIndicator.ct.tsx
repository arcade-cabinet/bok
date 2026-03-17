import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { SettlementIndicator } from "./SettlementIndicator.tsx";

const SCREENSHOT_DIR = "src/ui/game/hud/__screenshots__";

// ─── Layer 1: Hidden when not in settlement ───

describe("SettlementIndicator - hidden state", () => {
	test("renders nothing when name is null", async () => {
		const screen = await render(<SettlementIndicator name={null} level="" bonuses={[]} />);
		const el = screen.container.querySelector("[data-testid='settlement-indicator']");
		expect(el).toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settlement-hidden.png` });
	});
});

// ─── Layer 2: Shows settlement name + level ───

describe("SettlementIndicator - basic display", () => {
	test("shows Swedish name and level", async () => {
		const screen = await render(<SettlementIndicator name="Björkby" level="Hamlet" bonuses={[]} />);
		await expect.element(screen.getByTestId("settlement-indicator")).toBeVisible();
		await expect.element(screen.getByTestId("settlement-name")).toHaveTextContent("Björkby");
		await expect.element(screen.getByTestId("settlement-level")).toHaveTextContent("Hamlet");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settlement-hamlet.png` });
	});

	test("shows Village level", async () => {
		const screen = await render(<SettlementIndicator name="Stenholm" level="Village" bonuses={[]} />);
		await expect.element(screen.getByTestId("settlement-level")).toHaveTextContent("Village");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settlement-village.png` });
	});

	test("shows Town level", async () => {
		const screen = await render(<SettlementIndicator name="Kvarnvik" level="Town" bonuses={[]} />);
		await expect.element(screen.getByTestId("settlement-level")).toHaveTextContent("Town");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settlement-town.png` });
	});
});

// ─── Layer 3: Active bonuses ───

describe("SettlementIndicator - bonuses", () => {
	test("shows active bonuses list", async () => {
		const bonuses = [
			{ label: "Ward", value: "+30%" },
			{ label: "Growth", value: "+40%" },
		];
		const screen = await render(<SettlementIndicator name="Lundborg" level="Village" bonuses={bonuses} />);
		await expect.element(screen.getByTestId("settlement-bonuses")).toBeVisible();
		await expect.element(screen.getByText("+30%")).toBeVisible();
		await expect.element(screen.getByText("+40%")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settlement-bonuses.png` });
	});

	test("hides bonuses section when empty", async () => {
		const screen = await render(<SettlementIndicator name="Åsstad" level="Hamlet" bonuses={[]} />);
		const bonusEl = screen.container.querySelector("[data-testid='settlement-bonuses']");
		expect(bonusEl).toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settlement-no-bonuses.png` });
	});

	test("renders multiple bonuses with data attributes", async () => {
		const bonuses = [
			{ label: "Ward", value: "+45%" },
			{ label: "Growth", value: "+60%" },
			{ label: "Combat", value: "+20%" },
			{ label: "Mörker", value: "-40%" },
		];
		const screen = await render(<SettlementIndicator name="Furuhult" level="Town" bonuses={bonuses} />);
		const items = screen.container.querySelectorAll("[data-testid^='bonus-']");
		expect(items.length).toBe(4);
		await expect.element(screen.getByTestId("bonus-ward")).toHaveAttribute("data-value", "+45%");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/settlement-all-bonuses.png` });
	});
});

// ─── Layer 4: Accessibility ───

describe("SettlementIndicator - accessibility", () => {
	test("has aria-live for screen readers", async () => {
		const screen = await render(<SettlementIndicator name="Ekmark" level="Hamlet" bonuses={[]} />);
		await expect.element(screen.getByTestId("settlement-indicator")).toHaveAttribute("aria-live", "polite");
	});

	test("has role=status for assistive tech", async () => {
		const screen = await render(<SettlementIndicator name="Ekmark" level="Hamlet" bonuses={[]} />);
		await expect.element(screen.getByTestId("settlement-indicator")).toHaveAttribute("role", "status");
	});
});
