import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { RuneIdValue } from "../../ecs/systems/rune-data.ts";
import { RuneId } from "../../ecs/systems/rune-data.ts";
import { RuneWheel } from "./RuneWheel.tsx";

const SCREENSHOT_DIR = "src/ui/shared/__screenshots__";

describe("RuneWheel", () => {
	test("renders nothing when closed", async () => {
		const screen = await render(<RuneWheel isOpen={false} onSelectRune={() => {}} onClose={() => {}} />);
		const dialog = screen.container.querySelector("[role='dialog']");
		expect(dialog).toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/rune-wheel-closed.png` });
	});

	test("renders dialog when open", async () => {
		const screen = await render(<RuneWheel isOpen={true} onSelectRune={() => {}} onClose={() => {}} />);
		await expect.element(screen.getByTestId("rune-wheel")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/rune-wheel-open.png` });
	});

	test("renders all 15 rune buttons when no discovery filter", async () => {
		const screen = await render(<RuneWheel isOpen={true} onSelectRune={() => {}} onClose={() => {}} />);
		const buttons = screen.container.querySelectorAll("button");
		expect(buttons.length).toBe(15);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/rune-wheel-all-runes.png` });
	});

	test("renders rune glyphs", async () => {
		const screen = await render(<RuneWheel isOpen={true} onSelectRune={() => {}} onClose={() => {}} />);
		// Fehu glyph: ᚠ
		await expect.element(screen.getByTestId("rune-fehu")).toBeVisible();
		await expect.element(screen.getByTestId("rune-algiz")).toBeVisible();
		await expect.element(screen.getByTestId("rune-berkanan")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/rune-wheel-glyphs.png` });
	});

	test("calls onSelectRune with correct ID when clicking a rune", async () => {
		let selectedId: RuneIdValue = RuneId.None as RuneIdValue;
		const onSelectRune = vi.fn((id: RuneIdValue) => {
			selectedId = id;
		});
		const screen = await render(<RuneWheel isOpen={true} onSelectRune={onSelectRune} onClose={() => {}} />);
		await screen.getByTestId("rune-fehu").click();
		expect(onSelectRune).toHaveBeenCalled();
		expect(selectedId).toBe(RuneId.Fehu);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/rune-wheel-selected.png` });
	});

	test("calls onClose when backdrop is clicked", async () => {
		const onClose = vi.fn();
		const screen = await render(<RuneWheel isOpen={true} onSelectRune={() => {}} onClose={onClose} />);
		const backdrop = screen.container.querySelector("[data-testid='rune-wheel-backdrop']") as HTMLElement;
		expect(backdrop).not.toBeNull();
		backdrop.click();
		expect(onClose).toHaveBeenCalled();
	});

	test("has accessible labels on rune buttons", async () => {
		const screen = await render(<RuneWheel isOpen={true} onSelectRune={() => {}} onClose={() => {}} />);
		const fehu = screen.getByTestId("rune-fehu");
		await expect.element(fehu).toBeVisible();
		// aria-label format: "Name — description"
		const label = fehu.element().getAttribute("aria-label");
		expect(label).toMatch(/Fehu/);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/rune-wheel-accessibility.png` });
	});

	test("highlights the selected rune", async () => {
		const screen = await render(
			<RuneWheel isOpen={true} onSelectRune={() => {}} onClose={() => {}} highlightedRune={RuneId.Fehu} />,
		);
		const fehu = screen.getByTestId("rune-fehu");
		// Highlighted rune should have scale(1.2) transform
		const transform = fehu.element().style.transform;
		expect(transform).toContain("scale(1.2)");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/rune-wheel-highlighted.png` });
	});

	test("only shows discovered runes when filter is provided", async () => {
		const screen = await render(
			<RuneWheel
				isOpen={true}
				onSelectRune={() => {}}
				onClose={() => {}}
				discoveredRunes={[RuneId.Kenaz, RuneId.Sowilo]}
			/>,
		);
		const buttons = screen.container.querySelectorAll("button");
		expect(buttons.length).toBe(2);
		await expect.element(screen.getByTestId("rune-kenaz")).toBeVisible();
		await expect.element(screen.getByTestId("rune-sowilo")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/rune-wheel-filtered.png` });
	});

	test("hides undiscovered runes", async () => {
		const screen = await render(
			<RuneWheel isOpen={true} onSelectRune={() => {}} onClose={() => {}} discoveredRunes={[RuneId.Kenaz]} />,
		);
		await expect.element(screen.getByTestId("rune-kenaz")).toBeVisible();
		// Non-discovered runes should not exist in the DOM
		expect(screen.container.querySelector("[data-testid='rune-fehu']")).toBeNull();
		expect(screen.container.querySelector("[data-testid='rune-sowilo']")).toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/rune-wheel-hidden-undiscovered.png` });
	});

	test("renders nothing when empty discovered set", async () => {
		const screen = await render(
			<RuneWheel isOpen={true} onSelectRune={() => {}} onClose={() => {}} discoveredRunes={[]} />,
		);
		const dialog = screen.container.querySelector("[role='dialog']");
		expect(dialog).toBeNull();
	});
});
