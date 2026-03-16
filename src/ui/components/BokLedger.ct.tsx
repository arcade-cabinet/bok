import { expect, test } from "@playwright/experimental-ct-react";
import { BlockId } from "../../world/blocks.ts";
import type { BokLedgerProps } from "./BokLedger.tsx";
import { BokLedger } from "./BokLedger.tsx";

function makeProps(overrides: Partial<BokLedgerProps> = {}): BokLedgerProps {
	return {
		items: {},
		...overrides,
	};
}

test.describe("BokLedger", () => {
	test("renders empty state when no items", async ({ mount }) => {
		const component = await mount(<BokLedger {...makeProps()} />);
		await expect(component.getByTestId("bok-ledger")).toBeVisible();
		await expect(component.getByText("Your packs are empty...")).toBeVisible();
	});

	test("renders resource list with correct counts", async ({ mount }) => {
		const props = makeProps({
			items: { [BlockId.Wood]: 10, [BlockId.Stone]: 25 },
		});
		const component = await mount(<BokLedger {...props} />);
		await expect(component.getByTestId(`ledger-item-${BlockId.Wood}`)).toBeVisible();
		await expect(component.getByTestId(`ledger-count-${BlockId.Wood}`)).toHaveText("10");
		await expect(component.getByTestId(`ledger-count-${BlockId.Stone}`)).toHaveText("25");
	});

	test("groups items by category", async ({ mount }) => {
		const props = makeProps({
			items: {
				[BlockId.Wood]: 5,
				[BlockId.IronOre]: 3,
				22: 2, // Mushroom (food)
			},
		});
		const component = await mount(<BokLedger {...props} />);
		await expect(component.getByTestId("ledger-category-blocks")).toBeVisible();
		await expect(component.getByTestId("ledger-category-materials")).toBeVisible();
		await expect(component.getByTestId("ledger-category-food")).toBeVisible();
	});

	test("classifies tools into tools category", async ({ mount }) => {
		const props = makeProps({
			items: { 101: 1, 108: 1 }, // Wood Axe, Lantern
		});
		const component = await mount(<BokLedger {...props} />);
		await expect(component.getByTestId("ledger-category-tools")).toBeVisible();
		await expect(component.getByText("Wood Axe")).toBeVisible();
		await expect(component.getByText("Lantern")).toBeVisible();
	});

	test("shows recipes when tapping a resource", async ({ mount }) => {
		const props = makeProps({
			items: { [BlockId.Wood]: 10 },
		});
		const component = await mount(<BokLedger {...props} />);

		// Tap on Wood
		await component.getByTestId(`ledger-item-${BlockId.Wood}`).click();
		await expect(component.getByTestId("ledger-recipes")).toBeVisible();
		// Wood is used in Planks, Torches, Wood Axe, Wood Pickaxe, etc.
		await expect(component.getByText("Recipes using Wood")).toBeVisible();
	});

	test("shows no-recipes message for unused resources", async ({ mount }) => {
		const props = makeProps({
			items: { [BlockId.Grass]: 5 },
		});
		const component = await mount(<BokLedger {...props} />);

		await component.getByTestId(`ledger-item-${BlockId.Grass}`).click();
		await expect(component.getByText("No known recipes use this resource.")).toBeVisible();
	});

	test("deselects resource on second tap", async ({ mount }) => {
		const props = makeProps({
			items: { [BlockId.Wood]: 10 },
		});
		const component = await mount(<BokLedger {...props} />);

		// Select
		await component.getByTestId(`ledger-item-${BlockId.Wood}`).click();
		await expect(component.getByTestId("ledger-recipes")).toBeVisible();

		// Deselect
		await component.getByTestId(`ledger-item-${BlockId.Wood}`).click();
		await expect(component.getByTestId("ledger-recipes")).not.toBeVisible();
	});

	test("displays recipe details with costs and tier", async ({ mount }) => {
		const props = makeProps({
			items: { [BlockId.Wood]: 10 },
		});
		const component = await mount(<BokLedger {...props} />);

		await component.getByTestId(`ledger-item-${BlockId.Wood}`).click();
		// Wood Planks recipe exists
		await expect(component.getByTestId("recipe-planks")).toBeVisible();
		await expect(component.getByText("Wood Planks x4")).toBeVisible();
	});

	test("sorts entries by category then name", async ({ mount }) => {
		const props = makeProps({
			items: {
				[BlockId.Stone]: 5,
				[BlockId.Wood]: 3,
				[BlockId.IronOre]: 2,
				22: 1, // Mushroom
			},
		});
		const component = await mount(<BokLedger {...props} />);

		// Blocks section should come before Materials section
		const sections = component.locator("[data-testid^='ledger-category-']");
		const firstSection = sections.first();
		await expect(firstSection).toHaveAttribute("data-testid", "ledger-category-blocks");
	});
});
