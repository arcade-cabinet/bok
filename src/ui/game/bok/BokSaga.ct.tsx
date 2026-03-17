import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { MilestoneId } from "../../../ecs/systems/saga-data.ts";
import type { BokSagaProps } from "./BokSaga.tsx";
import { BokSaga } from "./BokSaga.tsx";

const SCREENSHOT_DIR = "src/ui/game/bok/__screenshots__";

function makeProps(overrides: Partial<BokSagaProps> = {}): BokSagaProps {
	return {
		entries: [],
		activeObjective: null,
		stats: { daysSurvived: 1, blocksPlaced: 0, blocksMined: 0, creaturesObserved: 0 },
		...overrides,
	};
}

describe("BokSaga", () => {
	test("renders saga section", async () => {
		const screen = await render(<BokSaga {...makeProps()} />);
		await expect.element(screen.getByTestId("bok-saga")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-saga-base.png` });
	});

	test("shows empty state when no entries", async () => {
		const screen = await render(<BokSaga {...makeProps()} />);
		await expect.element(screen.getByText("The saga has yet to begin...")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-saga-empty.png` });
	});

	test("renders saga entries chronologically", async () => {
		const props = makeProps({
			entries: [
				{ milestoneId: MilestoneId.FirstShelter, day: 2, text: "The first shelter stood." },
				{ milestoneId: MilestoneId.Day3, day: 3, text: "Three suns have risen." },
			],
		});
		const screen = await render(<BokSaga {...props} />);
		await expect.element(screen.getByTestId(`saga-entry-${MilestoneId.FirstShelter}`)).toBeVisible();
		await expect.element(screen.getByTestId(`saga-entry-${MilestoneId.Day3}`)).toBeVisible();
		await expect.element(screen.getByText("Day 2")).toBeVisible();
		await expect.element(screen.getByText("Day 3")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-saga-entries.png` });
	});

	test("renders active objective", async () => {
		const props = makeProps({
			activeObjective: {
				text: "Build your first shelter — raise walls and a roof.",
				progress: 0,
				target: 1,
			},
		});
		const screen = await render(<BokSaga {...props} />);
		await expect.element(screen.getByTestId("saga-objective")).toBeVisible();
		await expect.element(screen.getByTestId("saga-objective-text")).toBeVisible();
		await expect.element(screen.getByText(/first shelter/)).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-saga-objective.png` });
	});

	test("renders progress bar for multi-step objectives", async () => {
		const props = makeProps({
			activeObjective: {
				text: "Survive 7 days.",
				progress: 4,
				target: 7,
			},
		});
		const screen = await render(<BokSaga {...props} />);
		// saga-objective-progress is a 1px-height track div — check it exists in DOM
		expect(screen.container.querySelector("[data-testid='saga-objective-progress']")).not.toBeNull();
		await expect.element(screen.getByText("4/7")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-saga-objective-progress.png` });
	});

	test("does not show objective when null", async () => {
		const screen = await render(<BokSaga {...makeProps()} />);
		// saga-objective is conditionally rendered — should not exist in the DOM
		expect(screen.container.querySelector("[data-testid='saga-objective']")).toBeNull();
	});

	test("renders stats display correctly", async () => {
		const props = makeProps({
			stats: { daysSurvived: 12, blocksPlaced: 300, blocksMined: 150, creaturesObserved: 5 },
		});
		const screen = await render(<BokSaga {...props} />);
		await expect.element(screen.getByTestId("saga-stats")).toBeVisible();
		await expect.element(screen.getByTestId("stat-days")).toBeVisible();
		await expect.element(screen.getByTestId("stat-placed")).toBeVisible();
		await expect.element(screen.getByTestId("stat-mined")).toBeVisible();
		await expect.element(screen.getByTestId("stat-observed")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-saga-stats.png` });
	});

	test("shows day label in entry cards", async () => {
		const props = makeProps({
			entries: [{ milestoneId: MilestoneId.FirstCreatureKill, day: 4, text: "Steel met shadow." }],
		});
		const screen = await render(<BokSaga {...props} />);
		await expect.element(screen.getByText("Day 4")).toBeVisible();
		await expect.element(screen.getByText("Steel met shadow.")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-saga-entry-card.png` });
	});
});
