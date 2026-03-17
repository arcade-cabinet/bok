import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { RuneIdValue } from "../../ecs/systems/rune-data.ts";
import { RuneId } from "../../ecs/systems/rune-data.ts";
import { EtchingSurface } from "./EtchingSurface.tsx";

const SCREENSHOT_DIR = "src/ui/hud/__screenshots__";

const PREDS: RuneIdValue[] = [RuneId.Kenaz, RuneId.Fehu, RuneId.Isa];
const DISCOVERED: RuneIdValue[] = [RuneId.Kenaz, RuneId.Fehu, RuneId.Isa];

// ─── Layer 1: Idle State with Prediction ───

describe("EtchingSurface — idle with prediction", () => {
	test("renders in idle phase with first prediction active", async () => {
		const screen = await render(
			<EtchingSurface predictions={PREDS} discoveredRunes={DISCOVERED} onInscribe={() => {}} onCancel={() => {}} />,
		);
		const root = screen.getByTestId("etching-surface");
		await expect.element(root).toBeVisible();
		await expect.element(root).toHaveAttribute("data-phase", "idle");
		await expect.element(root).toHaveAttribute("data-prediction", "kenaz");
		await expect.element(root).toHaveAttribute("data-prediction-count", "3");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/idle-kenaz-prediction.png` });
	});

	test("shows prediction header with glyph and name", async () => {
		const screen = await render(
			<EtchingSurface predictions={PREDS} discoveredRunes={DISCOVERED} onInscribe={() => {}} onCancel={() => {}} />,
		);
		await expect.element(screen.getByTestId("prediction-header")).toBeVisible();
		await expect.element(screen.getByTestId("prediction-name")).toHaveTextContent("Kenaz");
		await expect.element(screen.getByTestId("prediction-index")).toHaveTextContent("1/3");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/idle-prediction-header.png` });
	});

	test("shows hint text for prediction mode", async () => {
		const screen = await render(
			<EtchingSurface predictions={PREDS} discoveredRunes={DISCOVERED} onInscribe={() => {}} onCancel={() => {}} />,
		);
		await expect.element(screen.getByTestId("etching-hint")).toBeVisible();
		await expect.element(screen.getByTestId("etching-hint")).toHaveTextContent("double-tap to inscribe");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/idle-hint-text.png` });
	});

	test("canvas has touch-action none and correct size", async () => {
		const screen = await render(
			<EtchingSurface predictions={PREDS} discoveredRunes={DISCOVERED} onInscribe={() => {}} onCancel={() => {}} />,
		);
		const canvas = screen.getByTestId("etching-canvas");
		await expect.element(canvas).toBeVisible();
		await expect.element(canvas).toHaveAttribute("style", expect.stringContaining("touch-action: none"));
		await expect.element(canvas).toHaveAttribute("style", expect.stringContaining("width: 280px"));
	});
});

// ─── Layer 2: No Predictions (Freeform Mode) ───

describe("EtchingSurface — freeform mode (no predictions)", () => {
	test("renders in idle with no prediction when empty predictions", async () => {
		const screen = await render(
			<EtchingSurface predictions={[]} discoveredRunes={DISCOVERED} onInscribe={() => {}} onCancel={() => {}} />,
		);
		const root = screen.getByTestId("etching-surface");
		await expect.element(root).toHaveAttribute("data-phase", "idle");
		await expect.element(root).toHaveAttribute("data-prediction", "none");
		await expect.element(root).toHaveAttribute("data-prediction-count", "0");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/freeform-no-predictions.png` });
	});

	test("shows freeform hint instead of prediction hint", async () => {
		const screen = await render(
			<EtchingSurface predictions={[]} discoveredRunes={DISCOVERED} onInscribe={() => {}} onCancel={() => {}} />,
		);
		await expect.element(screen.getByTestId("etching-hint")).toHaveTextContent("draw a rune to inscribe");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/freeform-hint.png` });
	});
});

// ─── Layer 3: Keyboard Interaction ───

describe("EtchingSurface — keyboard interaction", () => {
	test("Escape fires onCancel", async () => {
		const onCancel = vi.fn();
		await render(
			<EtchingSurface predictions={PREDS} discoveredRunes={DISCOVERED} onInscribe={() => {}} onCancel={onCancel} />,
		);
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		expect(onCancel).toHaveBeenCalledOnce();
	});

	test("ArrowRight cycles prediction forward", async () => {
		const screen = await render(
			<EtchingSurface predictions={PREDS} discoveredRunes={DISCOVERED} onInscribe={() => {}} onCancel={() => {}} />,
		);
		await expect.element(screen.getByTestId("etching-surface")).toHaveAttribute("data-prediction", "kenaz");
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
		// Re-render picks up the state change
		await expect.element(screen.getByTestId("etching-surface")).toHaveAttribute("data-prediction", "fehu");
		await expect.element(screen.getByTestId("prediction-index")).toHaveTextContent("2/3");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/prediction-cycled-fehu.png` });
	});

	test("ArrowLeft at start pulses boundary", async () => {
		const screen = await render(
			<EtchingSurface predictions={PREDS} discoveredRunes={DISCOVERED} onInscribe={() => {}} onCancel={() => {}} />,
		);
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
		// Should still be on kenaz (can't go before index 0)
		await expect.element(screen.getByTestId("etching-surface")).toHaveAttribute("data-prediction", "kenaz");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/prediction-boundary-pulse.png` });
	});
});

// ─── Layer 4: Single Prediction (Edge Case) ───

describe("EtchingSurface — single prediction", () => {
	test("shows 1/1 with single prediction", async () => {
		const screen = await render(
			<EtchingSurface
				predictions={[RuneId.Isa]}
				discoveredRunes={DISCOVERED}
				onInscribe={() => {}}
				onCancel={() => {}}
			/>,
		);
		await expect.element(screen.getByTestId("etching-surface")).toHaveAttribute("data-prediction", "isa");
		await expect.element(screen.getByTestId("etching-surface")).toHaveAttribute("data-prediction-count", "1");
		await expect.element(screen.getByTestId("prediction-name")).toHaveTextContent("Isa");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/single-prediction-isa.png` });
	});
});
