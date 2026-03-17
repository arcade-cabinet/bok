import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { BlockId } from "../../world/blocks.ts";
import type { BokLedgerProps } from "./BokLedger.tsx";
import { BokLedger } from "./BokLedger.tsx";

const SCREENSHOT_DIR = "src/ui/components/__screenshots__";

function makeProps(overrides: Partial<BokLedgerProps> = {}): BokLedgerProps {
	return {
		items: {},
		...overrides,
	};
}

describe("BokLedger", () => {
	test("renders empty state when no items", async () => {
		const screen = await render(<BokLedger {...makeProps()} />);
		await expect.element(screen.getByTestId("bok-ledger")).toBeVisible();
		await expect.element(screen.getByText("Your packs are empty...")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-ledger-empty.png` });
	});

	test("renders resource list with correct counts", async () => {
		const props = makeProps({
			items: { [BlockId.Wood]: 10, [BlockId.Stone]: 25 },
		});
		const screen = await render(<BokLedger {...props} />);
		await expect.element(screen.getByTestId(`ledger-item-${BlockId.Wood}`)).toBeVisible();
		await expect.element(screen.getByTestId(`ledger-count-${BlockId.Wood}`)).toHaveTextContent("10");
		await expect.element(screen.getByTestId(`ledger-count-${BlockId.Stone}`)).toHaveTextContent("25");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-ledger-populated.png` });
	});

	test("groups items by category", async () => {
		const props = makeProps({
			items: {
				[BlockId.Wood]: 5,
				[BlockId.IronOre]: 3,
				22: 2, // Mushroom (food)
			},
		});
		const screen = await render(<BokLedger {...props} />);
		await expect.element(screen.getByTestId("ledger-category-blocks")).toBeVisible();
		await expect.element(screen.getByTestId("ledger-category-materials")).toBeVisible();
		await expect.element(screen.getByTestId("ledger-category-food")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-ledger-categories.png` });
	});

	test("classifies tools into tools category", async () => {
		const props = makeProps({
			items: { 101: 1, 108: 1 }, // Wood Axe, Lantern
		});
		const screen = await render(<BokLedger {...props} />);
		await expect.element(screen.getByTestId("ledger-category-tools")).toBeVisible();
		await expect.element(screen.getByText("Wood Axe")).toBeVisible();
		await expect.element(screen.getByText("Lantern")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-ledger-tools.png` });
	});

	test("shows recipes when tapping a resource", async () => {
		const props = makeProps({
			items: { [BlockId.Wood]: 10 },
		});
		const screen = await render(<BokLedger {...props} />);

		// Tap on Wood
		await screen.getByTestId(`ledger-item-${BlockId.Wood}`).click();
		await expect.element(screen.getByTestId("ledger-recipes")).toBeVisible();
		await expect.element(screen.getByText("Recipes using Wood")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-ledger-recipes-open.png` });
	});

	test("shows no-recipes message for unused resources", async () => {
		const props = makeProps({
			items: { [BlockId.Grass]: 5 },
		});
		const screen = await render(<BokLedger {...props} />);

		await screen.getByTestId(`ledger-item-${BlockId.Grass}`).click();
		await expect.element(screen.getByText("No known recipes use this resource.")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-ledger-no-recipes.png` });
	});

	test("deselects resource on second tap", async () => {
		const props = makeProps({
			items: { [BlockId.Wood]: 10 },
		});
		const screen = await render(<BokLedger {...props} />);

		// Select
		await screen.getByTestId(`ledger-item-${BlockId.Wood}`).click();
		await expect.element(screen.getByTestId("ledger-recipes")).toBeVisible();

		// Deselect — recipes panel is conditionally rendered, won't be in DOM
		await screen.getByTestId(`ledger-item-${BlockId.Wood}`).click();
		expect(screen.container.querySelector("[data-testid='ledger-recipes']")).toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-ledger-deselected.png` });
	});

	test("displays recipe details with costs and tier", async () => {
		const props = makeProps({
			items: { [BlockId.Wood]: 10 },
		});
		const screen = await render(<BokLedger {...props} />);

		await screen.getByTestId(`ledger-item-${BlockId.Wood}`).click();
		// Wood Planks recipe exists
		await expect.element(screen.getByTestId("recipe-planks")).toBeVisible();
		await expect.element(screen.getByText("Wood Planks x4")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-ledger-recipe-detail.png` });
	});

	test("sorts entries by category then name", async () => {
		const props = makeProps({
			items: {
				[BlockId.Stone]: 5,
				[BlockId.Wood]: 3,
				[BlockId.IronOre]: 2,
				22: 1, // Mushroom
			},
		});
		const screen = await render(<BokLedger {...props} />);

		// Blocks section should come before Materials section
		const firstSection = screen.container.querySelectorAll("[data-testid^='ledger-category-']")[0];
		expect(firstSection?.getAttribute("data-testid")).toBe("ledger-category-blocks");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-ledger-sorted.png` });
	});
});
