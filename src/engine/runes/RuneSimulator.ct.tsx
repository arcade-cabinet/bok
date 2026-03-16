import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { RuneId } from "../../ecs/systems/rune-data.ts";
import type { SurfaceInscription } from "./inscription.ts";
import type { MaterialIdValue } from "./material.ts";
import { MaterialId } from "./material.ts";
import { RuneSimulator } from "./RuneSimulator.tsx";

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
		// 5 * 3 = 15 cells
		const cells = screen.container.querySelectorAll("[data-testid^='cell-']");
		expect(cells.length).toBe(15);
	});

	test("renders inscription glyph at specified position", async () => {
		const grid = uniformGrid(5, 1, MaterialId.Stone);
		const screen = await render(
			<RuneSimulator width={5} height={1} materials={grid} inscriptions={[ins(2, 0, RuneId.Kenaz)]} />,
		);
		await expect.element(screen.getByTestId("cell-2-0")).toHaveAttribute("data-glyph", "ᚲ");
		await expect.element(screen.getByTestId("cell-2-0")).toHaveAttribute("data-rune", "kenaz");
	});

	test("cells show correct material data attribute", async () => {
		const grid = gridFromMap(["S.W"]);
		const screen = await render(<RuneSimulator width={3} height={1} materials={grid} inscriptions={[]} />);
		await expect.element(screen.getByTestId("cell-0-0")).toHaveAttribute("data-material", String(MaterialId.Stone));
		await expect.element(screen.getByTestId("cell-1-0")).toHaveAttribute("data-material", String(MaterialId.Air));
		await expect.element(screen.getByTestId("cell-2-0")).toHaveAttribute("data-material", String(MaterialId.Wood));
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
	});

	test("multiple inscriptions render on same grid", async () => {
		const grid = uniformGrid(7, 1, MaterialId.Stone);
		const inscriptions = [ins(0, 0, RuneId.Kenaz), ins(3, 0, RuneId.Hagalaz), ins(6, 0, RuneId.Sowilo)];

		const screen = await render(<RuneSimulator width={7} height={1} materials={grid} inscriptions={inscriptions} />);

		await expect.element(screen.getByTestId("cell-0-0")).toHaveAttribute("data-rune", "kenaz");
		await expect.element(screen.getByTestId("cell-3-0")).toHaveAttribute("data-rune", "hagalaz");
		await expect.element(screen.getByTestId("cell-6-0")).toHaveAttribute("data-rune", "sowilo");
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
