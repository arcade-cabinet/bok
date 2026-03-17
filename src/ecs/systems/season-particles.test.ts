import { describe, expect, it } from "vitest";
import { Season } from "./season-data.ts";
import { getSeasonParticles, type SeasonParticleConfig } from "./season-particles.ts";

describe("getSeasonParticles", () => {
	it("returns config for every season", () => {
		for (const s of [Season.Var, Season.Sommar, Season.Host, Season.Vinter]) {
			const cfg = getSeasonParticles(s);
			expect(cfg).toBeDefined();
			expect(cfg.colors.length).toBeGreaterThan(0);
		}
	});

	it("Vinter has white snow particles with slow drift", () => {
		const cfg = getSeasonParticles(Season.Vinter);
		expect(cfg.colors).toContain(0xffffff);
		expect(cfg.fallSpeed).toBeLessThan(2);
		expect(cfg.drift).toBeGreaterThan(0);
		expect(cfg.label).toBe("snow");
	});

	it("Höst has gold/brown leaf particles that tumble", () => {
		const cfg = getSeasonParticles(Season.Host);
		expect(cfg.label).toBe("leaves");
		expect(cfg.tumble).toBe(true);
		// Gold and brown tones
		for (const c of cfg.colors) {
			expect(c).toBeGreaterThan(0);
		}
		expect(cfg.size).toBeGreaterThan(0.1);
	});

	it("Vår has pink/white blossom particles", () => {
		const cfg = getSeasonParticles(Season.Var);
		expect(cfg.label).toBe("blossoms");
		expect(cfg.colors.length).toBeGreaterThanOrEqual(2);
		expect(cfg.opacity).toBeLessThan(0.8);
	});

	it("Sommar has subtle golden pollen/dust motes", () => {
		const cfg = getSeasonParticles(Season.Sommar);
		expect(cfg.label).toBe("pollen");
		expect(cfg.count).toBeLessThan(150);
		expect(cfg.opacity).toBeLessThan(0.4);
		expect(cfg.size).toBeLessThan(0.15);
	});

	it("all configs have valid numeric ranges", () => {
		for (const s of [Season.Var, Season.Sommar, Season.Host, Season.Vinter]) {
			const cfg: SeasonParticleConfig = getSeasonParticles(s);
			expect(cfg.count).toBeGreaterThan(0);
			expect(cfg.count).toBeLessThanOrEqual(400);
			expect(cfg.size).toBeGreaterThan(0);
			expect(cfg.opacity).toBeGreaterThan(0);
			expect(cfg.opacity).toBeLessThanOrEqual(1);
			expect(cfg.fallSpeed).toBeGreaterThan(0);
			expect(cfg.drift).toBeGreaterThanOrEqual(0);
		}
	});

	it("snow has highest particle count", () => {
		const snow = getSeasonParticles(Season.Vinter);
		const pollen = getSeasonParticles(Season.Sommar);
		expect(snow.count).toBeGreaterThan(pollen.count);
	});

	it("leaves are larger than snow particles", () => {
		const leaves = getSeasonParticles(Season.Host);
		const snow = getSeasonParticles(Season.Vinter);
		expect(leaves.size).toBeGreaterThan(snow.size);
	});
});
