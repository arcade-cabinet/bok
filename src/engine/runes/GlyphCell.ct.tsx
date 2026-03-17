import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { RuneId } from "../../ecs/systems/rune-data.ts";
import { GlyphCell } from "./GlyphCell.tsx";

const SCREENSHOT_DIR = "src/engine/runes/__screenshots__";

// ─── Layer 1: Basic Rendering ───

describe("GlyphCell — basic rendering", () => {
	test("renders blank cell with no rune", async () => {
		const screen = await render(<GlyphCell runeId={0} glowIntensity={0} size={64} />);
		const cell = screen.getByTestId("rune-cell");
		await expect.element(cell).toBeVisible();
		await expect.element(cell).toHaveAttribute("data-rune", "none");
		await expect.element(cell).toHaveAttribute("data-glow", "0");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/rune-cell-blank.png` });
	});

	test("renders Kenaz glyph with color", async () => {
		const screen = await render(<GlyphCell runeId={RuneId.Kenaz} glowIntensity={0} size={64} />);
		const cell = screen.getByTestId("rune-cell");
		await expect.element(cell).toHaveAttribute("data-rune", "kenaz");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/rune-cell-kenaz.png` });
	});

	test("renders Fehu glyph", async () => {
		const screen = await render(<GlyphCell runeId={RuneId.Fehu} glowIntensity={0} size={64} />);
		await expect.element(screen.getByTestId("rune-cell")).toHaveAttribute("data-rune", "fehu");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/rune-cell-fehu.png` });
	});
});

// ─── Layer 2: Glow States ───

describe("GlyphCell — glow intensity", () => {
	test("zero glow = dim rune", async () => {
		const screen = await render(<GlyphCell runeId={RuneId.Isa} glowIntensity={0} size={64} />);
		await expect.element(screen.getByTestId("rune-cell")).toHaveAttribute("data-glow", "0");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/rune-cell-isa-dim.png` });
	});

	test("full glow = bright rune", async () => {
		const screen = await render(<GlyphCell runeId={RuneId.Isa} glowIntensity={1} size={64} />);
		await expect.element(screen.getByTestId("rune-cell")).toHaveAttribute("data-glow", "1");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/rune-cell-isa-bright.png` });
	});

	test("half glow = medium brightness", async () => {
		const screen = await render(<GlyphCell runeId={RuneId.Berkanan} glowIntensity={0.5} size={64} />);
		await expect.element(screen.getByTestId("rune-cell")).toHaveAttribute("data-glow", "0.5");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/rune-cell-berkanan-half.png` });
	});
});

// ─── Layer 3: Multiple Runes Side-by-Side ───

describe("GlyphCell — rune gallery", () => {
	test("renders all computational runes for visual comparison", async () => {
		const runes = [RuneId.Naudiz, RuneId.Hagalaz, RuneId.Isa];
		const screen = await render(
			<div style={{ display: "flex", gap: "8px" }}>
				{runes.map((id) => (
					<GlyphCell key={id} runeId={id} glowIntensity={0.8} size={64} />
				))}
			</div>,
		);
		const cells = screen.container.querySelectorAll("[data-testid='rune-cell']");
		expect(cells.length).toBe(3);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/rune-cell-gallery-computational.png` });
	});
});
