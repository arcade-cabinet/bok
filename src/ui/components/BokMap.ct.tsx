import { expect, test } from "@playwright/experimental-ct-react";
import { packChunk } from "../../ecs/systems/map-data.ts";
import { Biome } from "../../world/biomes.ts";
import { BokMap } from "./BokMap.tsx";

const mockBiomeAt = () => Biome.Angen;
const emptyLandmarks: never[] = [];

test.describe("BokMap", () => {
	test("renders map container", async ({ mount }) => {
		const visited = new Set([packChunk(0, 0)]);
		const component = await mount(
			<BokMap visited={visited} playerCx={0} playerCz={0} biomeAt={mockBiomeAt} landmarks={emptyLandmarks} />,
		);
		await expect(component.getByTestId("bok-map")).toBeVisible();
	});

	test("renders canvas element", async ({ mount }) => {
		const visited = new Set([packChunk(0, 0)]);
		const component = await mount(
			<BokMap visited={visited} playerCx={0} playerCz={0} biomeAt={mockBiomeAt} landmarks={emptyLandmarks} />,
		);
		await expect(component.getByTestId("bok-map-canvas")).toBeVisible();
	});

	test("canvas has aria-label", async ({ mount }) => {
		const visited = new Set([packChunk(0, 0)]);
		const component = await mount(
			<BokMap visited={visited} playerCx={0} playerCz={0} biomeAt={mockBiomeAt} landmarks={emptyLandmarks} />,
		);
		await expect(component.getByTestId("bok-map-canvas")).toHaveAttribute("aria-label", "World map");
	});

	test("shows zoom hint text", async ({ mount }) => {
		const visited = new Set<number>();
		const component = await mount(
			<BokMap visited={visited} playerCx={0} playerCz={0} biomeAt={mockBiomeAt} landmarks={emptyLandmarks} />,
		);
		await expect(component.getByText("Pinch to zoom")).toBeVisible();
	});

	test("renders with explored chunks", async ({ mount }) => {
		const visited = new Set([packChunk(0, 0), packChunk(1, 0), packChunk(0, 1)]);
		const component = await mount(
			<BokMap visited={visited} playerCx={0} playerCz={0} biomeAt={mockBiomeAt} landmarks={emptyLandmarks} />,
		);
		// Canvas should be present and visible (rendering verified by unit tests)
		await expect(component.getByTestId("bok-map-canvas")).toBeVisible();
	});

	test("renders with landmark markers", async ({ mount }) => {
		const visited = new Set([packChunk(1, 1)]);
		const landmarks = [{ cx: 1, cz: 1, type: "runsten" as const }];
		const component = await mount(
			<BokMap visited={visited} playerCx={0} playerCz={0} biomeAt={mockBiomeAt} landmarks={landmarks} />,
		);
		await expect(component.getByTestId("bok-map")).toBeVisible();
	});
});
