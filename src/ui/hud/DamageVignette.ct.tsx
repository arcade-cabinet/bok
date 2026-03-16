import { expect, test } from "@playwright/experimental-ct-react";
import { DamageVignette } from "./DamageVignette.tsx";

test.describe("DamageVignette", () => {
	test("renders with full health (invisible)", async ({ mount }) => {
		const component = await mount(<DamageVignette health={100} damageFlash={0} />);
		const vignette = component.getByTestId("damage-vignette");
		await expect(vignette).toBeAttached();
		await expect(vignette).toHaveCSS("opacity", "0");
	});

	test("shows vignette at low health", async ({ mount }) => {
		const component = await mount(<DamageVignette health={30} damageFlash={0} />);
		const vignette = component.getByTestId("damage-vignette");
		await expect(vignette).toBeAttached();
		// 30/100 = 0.3 ratio, below 0.8 threshold → visible
		const opacity = await vignette.evaluate((el) => getComputedStyle(el).opacity);
		expect(Number(opacity)).toBeGreaterThan(0);
	});

	test("shows vignette during damage flash", async ({ mount }) => {
		const component = await mount(<DamageVignette health={100} damageFlash={0.8} />);
		const vignette = component.getByTestId("damage-vignette");
		const opacity = await vignette.evaluate((el) => getComputedStyle(el).opacity);
		expect(Number(opacity)).toBeGreaterThanOrEqual(0.7);
	});

	test("pulses at critical health", async ({ mount }) => {
		const component = await mount(<DamageVignette health={10} damageFlash={0} />);
		const vignette = component.getByTestId("damage-vignette");
		await expect(vignette).toHaveClass(/animate-low-health/);
	});

	test("does not pulse above critical threshold", async ({ mount }) => {
		const component = await mount(<DamageVignette health={50} damageFlash={0} />);
		const vignette = component.getByTestId("damage-vignette");
		const classes = await vignette.getAttribute("class");
		expect(classes).not.toContain("animate-low-health");
	});

	test("has aria-hidden for accessibility", async ({ mount }) => {
		const component = await mount(<DamageVignette health={50} damageFlash={0} />);
		const vignette = component.getByTestId("damage-vignette");
		await expect(vignette).toHaveAttribute("aria-hidden", "true");
	});
});
