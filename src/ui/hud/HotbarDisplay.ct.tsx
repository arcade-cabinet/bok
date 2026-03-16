import { expect, test } from "@playwright/experimental-ct-react";
import type { HotbarSlot } from "../../ecs/traits/index.ts";
import { BlockId } from "../../world/blocks.ts";
import { HotbarDisplay } from "./HotbarDisplay.tsx";

const emptyInventory = { items: {}, capacity: 256 };

test.describe("HotbarDisplay", () => {
	test("renders 5 empty slots", async ({ mount }) => {
		const component = await mount(
			<HotbarDisplay
				slots={[null, null, null, null, null]}
				activeSlot={0}
				inventory={emptyInventory}
				onSlotClick={() => {}}
			/>,
		);
		const buttons = component.locator("button");
		await expect(buttons).toHaveCount(5);
	});

	test("highlights active slot", async ({ mount }) => {
		const component = await mount(
			<HotbarDisplay
				slots={[null, null, null, null, null]}
				activeSlot={2}
				inventory={emptyInventory}
				onSlotClick={() => {}}
			/>,
		);
		// The third button (index 2) should have the active style
		const buttons = component.locator("button");
		const activeButton = buttons.nth(2);
		await expect(activeButton).toHaveCSS("border-color", "rgb(251, 191, 36)");
	});

	test("shows block quantity for occupied slots", async ({ mount }) => {
		const slots: (HotbarSlot | null)[] = [{ id: BlockId.Wood, type: "block" }, null, null, null, null];
		const inv = { items: { [BlockId.Wood]: 42 }, capacity: 256 };
		const component = await mount(
			<HotbarDisplay slots={slots} activeSlot={0} inventory={inv} onSlotClick={() => {}} />,
		);
		await expect(component.getByText("42")).toBeVisible();
	});

	test("calls onSlotClick with correct index", async ({ mount }) => {
		let clickedIndex = -1;
		const component = await mount(
			<HotbarDisplay
				slots={[null, null, null, null, null]}
				activeSlot={0}
				inventory={emptyInventory}
				onSlotClick={(i) => {
					clickedIndex = i;
				}}
			/>,
		);
		await component.locator("button").nth(3).click();
		expect(clickedIndex).toBe(3);
	});
});

test.describe("HotbarDisplay durability bar", () => {
	test("shows durability bar for tool with durability", async ({ mount }) => {
		const slots: (HotbarSlot | null)[] = [
			{ id: 101, type: "item", durability: 50 }, // Wood Axe, full
			null,
			null,
			null,
			null,
		];
		const component = await mount(
			<HotbarDisplay slots={slots} activeSlot={0} inventory={emptyInventory} onSlotClick={() => {}} />,
		);
		const bar = component.getByTestId("durability-bar");
		await expect(bar).toBeVisible();
	});

	test("durability fill width reflects remaining percentage", async ({ mount }) => {
		const slots: (HotbarSlot | null)[] = [
			{ id: 101, type: "item", durability: 25 }, // 50% of 50
			null,
			null,
			null,
			null,
		];
		const component = await mount(
			<HotbarDisplay slots={slots} activeSlot={0} inventory={emptyInventory} onSlotClick={() => {}} />,
		);
		const fill = component.getByTestId("durability-fill");
		await expect(fill).toHaveCSS("width", /\d+/);
		// 50% durability → green color
		await expect(fill).toHaveCSS("background-color", "rgb(74, 222, 128)");
	});

	test("durability bar turns yellow at low durability", async ({ mount }) => {
		const slots: (HotbarSlot | null)[] = [
			{ id: 101, type: "item", durability: 15 }, // 30% of 50
			null,
			null,
			null,
			null,
		];
		const component = await mount(
			<HotbarDisplay slots={slots} activeSlot={0} inventory={emptyInventory} onSlotClick={() => {}} />,
		);
		const fill = component.getByTestId("durability-fill");
		await expect(fill).toHaveCSS("background-color", "rgb(250, 204, 21)");
	});

	test("durability bar turns red at critical durability", async ({ mount }) => {
		const slots: (HotbarSlot | null)[] = [
			{ id: 101, type: "item", durability: 5 }, // 10% of 50
			null,
			null,
			null,
			null,
		];
		const component = await mount(
			<HotbarDisplay slots={slots} activeSlot={0} inventory={emptyInventory} onSlotClick={() => {}} />,
		);
		const fill = component.getByTestId("durability-fill");
		await expect(fill).toHaveCSS("background-color", "rgb(239, 68, 68)");
	});

	test("no durability bar for block slots", async ({ mount }) => {
		const slots: (HotbarSlot | null)[] = [{ id: BlockId.Wood, type: "block" }, null, null, null, null];
		const component = await mount(
			<HotbarDisplay slots={slots} activeSlot={0} inventory={emptyInventory} onSlotClick={() => {}} />,
		);
		const bar = component.getByTestId("durability-bar");
		await expect(bar).toHaveCount(0);
	});

	test("no durability bar for item without durability field", async ({ mount }) => {
		const slots: (HotbarSlot | null)[] = [
			{ id: 101, type: "item" }, // No durability field
			null,
			null,
			null,
			null,
		];
		const component = await mount(
			<HotbarDisplay slots={slots} activeSlot={0} inventory={emptyInventory} onSlotClick={() => {}} />,
		);
		const bar = component.getByTestId("durability-bar");
		await expect(bar).toHaveCount(0);
	});

	test("handles broken tool (slot becomes null)", async ({ mount }) => {
		const slots: (HotbarSlot | null)[] = [null, null, null, null, null];
		const component = await mount(
			<HotbarDisplay slots={slots} activeSlot={0} inventory={emptyInventory} onSlotClick={() => {}} />,
		);
		const bar = component.getByTestId("durability-bar");
		await expect(bar).toHaveCount(0);
	});
});
