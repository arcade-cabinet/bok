import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { CraftingMenu } from "./CraftingMenu.tsx";

const SCREENSHOT_DIR = "src/ui/components/__screenshots__";

const emptyInventory = { items: {}, capacity: 256 };

describe("CraftingMenu workstation tiers", () => {
	test("shows only hand-craft recipes at tier 0", async () => {
		const screen = await render(
			<CraftingMenu isOpen={true} inventory={emptyInventory} maxTier={0} onCraft={() => {}} onClose={() => {}} />,
		);
		const grid = screen.getByTestId("recipe-grid");
		await expect.element(grid).toBeVisible();
		// Stone pickaxe is tier 1, should NOT appear
		const buttons = grid.element().querySelectorAll("button");
		// Tier 0 recipes: planks, torch, bricks, glass, wood_axe, wood_pick, cooked_meat, crafting_bench
		expect(buttons.length).toBe(8);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/crafting-menu-tier0.png` });
	});

	test("shows tier 0+1 recipes at tier 1 (crafting bench)", async () => {
		const screen = await render(
			<CraftingMenu isOpen={true} inventory={emptyInventory} maxTier={1} onCraft={() => {}} onClose={() => {}} />,
		);
		const grid = screen.getByTestId("recipe-grid");
		await expect.element(screen.getByText("Stone Pickaxe")).toBeVisible();
		await expect.element(screen.getByText("Stone Sword")).toBeVisible();
		await expect.element(screen.getByText("Lantern")).toBeVisible();
		await expect.element(screen.getByText("Forge")).toBeVisible();
		await expect.element(grid).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/crafting-menu-tier1.png` });
	});

	test("shows tier 0+1+2 recipes at tier 2 (forge)", async () => {
		const screen = await render(
			<CraftingMenu isOpen={true} inventory={emptyInventory} maxTier={2} onCraft={() => {}} onClose={() => {}} />,
		);
		await expect.element(screen.getByText("Iron Pickaxe")).toBeVisible();
		await expect.element(screen.getByText("Iron Axe")).toBeVisible();
		await expect.element(screen.getByText("Ember Lantern")).toBeVisible();
		await expect.element(screen.getByText("Scriptorium")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/crafting-menu-tier2.png` });
	});

	test("shows all recipes at tier 3 (scriptorium)", async () => {
		const screen = await render(
			<CraftingMenu isOpen={true} inventory={emptyInventory} maxTier={3} onCraft={() => {}} onClose={() => {}} />,
		);
		const grid = screen.getByTestId("recipe-grid");
		const buttons = grid.element().querySelectorAll("button");
		// All recipes should be visible
		expect(buttons.length).toBeGreaterThanOrEqual(19);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/crafting-menu-tier3.png` });
	});

	test("displays tier indicator for hand", async () => {
		const screen = await render(
			<CraftingMenu isOpen={true} inventory={emptyInventory} maxTier={0} onCraft={() => {}} onClose={() => {}} />,
		);
		const indicator = screen.getByTestId("tier-indicator");
		await expect.element(indicator).toBeVisible();
		await expect.element(indicator).toHaveTextContent(/Hand/);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/crafting-menu-tier-indicator-hand.png` });
	});

	test("displays tier indicator for bench", async () => {
		const screen = await render(
			<CraftingMenu isOpen={true} inventory={emptyInventory} maxTier={1} onCraft={() => {}} onClose={() => {}} />,
		);
		const indicator = screen.getByTestId("tier-indicator");
		await expect.element(indicator).toHaveTextContent(/Bench/);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/crafting-menu-tier-indicator-bench.png` });
	});

	test("renders nothing when closed", async () => {
		const screen = await render(
			<CraftingMenu isOpen={false} inventory={emptyInventory} maxTier={0} onCraft={() => {}} onClose={() => {}} />,
		);
		const dialog = screen.container.querySelector("[role='dialog']");
		expect(dialog).toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/crafting-menu-closed.png` });
	});

	test("calls onCraft with correct recipe id", async () => {
		const onCraft = vi.fn();
		const richInventory = {
			items: { 4: 100, 3: 100, 9: 100 },
			capacity: 256,
		};
		const screen = await render(
			<CraftingMenu isOpen={true} inventory={richInventory} maxTier={0} onCraft={onCraft} onClose={() => {}} />,
		);
		await screen.getByText("Wood Planks x4").click();
		expect(onCraft).toHaveBeenCalledWith("planks");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/crafting-menu-crafted.png` });
	});
});
