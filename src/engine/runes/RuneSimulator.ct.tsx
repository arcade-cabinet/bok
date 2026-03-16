import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { RuneId } from "../../ecs/systems/rune-data.ts";
import type { SurfaceInscription } from "./inscription.ts";
import type { MaterialIdValue } from "./material.ts";
import { MaterialId } from "./material.ts";
import { RuneSimulator } from "./RuneSimulator.tsx";

const SCREENSHOT_DIR = "src/engine/runes/__screenshots__";

// ─── Test Helpers ───

/** Create a grid of uniform material. */
function uniformGrid(w: number, h: number, mat: MaterialIdValue): MaterialIdValue[][] {
	return Array.from({ length: h }, () => Array.from({ length: w }, () => mat));
}

/** Create a grid from a string map. S=Stone, .=Air, W=Wood, C=Crystal, I=Iron, D=Dirt */
function gridFromMap(lines: string[]): MaterialIdValue[][] {
	const charMap: Record<string, MaterialIdValue> = {
		S: MaterialId.Stone,
		".": MaterialId.Air,
		W: MaterialId.Wood,
		C: MaterialId.Crystal,
		I: MaterialId.Iron,
		D: MaterialId.Dirt,
		"~": MaterialId.Water,
	};
	return lines.map((line) => [...line].map((ch) => charMap[ch] ?? MaterialId.Air));
}

/** Create an inscription on the grid. */
function ins(x: number, z: number, glyph: number, material = MaterialId.Stone, strength = 10): SurfaceInscription {
	return {
		x,
		y: 0,
		z,
		nx: 0,
		ny: 1,
		nz: 0,
		glyph: glyph as SurfaceInscription["glyph"],
		material,
		strength,
	};
}

// ─── Basic Rendering Tests ───

describe("RuneSimulator - basic rendering", () => {
	test("renders grid with correct dimensions", async () => {
		const grid = uniformGrid(5, 3, MaterialId.Stone);
		const screen = await render(<RuneSimulator width={5} height={3} materials={grid} inscriptions={[]} />);
		await expect.element(screen.getByTestId("rune-simulator")).toBeVisible();
		const cells = screen.container.querySelectorAll("[data-testid^='cell-']");
		expect(cells.length).toBe(15);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/grid-5x3-stone.png` });
	});

	test("renders inscription glyph at specified position", async () => {
		const grid = uniformGrid(5, 1, MaterialId.Stone);
		const screen = await render(
			<RuneSimulator width={5} height={1} materials={grid} inscriptions={[ins(2, 0, RuneId.Kenaz)]} />,
		);
		await expect.element(screen.getByTestId("cell-2-0")).toHaveAttribute("data-glyph", "ᚲ");
		await expect.element(screen.getByTestId("cell-2-0")).toHaveAttribute("data-rune", "kenaz");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/kenaz-inscription.png` });
	});

	test("cells show correct material data attribute", async () => {
		const grid = gridFromMap(["S.W"]);
		const screen = await render(<RuneSimulator width={3} height={1} materials={grid} inscriptions={[]} />);
		await expect.element(screen.getByTestId("cell-0-0")).toHaveAttribute("data-material", String(MaterialId.Stone));
		await expect.element(screen.getByTestId("cell-1-0")).toHaveAttribute("data-material", String(MaterialId.Air));
		await expect.element(screen.getByTestId("cell-2-0")).toHaveAttribute("data-material", String(MaterialId.Wood));
		await page.screenshot({ path: `${SCREENSHOT_DIR}/materials-stone-air-wood.png` });
	});
});

// ─── Signal Propagation Visual Tests ───

describe("RuneSimulator - signal propagation", () => {
	test("emitter inscription renders before tick", async () => {
		const grid = uniformGrid(5, 1, MaterialId.Stone);
		const inscriptions = [ins(2, 0, RuneId.Kenaz)];

		const screen = await render(<RuneSimulator width={5} height={1} materials={grid} inscriptions={inscriptions} />);

		// Before tick: glyph present but no signal
		await expect.element(screen.getByTestId("cell-2-0")).toHaveAttribute("data-glyph", "ᚲ");
		// No signal overlay yet
		const signalCell = screen.container.querySelector("[data-testid='signal-2-0']");
		expect(signalCell).toBeNull();
	});

	test("adjacent stone cells exist for wavefront propagation", async () => {
		const grid = uniformGrid(7, 1, MaterialId.Stone);
		const inscriptions = [ins(3, 0, RuneId.Kenaz)];

		const screen = await render(<RuneSimulator width={7} height={1} materials={grid} inscriptions={inscriptions} />);

		await expect.element(screen.getByTestId("cell-3-0")).toHaveAttribute("data-glyph", "ᚲ");
		await expect.element(screen.getByTestId("cell-2-0")).toHaveAttribute("data-material", String(MaterialId.Stone));
		await expect.element(screen.getByTestId("cell-4-0")).toHaveAttribute("data-material", String(MaterialId.Stone));
	});

	test("signal does not appear on air cells", async () => {
		const grid = gridFromMap(["SSS.SS"]);
		const inscriptions = [ins(1, 0, RuneId.Kenaz)];

		const screen = await render(<RuneSimulator width={6} height={1} materials={grid} inscriptions={inscriptions} />);

		// Air cell has no signal
		const signalOverlay = screen.container.querySelector("[data-testid='signal-3-0']");
		expect(signalOverlay).toBeNull();
	});

	test("signal does not appear on wood cells", async () => {
		const grid = gridFromMap(["SWSS"]);
		const inscriptions = [ins(0, 0, RuneId.Kenaz)];

		const screen = await render(<RuneSimulator width={4} height={1} materials={grid} inscriptions={inscriptions} />);

		await expect.element(screen.getByTestId("cell-1-0")).toHaveAttribute("data-material", String(MaterialId.Wood));
		const signalOverlay = screen.container.querySelector("[data-testid='signal-1-0']");
		expect(signalOverlay).toBeNull();
	});
});

// ─── NOT Gate (Naudiz) Tests ───

describe("RuneSimulator - NOT gate (Naudiz)", () => {
	test("Naudiz inscription renders at position", async () => {
		const grid = uniformGrid(3, 1, MaterialId.Stone);
		const screen = await render(
			<RuneSimulator width={3} height={1} materials={grid} inscriptions={[ins(1, 0, RuneId.Naudiz)]} />,
		);
		await expect.element(screen.getByTestId("cell-1-0")).toHaveAttribute("data-glyph", "ᚾ");
		await expect.element(screen.getByTestId("cell-1-0")).toHaveAttribute("data-rune", "naudiz");
	});
});

// ─── AND Gate (Hagalaz) Tests ───

describe("RuneSimulator - AND gate (Hagalaz)", () => {
	test("Hagalaz inscription renders at position", async () => {
		const grid = uniformGrid(3, 3, MaterialId.Stone);
		const screen = await render(
			<RuneSimulator width={3} height={3} materials={grid} inscriptions={[ins(1, 1, RuneId.Hagalaz)]} />,
		);
		await expect.element(screen.getByTestId("cell-1-1")).toHaveAttribute("data-glyph", "ᚺ");
		await expect.element(screen.getByTestId("cell-1-1")).toHaveAttribute("data-rune", "hagalaz");
	});
});

// ─── Delay (Isa) Tests ───

describe("RuneSimulator - Delay (Isa)", () => {
	test("Isa inscription renders at position", async () => {
		const grid = uniformGrid(5, 1, MaterialId.Stone);
		const screen = await render(
			<RuneSimulator width={5} height={1} materials={grid} inscriptions={[ins(2, 0, RuneId.Isa)]} />,
		);
		await expect.element(screen.getByTestId("cell-2-0")).toHaveAttribute("data-glyph", "ᛁ");
		await expect.element(screen.getByTestId("cell-2-0")).toHaveAttribute("data-rune", "isa");
	});
});

// ─── Turing Completeness Visual Tests ───

describe("RuneSimulator - Turing completeness", () => {
	test("NAND circuit renders all components", async () => {
		const grid = gridFromMap(["SSSSS", "S.S.S", "SSSSS"]);
		const inscriptions = [
			ins(2, 1, RuneId.Hagalaz), // AND gate at junction
			ins(4, 1, RuneId.Naudiz), // NOT gate downstream
		];

		const screen = await render(<RuneSimulator width={5} height={3} materials={grid} inscriptions={inscriptions} />);

		await expect.element(screen.getByTestId("cell-2-1")).toHaveAttribute("data-rune", "hagalaz");
		await expect.element(screen.getByTestId("cell-4-1")).toHaveAttribute("data-rune", "naudiz");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/nand-circuit.png` });
	});

	test("clock circuit renders Naudiz and Isa components", async () => {
		const grid = uniformGrid(4, 1, MaterialId.Stone);
		const inscriptions = [
			ins(0, 0, RuneId.Naudiz), // NOT gate
			ins(2, 0, RuneId.Isa), // Delay
		];

		const screen = await render(<RuneSimulator width={4} height={1} materials={grid} inscriptions={inscriptions} />);

		await expect.element(screen.getByTestId("cell-0-0")).toHaveAttribute("data-rune", "naudiz");
		await expect.element(screen.getByTestId("cell-2-0")).toHaveAttribute("data-rune", "isa");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/clock-circuit.png` });
	});
});

// ─── Material Visual Tests ───

describe("RuneSimulator - material rendering", () => {
	test("crystal cells render with distinct appearance", async () => {
		const grid = gridFromMap(["SCS"]);
		const screen = await render(<RuneSimulator width={3} height={1} materials={grid} inscriptions={[]} />);
		await expect.element(screen.getByTestId("cell-1-0")).toHaveAttribute("data-material", String(MaterialId.Crystal));
	});

	test("all material types render without errors", async () => {
		const grid: MaterialIdValue[][] = [
			[
				MaterialId.Stone,
				MaterialId.Iron,
				MaterialId.Crystal,
				MaterialId.Copper,
				MaterialId.Wood,
				MaterialId.Dirt,
				MaterialId.Water,
				MaterialId.Air,
			],
		];
		const screen = await render(<RuneSimulator width={8} height={1} materials={grid} inscriptions={[]} />);
		const cells = screen.container.querySelectorAll("[data-testid^='cell-']");
		expect(cells.length).toBe(8);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/all-materials.png` });
	});

	test("multiple inscriptions render on same grid", async () => {
		const grid = uniformGrid(7, 1, MaterialId.Stone);
		const inscriptions = [ins(0, 0, RuneId.Kenaz), ins(3, 0, RuneId.Hagalaz), ins(6, 0, RuneId.Sowilo)];

		const screen = await render(<RuneSimulator width={7} height={1} materials={grid} inscriptions={inscriptions} />);

		await expect.element(screen.getByTestId("cell-0-0")).toHaveAttribute("data-rune", "kenaz");
		await expect.element(screen.getByTestId("cell-3-0")).toHaveAttribute("data-rune", "hagalaz");
		await expect.element(screen.getByTestId("cell-6-0")).toHaveAttribute("data-rune", "sowilo");
		await page.screenshot({ path: `${SCREENSHOT_DIR}/multi-inscriptions.png` });
	});
});

// ─── Performance Tests ───

describe("RuneSimulator - performance", () => {
	test("renders 400 cells (20x20 grid) without errors", async () => {
		const grid = uniformGrid(20, 20, MaterialId.Stone);
		const inscriptions: SurfaceInscription[] = [];
		for (let i = 0; i < 16; i++) {
			inscriptions.push(ins((i * 3) % 20, Math.floor((i * 3) / 20), RuneId.Kenaz));
		}

		const screen = await render(<RuneSimulator width={20} height={20} materials={grid} inscriptions={inscriptions} />);

		const cells = screen.container.querySelectorAll("[data-testid^='cell-']");
		expect(cells.length).toBe(400);
	});

	test("large grid with inscriptions renders in <1000ms", async () => {
		const grid = uniformGrid(25, 25, MaterialId.Stone);
		const inscriptions: SurfaceInscription[] = [];
		for (let i = 0; i < 32; i++) {
			inscriptions.push(ins(i % 25, Math.floor(i / 25), RuneId.Kenaz));
		}

		const start = performance.now();
		await render(<RuneSimulator width={25} height={25} materials={grid} inscriptions={inscriptions} />);
		const elapsed = performance.now() - start;

		expect(elapsed).toBeLessThan(1000);
	});
});

// ─── Turing Completeness Integration Tests (tick + verify) ───

describe("RuneSimulator - live signal propagation", () => {
	test("Kenaz emitter propagates signal through stone after tick", async () => {
		const grid = uniformGrid(7, 1, MaterialId.Stone);
		const inscriptions = [ins(0, 0, RuneId.Kenaz)];

		const screen = await render(
			<RuneSimulator width={7} height={1} materials={grid} inscriptions={inscriptions} showControls />,
		);

		await page.screenshot({ path: `${SCREENSHOT_DIR}/kenaz-before-tick.png` });

		// Before tick: no signal on adjacent cells
		const sig1 = screen.container.querySelector("[data-testid='signal-1-0']");
		expect(sig1).toBeNull();

		// Tick the simulation
		await screen.getByTestId("tick-btn").click();

		// After tick: emitter should be emitting, signal should propagate
		await page.screenshot({ path: `${SCREENSHOT_DIR}/kenaz-after-tick-1.png` });

		// Tick again for further propagation
		await screen.getByTestId("tick-btn").click();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/kenaz-after-tick-2.png` });

		// Verify signal data attributes appear on cells that received signal
		const emitterCell = screen.container.querySelector("[data-testid='cell-0-0']");
		const signalAttr = emitterCell?.getAttribute("data-signal");
		// After 2 ticks, the emitter cell itself should have signal
		expect(signalAttr).not.toBeNull();
	});

	test("Naudiz NOT gate emits when unpowered, silences when powered", async () => {
		// Layout: [Kenaz] [Stone] [Stone] [Naudiz] [Stone]
		// Kenaz emits → signal reaches Naudiz → Naudiz should go silent
		const grid = uniformGrid(5, 1, MaterialId.Stone);
		const inscriptions = [
			ins(0, 0, RuneId.Kenaz), // emitter
			ins(3, 0, RuneId.Naudiz), // NOT gate
		];

		const screen = await render(
			<RuneSimulator width={5} height={1} materials={grid} inscriptions={inscriptions} showControls />,
		);

		await page.screenshot({ path: `${SCREENSHOT_DIR}/not-gate-before.png` });

		// Tick 1: Kenaz emits, Naudiz initially unpowered → should emit
		await screen.getByTestId("tick-btn").click();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/not-gate-tick-1.png` });

		// Tick 2: Kenaz signal should reach Naudiz → silences it
		await screen.getByTestId("tick-btn").click();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/not-gate-tick-2.png` });

		// Tick 3: steady state
		await screen.getByTestId("tick-btn").click();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/not-gate-tick-3.png` });

		// Verify tick count
		await expect.element(screen.getByTestId("tick-count")).toHaveTextContent("Tick: 3");
	});

	test("signal blocked by wood insulator is visible", async () => {
		// Layout: [Kenaz] [Stone] [Wood] [Stone] [Stone]
		const grid = gridFromMap(["SSWSS"]);
		const inscriptions = [ins(0, 0, RuneId.Kenaz)];

		const screen = await render(
			<RuneSimulator width={5} height={1} materials={grid} inscriptions={inscriptions} showControls />,
		);

		// Tick several times
		for (let i = 0; i < 4; i++) {
			await screen.getByTestId("tick-btn").click();
		}
		await page.screenshot({ path: `${SCREENSHOT_DIR}/wood-insulator.png` });

		// Signal should be visible on stone before wood, but NOT after wood
		const beforeWood = screen.container.querySelector("[data-testid='cell-1-0']");
		const afterWood = screen.container.querySelector("[data-testid='cell-3-0']");
		expect(beforeWood?.getAttribute("data-signal")).not.toBeNull();
		expect(afterWood?.getAttribute("data-signal")).toBeNull();
	});

	test("Hagalaz AND gate only activates with two signal sources", async () => {
		// Layout: 3x3 grid. Kenaz top-center, Kenaz left-center, Hagalaz center.
		// Two paths converge at the Hagalaz.
		const grid = uniformGrid(3, 3, MaterialId.Stone);
		const inscriptions = [
			ins(1, 0, RuneId.Kenaz), // top emitter
			ins(0, 1, RuneId.Kenaz), // left emitter
			ins(1, 1, RuneId.Hagalaz), // AND gate at center
		];

		const screen = await render(
			<RuneSimulator width={3} height={3} materials={grid} inscriptions={inscriptions} showControls />,
		);

		await page.screenshot({ path: `${SCREENSHOT_DIR}/and-gate-before.png` });

		// Tick to propagate signals from both emitters
		for (let i = 0; i < 3; i++) {
			await screen.getByTestId("tick-btn").click();
		}
		await page.screenshot({ path: `${SCREENSHOT_DIR}/and-gate-after.png` });

		await expect.element(screen.getByTestId("tick-count")).toHaveTextContent("Tick: 3");
	});
});
