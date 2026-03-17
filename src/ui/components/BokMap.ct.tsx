import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { packChunk } from "../../ecs/systems/map-data.ts";
import type { TravelAnchor } from "../../ecs/systems/raido-travel.ts";
import { Biome } from "../../world/biomes.ts";
import { BokMap } from "./BokMap.tsx";

const SCREENSHOT_DIR = "src/ui/components/__screenshots__";

const mockBiomeAt = () => Biome.Angen;
const emptyLandmarks: never[] = [];

describe("BokMap", () => {
	test("renders map container", async () => {
		const visited = new Set([packChunk(0, 0)]);
		const screen = await render(
			<BokMap visited={visited} playerCx={0} playerCz={0} biomeAt={mockBiomeAt} landmarks={emptyLandmarks} />,
		);
		await expect.element(screen.getByTestId("bok-map")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-map-base.png` });
	});

	test("renders canvas element", async () => {
		const visited = new Set([packChunk(0, 0)]);
		const screen = await render(
			<BokMap visited={visited} playerCx={0} playerCz={0} biomeAt={mockBiomeAt} landmarks={emptyLandmarks} />,
		);
		await expect.element(screen.getByTestId("bok-map-canvas")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-map-canvas.png` });
	});

	test("canvas has aria-label", async () => {
		const visited = new Set([packChunk(0, 0)]);
		const screen = await render(
			<BokMap visited={visited} playerCx={0} playerCz={0} biomeAt={mockBiomeAt} landmarks={emptyLandmarks} />,
		);
		await expect.element(screen.getByTestId("bok-map-canvas")).toHaveAttribute("aria-label", "World map");
	});

	test("shows zoom hint text", async () => {
		const visited = new Set<number>();
		const screen = await render(
			<BokMap visited={visited} playerCx={0} playerCz={0} biomeAt={mockBiomeAt} landmarks={emptyLandmarks} />,
		);
		await expect.element(screen.getByText("Pinch to zoom")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-map-empty.png` });
	});

	test("renders with explored chunks", async () => {
		const visited = new Set([packChunk(0, 0), packChunk(1, 0), packChunk(0, 1)]);
		const screen = await render(
			<BokMap visited={visited} playerCx={0} playerCz={0} biomeAt={mockBiomeAt} landmarks={emptyLandmarks} />,
		);
		// Canvas should be present and visible (rendering verified by unit tests)
		await expect.element(screen.getByTestId("bok-map-canvas")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-map-explored.png` });
	});

	test("renders with landmark markers", async () => {
		const visited = new Set([packChunk(1, 1)]);
		const landmarks = [{ cx: 1, cz: 1, type: "runsten" as const }];
		const screen = await render(
			<BokMap visited={visited} playerCx={0} playerCz={0} biomeAt={mockBiomeAt} landmarks={landmarks} />,
		);
		await expect.element(screen.getByTestId("bok-map")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-map-landmarks.png` });
	});

	test("shows travel hint when anchors present", async () => {
		const visited = new Set([packChunk(0, 0)]);
		const anchors: TravelAnchor[] = [{ x: 10, y: 5, z: 10, cx: 0, cz: 0 }];
		const screen = await render(
			<BokMap
				visited={visited}
				playerCx={0}
				playerCz={0}
				biomeAt={mockBiomeAt}
				landmarks={emptyLandmarks}
				travelAnchors={anchors}
			/>,
		);
		await expect.element(screen.getByText("Tap ᚱ to travel")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-map-travel-hint.png` });
	});

	test("renders with travel anchors", async () => {
		const visited = new Set([packChunk(0, 0)]);
		const anchors: TravelAnchor[] = [{ x: 10, y: 5, z: 10, cx: 0, cz: 0 }];
		const screen = await render(
			<BokMap
				visited={visited}
				playerCx={0}
				playerCz={0}
				biomeAt={mockBiomeAt}
				landmarks={emptyLandmarks}
				travelAnchors={anchors}
				onTravelRequest={() => {}}
			/>,
		);
		await expect.element(screen.getByTestId("bok-map-canvas")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/bok-map-travel-anchors.png` });
	});
});
