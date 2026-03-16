import { expect, test } from "@playwright/experimental-ct-react";
import { TravelConfirm } from "./TravelConfirm.tsx";

const noop = () => {};

test.describe("TravelConfirm", () => {
	test("renders dialog with destination", async ({ mount }) => {
		const component = await mount(
			<TravelConfirm destX={100} destY={20} destZ={50} cost={2} dustAvailable={5} onConfirm={noop} onCancel={noop} />,
		);
		await expect(component.getByTestId("travel-confirm")).toBeVisible();
		await expect(component.getByText("(100, 20, 50)")).toBeVisible();
	});

	test("shows travel cost and availability", async ({ mount }) => {
		const component = await mount(
			<TravelConfirm destX={0} destY={0} destZ={0} cost={3} dustAvailable={5} onConfirm={noop} onCancel={noop} />,
		);
		const costEl = component.getByTestId("travel-cost");
		await expect(costEl).toContainText("3 Crystal Dust");
		await expect(costEl).toContainText("5 available");
	});

	test("travel button is enabled when affordable", async ({ mount }) => {
		const component = await mount(
			<TravelConfirm destX={0} destY={0} destZ={0} cost={2} dustAvailable={5} onConfirm={noop} onCancel={noop} />,
		);
		await expect(component.getByTestId("travel-confirm-btn")).toBeEnabled();
	});

	test("travel button is disabled when not affordable", async ({ mount }) => {
		const component = await mount(
			<TravelConfirm destX={0} destY={0} destZ={0} cost={5} dustAvailable={2} onConfirm={noop} onCancel={noop} />,
		);
		await expect(component.getByTestId("travel-confirm-btn")).toBeDisabled();
	});

	test("shows Raido header glyph", async ({ mount }) => {
		const component = await mount(
			<TravelConfirm destX={0} destY={0} destZ={0} cost={1} dustAvailable={1} onConfirm={noop} onCancel={noop} />,
		);
		await expect(component.getByText("ᚱ Raido — Journey")).toBeVisible();
	});

	test("has confirm and cancel buttons", async ({ mount }) => {
		const component = await mount(
			<TravelConfirm destX={0} destY={0} destZ={0} cost={1} dustAvailable={1} onConfirm={noop} onCancel={noop} />,
		);
		await expect(component.getByTestId("travel-confirm-btn")).toBeVisible();
		await expect(component.getByTestId("travel-cancel-btn")).toBeVisible();
	});

	test("has proper dialog role", async ({ mount }) => {
		const component = await mount(
			<TravelConfirm destX={0} destY={0} destZ={0} cost={1} dustAvailable={1} onConfirm={noop} onCancel={noop} />,
		);
		await expect(component.getByRole("dialog")).toBeVisible();
	});
});
