import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { HotbarSlot } from "../../../ecs/traits/index.ts";
import { BlockId } from "../../../world/blocks.ts";
import { HotbarDisplay } from "./HotbarDisplay.tsx";

const SCREENSHOT_DIR = "src/ui/game/hud/__screenshots__";

const emptyInventory = { items: {}, capacity: 256 };

describe("HotbarDisplay", () => {
	test("renders 5 empty slots", async () => {
		const screen = await render(
			<HotbarDisplay
				slots={[null, null, null, null, null]}
				activeSlot={0}
				inventory={emptyInventory}
				onSlotClick={() => {}}
			/>,
		);
		const buttons = screen.container.querySelectorAll("button");
		expect(buttons.length).toBe(5);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/hotbar-empty.png` });
	});

	test("highlights active slot with amber border", async () => {
		const screen = await render(
			<HotbarDisplay
				slots={[null, null, null, null, null]}
				activeSlot={2}
				inventory={emptyInventory}
				onSlotClick={() => {}}
			/>,
		);
		const buttons = screen.container.querySelectorAll("button");
		expect(buttons[2]?.className).toContain("border-amber-400");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/hotbar-active-slot-2.png` });
	});

	test("shows block quantity for occupied slots", async () => {
		const slots: (HotbarSlot | null)[] = [{ id: BlockId.Wood, type: "block" }, null, null, null, null];
		const inv = { items: { [BlockId.Wood]: 42 }, capacity: 256 };
		const screen = await render(<HotbarDisplay slots={slots} activeSlot={0} inventory={inv} onSlotClick={() => {}} />);
		await expect.element(screen.getByText("42")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/hotbar-block-qty.png` });
	});

	test("calls onSlotClick with correct index", async () => {
		const onSlotClick = vi.fn();
		const screen = await render(
			<HotbarDisplay
				slots={[null, null, null, null, null]}
				activeSlot={0}
				inventory={emptyInventory}
				onSlotClick={onSlotClick}
			/>,
		);
		const buttons = screen.container.querySelectorAll("button");
		await buttons[3].click();
		expect(onSlotClick).toHaveBeenCalledWith(3);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/hotbar-click-slot-3.png` });
	});
});

describe("HotbarDisplay durability bar", () => {
	test("shows durability bar for tool with durability", async () => {
		const slots: (HotbarSlot | null)[] = [{ id: 101, type: "item", durability: 50 }, null, null, null, null];
		const screen = await render(
			<HotbarDisplay slots={slots} activeSlot={0} inventory={emptyInventory} onSlotClick={() => {}} />,
		);
		const bar = screen.container.querySelector("[data-testid='durability-bar']");
		expect(bar).not.toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/hotbar-durability-full.png` });
	});

	test("durability fill is green at high durability (50/50)", async () => {
		const slots: (HotbarSlot | null)[] = [{ id: 101, type: "item", durability: 50 }, null, null, null, null];
		const screen = await render(
			<HotbarDisplay slots={slots} activeSlot={0} inventory={emptyInventory} onSlotClick={() => {}} />,
		);
		const fill = screen.container.querySelector("[data-testid='durability-fill']") as HTMLElement;
		expect(getComputedStyle(fill).background).toContain("74, 222, 128"); // green
		await page.screenshot({ path: `${SCREENSHOT_DIR}/hotbar-durability-green.png` });
	});

	test("durability fill is yellow at low durability (15/50)", async () => {
		const slots: (HotbarSlot | null)[] = [{ id: 101, type: "item", durability: 15 }, null, null, null, null];
		const screen = await render(
			<HotbarDisplay slots={slots} activeSlot={0} inventory={emptyInventory} onSlotClick={() => {}} />,
		);
		const fill = screen.container.querySelector("[data-testid='durability-fill']") as HTMLElement;
		expect(getComputedStyle(fill).background).toContain("250, 204, 21"); // yellow
		await page.screenshot({ path: `${SCREENSHOT_DIR}/hotbar-durability-yellow.png` });
	});

	test("durability fill is red at critical durability (5/50)", async () => {
		const slots: (HotbarSlot | null)[] = [{ id: 101, type: "item", durability: 5 }, null, null, null, null];
		const screen = await render(
			<HotbarDisplay slots={slots} activeSlot={0} inventory={emptyInventory} onSlotClick={() => {}} />,
		);
		const fill = screen.container.querySelector("[data-testid='durability-fill']") as HTMLElement;
		expect(getComputedStyle(fill).background).toContain("239, 68, 68"); // red
		await page.screenshot({ path: `${SCREENSHOT_DIR}/hotbar-durability-red.png` });
	});

	test("no durability bar for block slots", async () => {
		const slots: (HotbarSlot | null)[] = [{ id: BlockId.Wood, type: "block" }, null, null, null, null];
		const screen = await render(
			<HotbarDisplay slots={slots} activeSlot={0} inventory={emptyInventory} onSlotClick={() => {}} />,
		);
		const bar = screen.container.querySelector("[data-testid='durability-bar']");
		expect(bar).toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/hotbar-block-no-durability.png` });
	});

	test("no durability bar for item without durability field", async () => {
		const slots: (HotbarSlot | null)[] = [{ id: 101, type: "item" }, null, null, null, null];
		const screen = await render(
			<HotbarDisplay slots={slots} activeSlot={0} inventory={emptyInventory} onSlotClick={() => {}} />,
		);
		const bar = screen.container.querySelector("[data-testid='durability-bar']");
		expect(bar).toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/hotbar-item-no-durability.png` });
	});
});
