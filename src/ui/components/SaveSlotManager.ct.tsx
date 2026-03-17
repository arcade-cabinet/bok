import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { SlotPreview } from "./SaveSlotManager.tsx";
import { SaveSlotManager } from "./SaveSlotManager.tsx";

const SCREENSHOT_DIR = "src/ui/components/__screenshots__";

// ─── Test Data ───

const MOCK_SLOTS: SlotPreview[] = [
	{
		id: 1,
		name: "Sigrid's Journey",
		seed: "Brave Dark Fox",
		dayCount: 42,
		biome: "Ängen",
		inscriptionLevel: 127,
		updatedAt: "2024-12-15 14:30:00",
	},
	{
		id: 2,
		name: "Ragnar's Realm",
		seed: "Frosty Silent Mountain",
		dayCount: 7,
		biome: "Fjällen",
		inscriptionLevel: 12,
		updatedAt: "2024-12-14 09:15:00",
	},
	{
		id: 3,
		name: "Test World",
		seed: "Golden Mystic River",
		dayCount: 1,
		biome: "Bokskogen",
		inscriptionLevel: 0,
		updatedAt: "2024-12-13 18:00:00",
	},
];

// ─── Layer 1: Empty State ───

describe("SaveSlotManager - empty state", () => {
	test("renders empty message when no slots", async () => {
		const screen = await render(
			<SaveSlotManager slots={[]} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />,
		);
		await expect.element(screen.getByTestId("slot-manager")).toBeVisible();
		await expect.element(screen.getByTestId("empty-msg")).toBeVisible();
		await expect.element(screen.getByTestId("new-saga-btn")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/slots-empty.png` });
	});
});

// ─── Layer 2: Populated Slots ───

describe("SaveSlotManager - populated slots", () => {
	test("renders all slots with preview data", async () => {
		const screen = await render(
			<SaveSlotManager slots={MOCK_SLOTS} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />,
		);

		// All 3 slots visible
		for (const slot of MOCK_SLOTS) {
			await expect.element(screen.getByTestId(`slot-${slot.id}`)).toBeVisible();
			await expect.element(screen.getByTestId(`slot-name-${slot.id}`)).toHaveTextContent(slot.name);
		}
		await page.screenshot({ path: `${SCREENSHOT_DIR}/slots-populated.png` });
	});

	test("slot shows day count, biome, and inscription level", async () => {
		const screen = await render(
			<SaveSlotManager slots={MOCK_SLOTS} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />,
		);

		const slot = MOCK_SLOTS[0];
		await expect.element(screen.getByTestId(`slot-day-${slot.id}`)).toHaveAttribute("data-day", String(slot.dayCount));
		await expect.element(screen.getByTestId(`slot-biome-${slot.id}`)).toHaveTextContent(slot.biome);
		await expect
			.element(screen.getByTestId(`slot-inscription-${slot.id}`))
			.toHaveAttribute("data-level", String(slot.inscriptionLevel));
	});

	test("clicking slot name calls onSelect", async () => {
		const onSelect = vi.fn();
		const screen = await render(
			<SaveSlotManager slots={MOCK_SLOTS} onSelect={onSelect} onCreate={() => {}} onDelete={() => {}} />,
		);
		await screen.getByTestId("slot-name-1").click();
		expect(onSelect).toHaveBeenCalledWith(1);
	});
});

// ─── Layer 3: Delete Confirmation ───

describe("SaveSlotManager - delete flow", () => {
	test("clicking delete shows confirmation dialog", async () => {
		const screen = await render(
			<SaveSlotManager slots={MOCK_SLOTS} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />,
		);

		// No dialog initially
		const dialog = screen.container.querySelector("[data-testid='delete-dialog']");
		expect(dialog).toBeNull();

		await screen.getByTestId("delete-1").click();
		await expect.element(screen.getByTestId("delete-dialog")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/slots-delete-confirm.png` });
	});

	test("confirming delete calls onDelete and closes dialog", async () => {
		const onDelete = vi.fn();
		const screen = await render(
			<SaveSlotManager slots={MOCK_SLOTS} onSelect={() => {}} onCreate={() => {}} onDelete={onDelete} />,
		);

		await screen.getByTestId("delete-2").click();
		await screen.getByTestId("confirm-delete").click();
		expect(onDelete).toHaveBeenCalledWith(2);

		// Dialog should close
		const dialog = screen.container.querySelector("[data-testid='delete-dialog']");
		expect(dialog).toBeNull();
	});

	test("cancelling delete closes dialog without calling onDelete", async () => {
		const onDelete = vi.fn();
		const screen = await render(
			<SaveSlotManager slots={MOCK_SLOTS} onSelect={() => {}} onCreate={() => {}} onDelete={onDelete} />,
		);

		await screen.getByTestId("delete-1").click();
		await screen.getByTestId("cancel-delete").click();
		expect(onDelete).not.toHaveBeenCalled();
	});
});

// ─── Layer 4: Create Flow ───

describe("SaveSlotManager - create flow", () => {
	test("clicking New Saga shows name input", async () => {
		const screen = await render(
			<SaveSlotManager slots={[]} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />,
		);

		await screen.getByTestId("new-saga-btn").click();
		await expect.element(screen.getByTestId("create-form")).toBeVisible();
		await expect.element(screen.getByTestId("name-input")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/slots-create-form.png` });
	});

	test("entering name and confirming calls onCreate", async () => {
		const onCreate = vi.fn();
		const screen = await render(
			<SaveSlotManager slots={[]} onSelect={() => {}} onCreate={onCreate} onDelete={() => {}} />,
		);

		await screen.getByTestId("new-saga-btn").click();
		await screen.getByTestId("name-input").fill("My New Saga");
		await screen.getByTestId("confirm-create").click();
		expect(onCreate).toHaveBeenCalledWith("My New Saga");
	});

	test("cancelling create hides form", async () => {
		const screen = await render(
			<SaveSlotManager slots={[]} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />,
		);

		await screen.getByTestId("new-saga-btn").click();
		await expect.element(screen.getByTestId("create-form")).toBeVisible();
		await screen.getByTestId("cancel-create").click();

		const form = screen.container.querySelector("[data-testid='create-form']");
		expect(form).toBeNull();
		await expect.element(screen.getByTestId("new-saga-btn")).toBeVisible();
	});
});
