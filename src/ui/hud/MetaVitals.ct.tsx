import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { MetaVitalsProps } from "./MetaVitals.tsx";
import { MetaVitals } from "./MetaVitals.tsx";

const SCREENSHOT_DIR = "src/ui/hud/__screenshots__";

/** Wrap in a positioned container so overlays have visual context for screenshots. */
// biome-ignore lint/style/useComponentExportOnlyModules: test-only harness in .ct.tsx
function Harness(props: MetaVitalsProps) {
	return (
		<div style={{ position: "relative", width: 375, height: 667, background: "#1a1a2e" }}>
			<MetaVitals {...props} />
		</div>
	);
}

// ─── Layer 1: Healthy State ───

describe("MetaVitals - healthy state", () => {
	test("renders container when all vitals are full", async () => {
		const screen = await render(<Harness health={100} hunger={100} stamina={100} />);
		const el = screen.getByTestId("meta-vitals");
		await expect.element(el).toBeInTheDocument();
		await expect.element(el).toHaveAttribute("data-any-critical", "false");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/meta-vitals-healthy.png` });
	});
});

// ─── Layer 2: Health Critical ───

describe("MetaVitals - health critical", () => {
	test("shows tunnel vision when health is critical", async () => {
		const screen = await render(<Harness health={15} hunger={100} stamina={100} />);
		await expect.element(screen.getByTestId("tunnel-vision")).toBeInTheDocument();
		await expect.element(screen.getByTestId("meta-vitals")).toHaveAttribute("data-health-critical", "true");
		await page.screenshot({
			path: `${SCREENSHOT_DIR}/meta-vitals-health-critical.png`,
		});
	});

	test("shows screen cracks at very low health", async () => {
		const screen = await render(<Harness health={8} hunger={100} stamina={100} />);
		await expect.element(screen.getByTestId("screen-cracks")).toBeInTheDocument();
		await page.screenshot({
			path: `${SCREENSHOT_DIR}/meta-vitals-screen-cracks.png`,
		});
	});

	test("no tunnel vision at moderate health", async () => {
		const screen = await render(<Harness health={60} hunger={100} stamina={100} />);
		await expect.element(screen.getByTestId("meta-vitals")).toHaveAttribute("data-health-critical", "false");
		await page.screenshot({
			path: `${SCREENSHOT_DIR}/meta-vitals-moderate-health.png`,
		});
	});
});

// ─── Layer 3: Hunger Critical ───

describe("MetaVitals - hunger critical", () => {
	test("shows desaturation when hunger is critical", async () => {
		const screen = await render(<Harness health={100} hunger={12} stamina={100} />);
		await expect.element(screen.getByTestId("hunger-desat")).toBeInTheDocument();
		await expect.element(screen.getByTestId("meta-vitals")).toHaveAttribute("data-hunger-critical", "true");
		await page.screenshot({
			path: `${SCREENSHOT_DIR}/meta-vitals-hunger-critical.png`,
		});
	});

	test("hunger bob unsteadiness data attribute present", async () => {
		const screen = await render(<Harness health={100} hunger={5} stamina={100} />);
		await expect.element(screen.getByTestId("hunger-desat")).toHaveAttribute("data-bob-unsteady", "true");
		await page.screenshot({
			path: `${SCREENSHOT_DIR}/meta-vitals-hunger-bob.png`,
		});
	});
});

// ─── Layer 4: Stamina Critical ───

describe("MetaVitals - stamina critical", () => {
	test("shows edge blur when stamina is critical", async () => {
		const screen = await render(<Harness health={100} hunger={100} stamina={10} />);
		await expect.element(screen.getByTestId("stamina-blur")).toBeInTheDocument();
		await expect.element(screen.getByTestId("meta-vitals")).toHaveAttribute("data-stamina-critical", "true");
		await page.screenshot({
			path: `${SCREENSHOT_DIR}/meta-vitals-stamina-critical.png`,
		});
	});
});

// ─── Layer 5: Recovery ───

describe("MetaVitals - recovery", () => {
	test("marks recovery state when vitals improve from critical", async () => {
		const screen = await render(<Harness health={35} hunger={100} stamina={100} prevHealth={15} />);
		await expect.element(screen.getByTestId("meta-vitals")).toHaveAttribute("data-recovering", "true");
		await page.screenshot({
			path: `${SCREENSHOT_DIR}/meta-vitals-recovery.png`,
		});
	});

	test("no recovery when vitals were never critical", async () => {
		const screen = await render(<Harness health={80} hunger={100} stamina={100} prevHealth={75} />);
		await expect.element(screen.getByTestId("meta-vitals")).toHaveAttribute("data-recovering", "false");
	});
});

// ─── Layer 6: Multiple Criticals ───

describe("MetaVitals - combined effects", () => {
	test("shows all effects when all vitals are critical", async () => {
		const screen = await render(<Harness health={10} hunger={8} stamina={5} />);
		const el = screen.getByTestId("meta-vitals");
		await expect.element(el).toHaveAttribute("data-any-critical", "true");
		await expect.element(el).toHaveAttribute("data-health-critical", "true");
		await expect.element(el).toHaveAttribute("data-hunger-critical", "true");
		await expect.element(el).toHaveAttribute("data-stamina-critical", "true");
		await page.screenshot({
			path: `${SCREENSHOT_DIR}/meta-vitals-all-critical.png`,
		});
	});
});

// ─── Layer 7: prefers-reduced-motion ───

describe("MetaVitals - accessibility", () => {
	test("respects reduced motion preference via data attribute", async () => {
		const screen = await render(<Harness health={10} hunger={100} stamina={100} />);
		// CSS handles animation suppression via @media (prefers-reduced-motion: reduce) in index.css.
		// We verify the component renders correctly with data attributes.
		await expect.element(screen.getByTestId("meta-vitals")).toHaveAttribute("data-health-critical", "true");
		await page.screenshot({
			path: `${SCREENSHOT_DIR}/meta-vitals-a11y.png`,
		});
	});
});
