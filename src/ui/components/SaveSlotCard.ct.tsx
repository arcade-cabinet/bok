import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { DeleteDialog, SlotCard } from "./SaveSlotCard.tsx";
import type { SlotPreview } from "./SaveSlotManager.tsx";

const SCREENSHOT_DIR = "src/ui/components/__screenshots__";

const emptyLikeSlot: SlotPreview = {
	id: 1,
	name: "New Saga",
	seed: "abc123",
	dayCount: 1,
	biome: "Meadow",
	inscriptionLevel: 0,
	updatedAt: "2026-03-17T00:00:00Z",
};

const populatedSlot: SlotPreview = {
	id: 2,
	name: "Vigdis the Wanderer",
	seed: "xyz789",
	dayCount: 47,
	biome: "Blothogen",
	inscriptionLevel: 12,
	updatedAt: "2026-03-17T12:00:00Z",
};

describe("SlotCard", () => {
	test("renders empty-like slot with day 1 and no inscriptions", async () => {
		const screen = await render(<SlotCard slot={emptyLikeSlot} onSelect={vi.fn()} onRequestDelete={vi.fn()} />);
		await expect.element(screen.getByTestId("slot-1")).toBeVisible();
		await expect.element(screen.getByTestId("slot-name-1")).toHaveTextContent("New Saga");
		await expect.element(screen.getByTestId("slot-day-1")).toHaveAttribute("data-day", "1");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/save-slot-card-empty.png` });
	});

	test("renders populated slot with day count, biome and inscription level", async () => {
		const screen = await render(<SlotCard slot={populatedSlot} onSelect={vi.fn()} onRequestDelete={vi.fn()} />);
		await expect.element(screen.getByTestId("slot-2")).toBeVisible();
		await expect.element(screen.getByTestId("slot-name-2")).toHaveTextContent("Vigdis the Wanderer");
		await expect.element(screen.getByTestId("slot-day-2")).toHaveAttribute("data-day", "47");
		await expect.element(screen.getByTestId("slot-biome-2")).toHaveTextContent("Blothogen");
		await expect.element(screen.getByTestId("slot-inscription-2")).toHaveAttribute("data-level", "12");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/save-slot-card-populated.png` });
	});

	test("calls onSelect when slot name is clicked", async () => {
		const onSelect = vi.fn();
		const screen = await render(<SlotCard slot={populatedSlot} onSelect={onSelect} onRequestDelete={vi.fn()} />);
		await screen.getByTestId("slot-name-2").click();
		expect(onSelect).toHaveBeenCalledWith(2);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/save-slot-card-select.png` });
	});

	test("calls onRequestDelete when delete button is clicked", async () => {
		const onRequestDelete = vi.fn();
		const screen = await render(<SlotCard slot={populatedSlot} onSelect={vi.fn()} onRequestDelete={onRequestDelete} />);
		await screen.getByTestId("delete-2").click();
		expect(onRequestDelete).toHaveBeenCalledWith(2);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/save-slot-card-delete-trigger.png` });
	});
});

describe("DeleteDialog", () => {
	test("renders delete confirmation dialog", async () => {
		const screen = await render(<DeleteDialog onConfirm={vi.fn()} onCancel={vi.fn()} />);
		await expect.element(screen.getByTestId("delete-dialog")).toBeVisible();
		await expect.element(screen.getByTestId("delete-dialog")).toHaveAttribute("role", "alertdialog");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/save-slot-delete-dialog.png` });
	});

	test("calls onConfirm when Erase button is clicked", async () => {
		const onConfirm = vi.fn();
		const screen = await render(<DeleteDialog onConfirm={onConfirm} onCancel={vi.fn()} />);
		await screen.getByTestId("confirm-delete").click();
		expect(onConfirm).toHaveBeenCalledOnce();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/save-slot-delete-confirm.png` });
	});

	test("calls onCancel when Keep button is clicked", async () => {
		const onCancel = vi.fn();
		const screen = await render(<DeleteDialog onConfirm={vi.fn()} onCancel={onCancel} />);
		await screen.getByTestId("cancel-delete").click();
		expect(onCancel).toHaveBeenCalledOnce();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/save-slot-delete-cancel.png` });
	});
});
