import { expect, test } from "@playwright/experimental-ct-react";
import { CraftingMenu } from "./CraftingMenu.tsx";

const emptyInventory = { items: {}, capacity: 256 };

test.describe("CraftingMenu workstation tiers", () => {
	test("shows only hand-craft recipes at tier 0", async ({ mount }) => {
		const component = await mount(
			<CraftingMenu isOpen={true} inventory={emptyInventory} maxTier={0} onCraft={() => {}} onClose={() => {}} />,
		);
		const grid = component.getByTestId("recipe-grid");
		const buttons = grid.locator("button");
		// Tier 0 recipes: planks, torch, bricks, glass, wood_axe, wood_pick, cooked_meat, crafting_bench
		await expect(buttons).toHaveCount(8);
		// Stone pickaxe is tier 1, should NOT appear
		await expect(grid.getByText("Stone Pickaxe")).toHaveCount(0);
	});

	test("shows tier 0+1 recipes at tier 1 (crafting bench)", async ({ mount }) => {
		const component = await mount(
			<CraftingMenu isOpen={true} inventory={emptyInventory} maxTier={1} onCraft={() => {}} onClose={() => {}} />,
		);
		const grid = component.getByTestId("recipe-grid");
		// Tier 1 includes stone_pick, sword, lantern, forge, treated_planks
		await expect(grid.getByText("Stone Pickaxe")).toHaveCount(1);
		await expect(grid.getByText("Stone Sword")).toHaveCount(1);
		await expect(grid.getByText("Lantern")).toHaveCount(1);
		await expect(grid.getByText("Forge")).toHaveCount(1);
		// Iron pickaxe is tier 2, should NOT appear
		await expect(grid.getByText("Iron Pickaxe")).toHaveCount(0);
	});

	test("shows tier 0+1+2 recipes at tier 2 (forge)", async ({ mount }) => {
		const component = await mount(
			<CraftingMenu isOpen={true} inventory={emptyInventory} maxTier={2} onCraft={() => {}} onClose={() => {}} />,
		);
		const grid = component.getByTestId("recipe-grid");
		await expect(grid.getByText("Iron Pickaxe")).toHaveCount(1);
		await expect(grid.getByText("Iron Axe")).toHaveCount(1);
		await expect(grid.getByText("Ember Lantern")).toHaveCount(1);
		await expect(grid.getByText("Scriptorium")).toHaveCount(1);
	});

	test("shows all recipes at tier 3 (scriptorium)", async ({ mount }) => {
		const component = await mount(
			<CraftingMenu isOpen={true} inventory={emptyInventory} maxTier={3} onCraft={() => {}} onClose={() => {}} />,
		);
		const grid = component.getByTestId("recipe-grid");
		const buttons = grid.locator("button");
		// All recipes should be visible
		const count = await buttons.count();
		expect(count).toBeGreaterThanOrEqual(19);
	});

	test("displays tier indicator", async ({ mount }) => {
		const component = await mount(
			<CraftingMenu isOpen={true} inventory={emptyInventory} maxTier={0} onCraft={() => {}} onClose={() => {}} />,
		);
		const indicator = component.getByTestId("tier-indicator");
		await expect(indicator).toContainText("Hand");
	});

	test("displays tier indicator for bench", async ({ mount }) => {
		const component = await mount(
			<CraftingMenu isOpen={true} inventory={emptyInventory} maxTier={1} onCraft={() => {}} onClose={() => {}} />,
		);
		const indicator = component.getByTestId("tier-indicator");
		await expect(indicator).toContainText("Bench");
	});

	test("renders nothing when closed", async ({ mount }) => {
		const component = await mount(
			<CraftingMenu isOpen={false} inventory={emptyInventory} maxTier={0} onCraft={() => {}} onClose={() => {}} />,
		);
		await expect(component.locator("[role='dialog']")).toHaveCount(0);
	});

	test("calls onCraft with correct recipe id", async ({ mount }) => {
		let craftedId = "";
		const richInventory = {
			items: { 4: 100, 3: 100, 9: 100 },
			capacity: 256,
		};
		const component = await mount(
			<CraftingMenu
				isOpen={true}
				inventory={richInventory}
				maxTier={0}
				onCraft={(id) => {
					craftedId = id;
				}}
				onClose={() => {}}
			/>,
		);
		await component.getByText("Wood Planks x4").click();
		expect(craftedId).toBe("planks");
	});
});
