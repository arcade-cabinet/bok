import { expect, test } from "@playwright/experimental-ct-react";
import { MilestoneId } from "../../ecs/systems/saga-data.ts";
import type { BokSagaProps } from "./BokSaga.tsx";
import { BokSaga } from "./BokSaga.tsx";

function makeProps(overrides: Partial<BokSagaProps> = {}): BokSagaProps {
	return {
		entries: [],
		activeObjective: null,
		stats: { daysSurvived: 1, blocksPlaced: 0, blocksMined: 0, creaturesObserved: 0 },
		...overrides,
	};
}

test.describe("BokSaga", () => {
	test("renders saga section", async ({ mount }) => {
		const component = await mount(<BokSaga {...makeProps()} />);
		await expect(component.getByTestId("bok-saga")).toBeVisible();
	});

	test("shows empty state when no entries", async ({ mount }) => {
		const component = await mount(<BokSaga {...makeProps()} />);
		await expect(component.getByText("The saga has yet to begin...")).toBeVisible();
	});

	test("renders saga entries chronologically", async ({ mount }) => {
		const props = makeProps({
			entries: [
				{ milestoneId: MilestoneId.FirstShelter, day: 2, text: "The first shelter stood." },
				{ milestoneId: MilestoneId.Day3, day: 3, text: "Three suns have risen." },
			],
		});
		const component = await mount(<BokSaga {...props} />);
		await expect(component.getByTestId(`saga-entry-${MilestoneId.FirstShelter}`)).toBeVisible();
		await expect(component.getByTestId(`saga-entry-${MilestoneId.Day3}`)).toBeVisible();
		await expect(component.getByText("Day 2")).toBeVisible();
		await expect(component.getByText("Day 3")).toBeVisible();
	});

	test("renders active objective", async ({ mount }) => {
		const props = makeProps({
			activeObjective: {
				text: "Build your first shelter — raise walls and a roof.",
				progress: 0,
				target: 1,
			},
		});
		const component = await mount(<BokSaga {...props} />);
		await expect(component.getByTestId("saga-objective")).toBeVisible();
		await expect(component.getByTestId("saga-objective-text")).toContainText("first shelter");
	});

	test("renders progress bar for multi-step objectives", async ({ mount }) => {
		const props = makeProps({
			activeObjective: {
				text: "Survive 7 days.",
				progress: 4,
				target: 7,
			},
		});
		const component = await mount(<BokSaga {...props} />);
		await expect(component.getByTestId("saga-objective-progress")).toBeVisible();
		await expect(component.getByText("4/7")).toBeVisible();
	});

	test("does not show objective when null", async ({ mount }) => {
		const component = await mount(<BokSaga {...makeProps()} />);
		await expect(component.getByTestId("saga-objective")).not.toBeVisible();
	});

	test("renders stats display correctly", async ({ mount }) => {
		const props = makeProps({
			stats: { daysSurvived: 12, blocksPlaced: 300, blocksMined: 150, creaturesObserved: 5 },
		});
		const component = await mount(<BokSaga {...props} />);
		await expect(component.getByTestId("saga-stats")).toBeVisible();
		await expect(component.getByTestId("stat-days")).toContainText("12");
		await expect(component.getByTestId("stat-placed")).toContainText("300");
		await expect(component.getByTestId("stat-mined")).toContainText("150");
		await expect(component.getByTestId("stat-observed")).toContainText("5");
	});

	test("shows day label in entry cards", async ({ mount }) => {
		const props = makeProps({
			entries: [{ milestoneId: MilestoneId.FirstCreatureKill, day: 4, text: "Steel met shadow." }],
		});
		const component = await mount(<BokSaga {...props} />);
		await expect(component.getByText("Day 4")).toBeVisible();
		await expect(component.getByText("Steel met shadow.")).toBeVisible();
	});
});
