import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Crosshair } from "./Crosshair.tsx";

const SCREENSHOT_DIR = "src/ui/game/hud/__screenshots__";

describe("Crosshair", () => {
	test("renders minimal dot when not looking at block", async () => {
		const screen = await render(
			<div style={{ position: "relative", width: 64, height: 64, background: "#333" }}>
				<Crosshair isMining={false} miningProgress={0} lookingAtBlock={false} />
			</div>,
		);
		const el = screen.container.querySelector("[data-testid='crosshair']");
		expect(el).not.toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/crosshair-idle.png` });
	});

	test("renders white dot when looking at block", async () => {
		const screen = await render(
			<div style={{ position: "relative", width: 64, height: 64, background: "#333" }}>
				<Crosshair isMining={false} miningProgress={0} lookingAtBlock={true} />
			</div>,
		);
		const el = screen.container.querySelector("[data-testid='crosshair']");
		expect(el).not.toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/crosshair-looking.png` });
	});

	test("renders mining state with progress ring", async () => {
		const screen = await render(
			<div style={{ position: "relative", width: 64, height: 64, background: "#333" }}>
				<Crosshair isMining={true} miningProgress={0.5} lookingAtBlock={true} />
			</div>,
		);
		const ring = screen.container.querySelector("[data-testid='crosshair-ring']");
		expect(ring).not.toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/crosshair-mining-50pct.png` });
	});

	test("renders mining at full progress", async () => {
		const screen = await render(
			<div style={{ position: "relative", width: 64, height: 64, background: "#333" }}>
				<Crosshair isMining={true} miningProgress={1} lookingAtBlock={true} />
			</div>,
		);
		const ring = screen.container.querySelector("[data-testid='crosshair-ring']");
		expect(ring).not.toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/crosshair-mining-full.png` });
	});

	test("no ring when not mining", async () => {
		const screen = await render(
			<div style={{ position: "relative", width: 64, height: 64, background: "#333" }}>
				<Crosshair isMining={false} miningProgress={0.5} lookingAtBlock={true} />
			</div>,
		);
		const ring = screen.container.querySelector("[data-testid='crosshair-ring']");
		expect(ring).toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/crosshair-no-ring.png` });
	});

	test("clamps negative mining progress without error", async () => {
		const screen = await render(
			<div style={{ position: "relative", width: 64, height: 64, background: "#333" }}>
				<Crosshair isMining={true} miningProgress={-0.5} lookingAtBlock={true} />
			</div>,
		);
		const el = screen.container.querySelector("[data-testid='crosshair']");
		expect(el).not.toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/crosshair-clamped-negative.png` });
	});

	test("clamps over-max mining progress without error", async () => {
		const screen = await render(
			<div style={{ position: "relative", width: 64, height: 64, background: "#333" }}>
				<Crosshair isMining={true} miningProgress={1.5} lookingAtBlock={true} />
			</div>,
		);
		const el = screen.container.querySelector("[data-testid='crosshair']");
		expect(el).not.toBeNull();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/crosshair-clamped-over.png` });
	});
});
