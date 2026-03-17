import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { RuneId } from "../../../ecs/systems/rune-data.ts";
import { Species } from "../../../ecs/traits/index.ts";
import type { BokCodexProps } from "./BokCodex.tsx";
import { BokCodex } from "./BokCodex.tsx";

const SCREENSHOT_DIR = "src/ui/game/bok/__screenshots__";

function makeProps(overrides: Partial<BokCodexProps> = {}): BokCodexProps {
	return {
		creatureProgress: {},
		loreEntryIds: [],
		discoveredRecipeCount: 0,
		discoveredRuneIds: [],
		...overrides,
	};
}

describe("BokCodex", () => {
	test("renders creature section", async () => {
		const screen = await render(<BokCodex {...makeProps()} />);
		await expect.element(screen.getByTestId("codex-creatures")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-codex-empty.png` });
	});

	test("shows ??? for hidden creatures", async () => {
		const screen = await render(<BokCodex {...makeProps()} />);
		const morker = screen.getByTestId(`creature-${Species.Morker}`);
		await expect.element(morker).toBeVisible();
		// Multiple creatures are hidden — at least one shows ???
		const hiddenNames = screen.container.querySelectorAll("[data-stage='0']");
		expect(hiddenNames.length).toBeGreaterThan(0);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-codex-hidden-creature.png` });
	});

	test("shows name at silhouette stage (25% progress)", async () => {
		const props = makeProps({
			creatureProgress: { [Species.Morker]: 0.3 },
		});
		const screen = await render(<BokCodex {...props} />);
		const morker = screen.getByTestId(`creature-${Species.Morker}`);
		await expect.element(morker).toBeVisible();
		await expect.element(screen.getByText("Mörker")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-codex-silhouette-stage.png` });
	});

	test("shows description at basic stage (60% progress)", async () => {
		const props = makeProps({
			creatureProgress: { [Species.Morker]: 0.7 },
		});
		const screen = await render(<BokCodex {...props} />);
		const morker = screen.getByTestId(`creature-${Species.Morker}`);
		await expect.element(morker).toBeVisible();
		await expect.element(screen.getByText(/Shadow creatures/)).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-codex-basic-stage.png` });
	});

	test("shows weaknesses and drops at full stage (100%)", async () => {
		const props = makeProps({
			creatureProgress: { [Species.Morker]: 1.0 },
		});
		const screen = await render(<BokCodex {...props} />);
		const morker = screen.getByTestId(`creature-${Species.Morker}`);
		await expect.element(morker).toBeVisible();
		await expect.element(screen.getByText(/Torchlight burns/)).toBeVisible();
		await expect.element(screen.getByText(/Shadow Essence/)).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-codex-full-stage.png` });
	});

	test("does not show description at silhouette stage", async () => {
		const props = makeProps({
			creatureProgress: { [Species.Morker]: 0.3 },
		});
		const screen = await render(<BokCodex {...props} />);
		// At silhouette stage, description is not rendered at all
		const descriptionEl = Array.from(screen.container.querySelectorAll("p")).find((el) =>
			el.textContent?.includes("Shadow creatures"),
		);
		expect(descriptionEl).toBeUndefined();
	});

	test("renders lore entries when collected", async () => {
		const props = makeProps({
			loreEntryIds: ["lore_rune_origin"],
		});
		const screen = await render(<BokCodex {...props} />);
		await expect.element(screen.getByTestId("codex-lore")).toBeVisible();
		await expect.element(screen.getByText("Origin of the Runes")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-codex-lore.png` });
	});

	test("does not render lore section when empty", async () => {
		const screen = await render(<BokCodex {...makeProps()} />);
		// codex-lore is conditionally rendered — should not exist in DOM
		expect(screen.container.querySelector("[data-testid='codex-lore']")).toBeNull();
	});

	test("renders recipe discovery count", async () => {
		const props = makeProps({
			discoveredRecipeCount: 3,
		});
		const screen = await render(<BokCodex {...props} />);
		await expect.element(screen.getByTestId("codex-recipes")).toBeVisible();
		await expect.element(screen.getByText("3 recipes discovered")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-codex-recipes.png` });
	});

	test("has progress bar for each creature", async () => {
		const props = makeProps({
			creatureProgress: { [Species.Morker]: 0.5 },
		});
		const screen = await render(<BokCodex {...props} />);
		// Progress bar is a 1px-height div — check it exists in DOM
		expect(screen.container.querySelector(`[data-testid='progress-${Species.Morker}']`)).not.toBeNull();
	});

	test("does not render runes section when no runes discovered", async () => {
		const screen = await render(<BokCodex {...makeProps()} />);
		// codex-runes is conditionally rendered — should not exist in DOM
		expect(screen.container.querySelector("[data-testid='codex-runes']")).toBeNull();
	});

	test("renders runes section with discovered runes", async () => {
		const props = makeProps({
			discoveredRuneIds: [RuneId.Kenaz, RuneId.Sowilo],
		});
		const screen = await render(<BokCodex {...props} />);
		await expect.element(screen.getByTestId("codex-runes")).toBeVisible();
		await expect.element(screen.getByTestId("rune-entry-kenaz")).toBeVisible();
		await expect.element(screen.getByTestId("rune-entry-sowilo")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-codex-runes.png` });
	});

	test("shows discovery and behavior text for rune entries", async () => {
		const props = makeProps({
			discoveredRuneIds: [RuneId.Kenaz],
		});
		const screen = await render(<BokCodex {...props} />);
		const kenaz = screen.getByTestId("rune-entry-kenaz");
		await expect.element(kenaz).toBeVisible();
		await expect.element(screen.getByText(/Torch/)).toBeVisible();
		await expect.element(screen.getByText(/heat/i)).toBeVisible();
	});

	test("shows rune count in header", async () => {
		const props = makeProps({
			discoveredRuneIds: [RuneId.Kenaz, RuneId.Sowilo],
		});
		const screen = await render(<BokCodex {...props} />);
		// TOTAL_DISCOVERABLE_RUNES is 15
		await expect.element(screen.getByText("Runes (2/15)")).toBeVisible();
	});

	test("does not show undiscovered runes", async () => {
		const props = makeProps({
			discoveredRuneIds: [RuneId.Kenaz],
		});
		const screen = await render(<BokCodex {...props} />);
		await expect.element(screen.getByTestId("rune-entry-kenaz")).toBeVisible();
		// Undiscovered runes are not rendered at all — not just hidden
		expect(screen.container.querySelector("[data-testid='rune-entry-sowilo']")).toBeNull();
	});
});
