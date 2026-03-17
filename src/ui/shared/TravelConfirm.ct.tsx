import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { TravelConfirm } from "./TravelConfirm.tsx";

const SCREENSHOT_DIR = "src/ui/shared/__screenshots__";

const noop = () => {};

describe("TravelConfirm", () => {
	test("renders dialog with destination", async () => {
		const screen = await render(
			<TravelConfirm destX={100} destY={20} destZ={50} cost={2} dustAvailable={5} onConfirm={noop} onCancel={noop} />,
		);
		await expect.element(screen.getByTestId("travel-confirm")).toBeVisible();
		await expect.element(screen.getByText("(100, 20, 50)")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/travel-confirm-base.png` });
	});

	test("shows travel cost and availability", async () => {
		const screen = await render(
			<TravelConfirm destX={0} destY={0} destZ={0} cost={3} dustAvailable={5} onConfirm={noop} onCancel={noop} />,
		);
		const costEl = screen.getByTestId("travel-cost");
		await expect.element(costEl).toHaveTextContent(/3 Crystal Dust/);
		await expect.element(costEl).toHaveTextContent(/5 available/);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/travel-confirm-cost.png` });
	});

	test("travel button is enabled when affordable", async () => {
		const screen = await render(
			<TravelConfirm destX={0} destY={0} destZ={0} cost={2} dustAvailable={5} onConfirm={noop} onCancel={noop} />,
		);
		await expect.element(screen.getByTestId("travel-confirm-btn")).toBeEnabled();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/travel-confirm-affordable.png` });
	});

	test("travel button is disabled when not affordable", async () => {
		const screen = await render(
			<TravelConfirm destX={0} destY={0} destZ={0} cost={5} dustAvailable={2} onConfirm={noop} onCancel={noop} />,
		);
		await expect.element(screen.getByTestId("travel-confirm-btn")).toBeDisabled();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/travel-confirm-unaffordable.png` });
	});

	test("shows Raido header glyph", async () => {
		const screen = await render(
			<TravelConfirm destX={0} destY={0} destZ={0} cost={1} dustAvailable={1} onConfirm={noop} onCancel={noop} />,
		);
		await expect.element(screen.getByText("ᚱ Raido — Journey")).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/travel-confirm-header.png` });
	});

	test("has confirm and cancel buttons", async () => {
		const screen = await render(
			<TravelConfirm destX={0} destY={0} destZ={0} cost={1} dustAvailable={1} onConfirm={noop} onCancel={noop} />,
		);
		await expect.element(screen.getByTestId("travel-confirm-btn")).toBeVisible();
		await expect.element(screen.getByTestId("travel-cancel-btn")).toBeVisible();
	});

	test("has proper dialog role", async () => {
		const screen = await render(
			<TravelConfirm destX={0} destY={0} destZ={0} cost={1} dustAvailable={1} onConfirm={noop} onCancel={noop} />,
		);
		const dialog = screen.container.querySelector("[role='dialog']");
		expect(dialog).not.toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/travel-confirm-dialog.png` });
	});

	test("calls onConfirm when travel is clicked", async () => {
		const onConfirm = vi.fn();
		const screen = await render(
			<TravelConfirm destX={0} destY={0} destZ={0} cost={1} dustAvailable={5} onConfirm={onConfirm} onCancel={noop} />,
		);
		await screen.getByTestId("travel-confirm-btn").click();
		expect(onConfirm).toHaveBeenCalledOnce();
	});

	test("calls onCancel when cancel is clicked", async () => {
		const onCancel = vi.fn();
		const screen = await render(
			<TravelConfirm destX={0} destY={0} destZ={0} cost={1} dustAvailable={5} onConfirm={noop} onCancel={onCancel} />,
		);
		await screen.getByTestId("travel-cancel-btn").click();
		expect(onCancel).toHaveBeenCalledOnce();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/travel-confirm-cancelled.png` });
	});
});
