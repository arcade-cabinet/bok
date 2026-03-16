import { expect, test } from "@playwright/experimental-ct-react";
import { Species } from "../../ecs/traits/index.ts";
import type { BokCodexProps } from "./BokCodex.tsx";
import { BokCodex } from "./BokCodex.tsx";

function makeProps(overrides: Partial<BokCodexProps> = {}): BokCodexProps {
	return {
		creatureProgress: {},
		loreEntryIds: [],
		discoveredRecipeCount: 0,
		...overrides,
	};
}

test.describe("BokCodex", () => {
	test("renders creature section", async ({ mount }) => {
		const component = await mount(<BokCodex {...makeProps()} />);
		await expect(component.getByTestId("codex-creatures")).toBeVisible();
	});

	test("shows ??? for hidden creatures", async ({ mount }) => {
		const component = await mount(<BokCodex {...makeProps()} />);
		const morker = component.getByTestId(`creature-${Species.Morker}`);
		await expect(morker).toBeVisible();
		await expect(morker.getByText("???")).toBeVisible();
	});

	test("shows name at silhouette stage (25% progress)", async ({ mount }) => {
		const props = makeProps({
			creatureProgress: { [Species.Morker]: 0.3 },
		});
		const component = await mount(<BokCodex {...props} />);
		const morker = component.getByTestId(`creature-${Species.Morker}`);
		await expect(morker.getByText("Mörker")).toBeVisible();
	});

	test("shows description at basic stage (60% progress)", async ({ mount }) => {
		const props = makeProps({
			creatureProgress: { [Species.Morker]: 0.7 },
		});
		const component = await mount(<BokCodex {...props} />);
		const morker = component.getByTestId(`creature-${Species.Morker}`);
		await expect(morker.getByText(/Shadow creatures/)).toBeVisible();
	});

	test("shows weaknesses and drops at full stage (100%)", async ({ mount }) => {
		const props = makeProps({
			creatureProgress: { [Species.Morker]: 1.0 },
		});
		const component = await mount(<BokCodex {...props} />);
		const morker = component.getByTestId(`creature-${Species.Morker}`);
		await expect(morker.getByText(/Torchlight burns/)).toBeVisible();
		await expect(morker.getByText(/Shadow Essence/)).toBeVisible();
	});

	test("does not show description at silhouette stage", async ({ mount }) => {
		const props = makeProps({
			creatureProgress: { [Species.Morker]: 0.3 },
		});
		const component = await mount(<BokCodex {...props} />);
		const morker = component.getByTestId(`creature-${Species.Morker}`);
		await expect(morker.getByText(/Shadow creatures/)).not.toBeVisible();
	});

	test("renders lore entries when collected", async ({ mount }) => {
		const props = makeProps({
			loreEntryIds: ["lore_rune_origin"],
		});
		const component = await mount(<BokCodex {...props} />);
		await expect(component.getByTestId("codex-lore")).toBeVisible();
		await expect(component.getByText("Origin of the Runes")).toBeVisible();
	});

	test("does not render lore section when empty", async ({ mount }) => {
		const component = await mount(<BokCodex {...makeProps()} />);
		await expect(component.getByTestId("codex-lore")).not.toBeVisible();
	});

	test("renders recipe discovery count", async ({ mount }) => {
		const props = makeProps({
			discoveredRecipeCount: 3,
		});
		const component = await mount(<BokCodex {...props} />);
		await expect(component.getByTestId("codex-recipes")).toBeVisible();
		await expect(component.getByText("3 recipes discovered")).toBeVisible();
	});

	test("has progress bar for each creature", async ({ mount }) => {
		const props = makeProps({
			creatureProgress: { [Species.Morker]: 0.5 },
		});
		const component = await mount(<BokCodex {...props} />);
		await expect(component.getByTestId(`progress-${Species.Morker}`)).toBeVisible();
	});
});
