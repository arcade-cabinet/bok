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
