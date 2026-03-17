import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { NewGameModal } from "./NewGameModal.tsx";

const SCREENSHOT_DIR = "src/ui/landing/__screenshots__";

describe("NewGameModal", () => {
	test("renders with seed input and shuffle button", async () => {
		const screen = await render(<NewGameModal onStart={() => {}} onClose={() => {}} />);
		await expect.element(screen.container.querySelector("#seed-input") as HTMLElement).toBeVisible();
		await expect.element(screen.getByLabelText("Shuffle seed")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/new-game-modal-base.png` });
	});

	test("generates adjective-adjective-noun seed on mount", async () => {
		const screen = await render(<NewGameModal onStart={() => {}} onClose={() => {}} />);
		const input = screen.container.querySelector("#seed-input") as HTMLInputElement;
		expect(input).not.toBeNull();
		// Should have at least 2 words (adjective adjective noun)
		expect(input.value.split(" ").length).toBeGreaterThanOrEqual(2);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/new-game-modal-seed.png` });
	});

	test("shuffle button changes the seed", async () => {
		const screen = await render(<NewGameModal onStart={() => {}} onClose={() => {}} />);
		const input = screen.container.querySelector("#seed-input") as HTMLInputElement;
		const before = input.value;
		await screen.getByLabelText("Shuffle seed").click();
		const after = input.value;
		// Seeds should differ (extremely unlikely to be the same)
		expect(after).not.toBe(before);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/new-game-modal-shuffled.png` });
	});

	test("Awaken button calls onStart with seed", async () => {
		const onStart = vi.fn();
		const screen = await render(<NewGameModal onStart={onStart} onClose={() => {}} />);
		await screen.getByRole("button", { name: "Awaken" }).click();
		expect(onStart).toHaveBeenCalled();
		expect(onStart.mock.calls[0][0].length).toBeGreaterThan(0);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/new-game-modal-awaken.png` });
	});

	test("Back button calls onClose", async () => {
		const onClose = vi.fn();
		const screen = await render(<NewGameModal onStart={() => {}} onClose={onClose} />);
		await screen.getByRole("button", { name: "Back" }).click();
		expect(onClose).toHaveBeenCalled();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/new-game-modal-back.png` });
	});

	test("has ARIA dialog role", async () => {
		const screen = await render(<NewGameModal onStart={() => {}} onClose={() => {}} />);
		const dialog = screen.container.querySelector("[role='dialog']");
		expect(dialog).not.toBeNull();
	});

	test("all buttons have type=button", async () => {
		const screen = await render(<NewGameModal onStart={() => {}} onClose={() => {}} />);
		const buttons = screen.container.querySelectorAll("button");
		for (const btn of buttons) {
			expect(btn.getAttribute("type")).toBe("button");
		}
	});
});
