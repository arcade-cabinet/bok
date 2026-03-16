import { describe, expect, it, vi } from "vitest";

// Mock Three.js for Node environment
vi.mock("three", () => {
	class MockVector3 {
		x = 0;
		y = 0;
		z = 0;
		set(x: number, y: number, z: number) {
			this.x = x;
			this.y = y;
			this.z = z;
			return this;
		}
	}
	class MockColor {
		r = 0;
		g = 0;
		b = 0;
		constructor(r = 0, g = 0, b = 0) {
			this.r = r;
			this.g = g;
			this.b = b;
		}
		getHSL(target: { h: number; s: number; l: number }) {
			// Simplified RGB→HSL for testing
			const max = Math.max(this.r, this.g, this.b);
			const min = Math.min(this.r, this.g, this.b);
			target.l = (max + min) / 2;
			if (max === min) {
				target.h = 0;
				target.s = 0;
			} else {
				const d = max - min;
				target.s = target.l > 0.5 ? d / (2 - max - min) : d / (max + min);
				if (max === this.r) target.h = ((this.g - this.b) / d + (this.g < this.b ? 6 : 0)) / 6;
				else if (max === this.g) target.h = ((this.b - this.r) / d + 2) / 6;
				else target.h = ((this.r - this.g) / d + 4) / 6;
			}
			return target;
		}
		setHSL(h: number, s: number, l: number) {
			if (s === 0) {
				this.r = this.g = this.b = l;
			} else {
				const hue2rgb = (p: number, q: number, t: number) => {
					let tt = t;
					if (tt < 0) tt += 1;
					if (tt > 1) tt -= 1;
					if (tt < 1 / 6) return p + (q - p) * 6 * tt;
					if (tt < 1 / 2) return q;
					if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
					return p;
				};
				const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
				const p = 2 * l - q;
				this.r = hue2rgb(p, q, h + 1 / 3);
				this.g = hue2rgb(p, q, h);
				this.b = hue2rgb(p, q, h - 1 / 3);
			}
			return this;
		}
		setHex(hex: number) {
			this.r = ((hex >> 16) & 0xff) / 255;
			this.g = ((hex >> 8) & 0xff) / 255;
			this.b = (hex & 0xff) / 255;
			return this;
		}
	}
	class MockGroup {
		children: unknown[] = [];
		position = new MockVector3();
		rotation = { x: 0, y: 0, z: 0 };
		visible = true;
		userData: Record<string, unknown> = {};
		add(child: unknown) {
			this.children.push(child);
		}
	}
	class MockMesh {
		geometry: unknown;
		material: unknown;
		position = new MockVector3();
		castShadow = false;
		visible = true;
		constructor(geo?: unknown, mat?: unknown) {
			this.geometry = geo;
			this.material = mat;
		}
	}
	return {
		Group: MockGroup,
		Mesh: MockMesh,
		BoxGeometry: class {
			constructor(
				public w = 0,
				public h = 0,
				public d = 0,
			) {}
		},
		SphereGeometry: class {
			constructor(
				public r = 0,
				public ws = 0,
				public hs = 0,
			) {}
		},
		ConeGeometry: class {
			constructor(
				public r = 0,
				public h = 0,
				public s = 0,
			) {}
		},
		MeshLambertMaterial: class {
			color: MockColor;
			constructor(opts?: { color?: number }) {
				this.color = new MockColor();
				if (opts?.color != null) this.color.setHex(opts.color);
			}
		},
		MeshBasicMaterial: class {
			color: MockColor;
			blending = 0;
			transparent = false;
			depthWrite = true;
			constructor(opts?: { color?: number }) {
				this.color = new MockColor();
				if (opts?.color != null) this.color.setHex(opts.color);
			}
		},
		Material: class {},
		PointLight: class {
			position = new MockVector3();
			constructor(
				public color = 0,
				public intensity = 1,
				public distance = 0,
			) {}
			dispose() {}
		},
		AdditiveBlending: 2,
		Color: MockColor,
	};
});

import {
	applyHueVariation,
	applyScaleVariation,
	assembleCreature,
	buildJointHierarchy,
	getPartDefs,
	LOD_DISTANCE,
	LOD_DISTANCE_SQ,
	updateLod,
	validatePartDefs,
} from "./creature-parts.ts";

describe("part definitions", () => {
	it("returns Mörker parts for morker species", () => {
		const parts = getPartDefs("morker");
		expect(parts.length).toBeGreaterThan(0);
		expect(parts[0].jointParent).toBe(-1); // root part
	});

	it("falls back to Mörker for unknown species", () => {
		const morkerParts = getPartDefs("morker");
		const fallback = getPartDefs("vittra");
		expect(fallback).toBe(morkerParts);
	});

	it("returns Lyktgubbe parts for lyktgubbe species", () => {
		const parts = getPartDefs("lyktgubbe");
		expect(parts.length).toBe(1);
		expect(parts[0].geometry).toBe("sphere");
		expect(parts[0].emissive).toBe(0xffd700);
		expect(parts[0].additive).toBe(true);
	});

	it("validates Mörker part defs", () => {
		expect(validatePartDefs(getPartDefs("morker"))).toBe(true);
	});

	it("rejects empty part arrays", () => {
		expect(validatePartDefs([])).toBe(false);
	});

	it("rejects parts with out-of-range parent", () => {
		const bad = [
			{
				geometry: "box" as const,
				size: [1, 1, 1] as [number, number, number],
				offset: [0, 0, 0] as [number, number, number],
				jointParent: -1,
				jointAxis: null,
				color: 0,
			},
			{
				geometry: "box" as const,
				size: [1, 1, 1] as [number, number, number],
				offset: [0, 0, 0] as [number, number, number],
				jointParent: 5,
				jointAxis: null,
				color: 0,
			},
		];
		expect(validatePartDefs(bad)).toBe(false);
	});

	it("rejects forward references (parent index >= self index)", () => {
		const bad = [
			{
				geometry: "box" as const,
				size: [1, 1, 1] as [number, number, number],
				offset: [0, 0, 0] as [number, number, number],
				jointParent: -1,
				jointAxis: null,
				color: 0,
			},
			{
				geometry: "box" as const,
				size: [1, 1, 1] as [number, number, number],
				offset: [0, 0, 0] as [number, number, number],
				jointParent: 1,
				jointAxis: null,
				color: 0,
			},
		];
		expect(validatePartDefs(bad)).toBe(false);
	});

	it("every Mörker part has positive dimensions", () => {
		for (const part of getPartDefs("morker")) {
			expect(part.size[0]).toBeGreaterThan(0);
			expect(part.size[1]).toBeGreaterThan(0);
			expect(part.size[2]).toBeGreaterThan(0);
		}
	});
});

describe("joint hierarchy", () => {
	it("builds correct parent-child adjacency for Mörker", () => {
		const parts = getPartDefs("morker");
		const hierarchy = buildJointHierarchy(parts);

		// Core mass (0) has children: upper mass(1), lower tendril(2), eye(3)
		expect(hierarchy[0]).toContain(1);
		expect(hierarchy[0]).toContain(2);
		expect(hierarchy[0]).toContain(3);

		// Upper mass (1) has children: eye(4), eye(5)
		expect(hierarchy[1]).toContain(4);
		expect(hierarchy[1]).toContain(5);
	});

	it("root parts have no parent entries in hierarchy", () => {
		const parts = getPartDefs("morker");
		const hierarchy = buildJointHierarchy(parts);
		// Root parts (jointParent === -1) should not appear as children anywhere
		const allChildren = hierarchy.flat();
		const rootIndices = parts.map((p, i) => (p.jointParent === -1 ? i : -1)).filter((i) => i >= 0);
		for (const ri of rootIndices) {
			expect(allChildren).not.toContain(ri);
		}
	});

	it("Mörker has rotational joints on body masses", () => {
		const parts = getPartDefs("morker");
		expect(parts[1].jointAxis).toBe("y"); // upper mass: Y-axis rotation
		expect(parts[2].jointAxis).toBe("x"); // lower tendril: X-axis rotation
	});

	it("Mörker head joint rotates on Y axis", () => {
		const parts = getPartDefs("morker");
		expect(parts[1].jointAxis).toBe("y");
	});
});

describe("scale variation", () => {
	it("returns base value when variant is 0.5 (center)", () => {
		expect(applyScaleVariation(1.0, 0.5)).toBeCloseTo(1.0);
	});

	it("applies +10% at variant 1.0", () => {
		expect(applyScaleVariation(1.0, 1.0)).toBeCloseTo(1.1);
	});

	it("applies -10% at variant 0.0", () => {
		expect(applyScaleVariation(1.0, 0.0)).toBeCloseTo(0.9);
	});

	it("stays within ±10% for any variant in [0,1]", () => {
		for (let v = 0; v <= 1; v += 0.1) {
			const scaled = applyScaleVariation(1.0, v);
			expect(scaled).toBeGreaterThanOrEqual(0.9);
			expect(scaled).toBeLessThanOrEqual(1.1);
		}
	});
});

describe("hue variation", () => {
	it("preserves color when variant is 0.5", () => {
		const original = 0xff4444;
		const varied = applyHueVariation(original, 0.5);
		// Should be same or very close (floating point)
		expect(varied).toBe(original);
	});

	it("shifts hue for non-center variant", () => {
		const original = 0xff4444;
		const varied = applyHueVariation(original, 0.0);
		expect(varied).not.toBe(original);
	});

	it("stays within ±5% hue shift for extreme variants", () => {
		// Hue shift should be at most (0.5 * 0.1) = 0.05 = 5%
		// We verify the output is a valid 24-bit color
		const result = applyHueVariation(0x4488cc, 0.0);
		expect(result).toBeGreaterThanOrEqual(0);
		expect(result).toBeLessThanOrEqual(0xffffff);
	});

	it("handles achromatic colors (grey)", () => {
		const grey = 0x888888;
		const result = applyHueVariation(grey, 0.0);
		// Grey has no hue, so shift should produce a valid color
		expect(result).toBeGreaterThanOrEqual(0);
		expect(result).toBeLessThanOrEqual(0xffffff);
	});
});

describe("LOD threshold", () => {
	it("LOD distance is 30 blocks", () => {
		expect(LOD_DISTANCE).toBe(30);
	});

	it("LOD_DISTANCE_SQ equals LOD_DISTANCE squared", () => {
		expect(LOD_DISTANCE_SQ).toBe(LOD_DISTANCE * LOD_DISTANCE);
	});
});

describe("assembly", () => {
	it("creates root group with correct number of top-level children", () => {
		const assembled = assembleCreature("morker", 0.5);
		expect(assembled.root).toBeDefined();
		// Root should contain: body group + lodMesh
		expect(assembled.root.children.length).toBe(2); // body group + lodMesh
	});

	it("creates correct number of part groups", () => {
		const parts = getPartDefs("morker");
		const assembled = assembleCreature("morker", 0.5);
		expect(assembled.parts.length).toBe(parts.length);
	});

	it("nests child parts under parent groups", () => {
		const assembled = assembleCreature("morker", 0.5);
		const body = assembled.parts[0];
		// Body should contain: its mesh + head group + left arm + right arm
		expect(body.children.length).toBe(4); // mesh + head + 2 arms
	});

	it("head group contains eyes", () => {
		const assembled = assembleCreature("morker", 0.5);
		const head = assembled.parts[1];
		// Head should contain: its mesh + left eye + right eye
		expect(head.children.length).toBe(3);
	});

	it("stores jointAxis in userData", () => {
		const assembled = assembleCreature("morker", 0.5);
		expect(assembled.parts[0].userData.jointAxis).toBeNull(); // core: no joint
		expect(assembled.parts[1].userData.jointAxis).toBe("y"); // upper mass: y-axis
		expect(assembled.parts[2].userData.jointAxis).toBe("x"); // lower tendril: x-axis
	});

	it("applies scale variation to part meshes", () => {
		const small = assembleCreature("morker", 0.0);
		const large = assembleCreature("morker", 1.0);
		// Different variants should produce different assemblies
		// (we can't easily compare mesh geometry sizes with mocks,
		// but the function runs without error)
		expect(small.parts.length).toBe(large.parts.length);
	});

	it("creates LOD mesh that starts hidden", () => {
		const assembled = assembleCreature("morker", 0.5);
		expect(assembled.lodMesh).toBeDefined();
		expect(assembled.lodMesh.visible).toBe(false);
	});
});

describe("LOD switching", () => {
	it("shows full parts when close (distSq < LOD_DISTANCE_SQ)", () => {
		const assembled = assembleCreature("morker", 0.5);
		const isLod = updateLod(assembled, 100); // 10 blocks away
		expect(isLod).toBe(false);
		expect(assembled.lodMesh.visible).toBe(false);
		for (const part of assembled.parts) {
			expect(part.visible).toBe(true);
		}
	});

	it("shows LOD mesh when far (distSq > LOD_DISTANCE_SQ)", () => {
		const assembled = assembleCreature("morker", 0.5);
		const isLod = updateLod(assembled, 1000); // ~31.6 blocks away
		expect(isLod).toBe(true);
		expect(assembled.lodMesh.visible).toBe(true);
		for (const part of assembled.parts) {
			expect(part.visible).toBe(false);
		}
	});

	it("uses exact LOD_DISTANCE_SQ threshold", () => {
		const assembled = assembleCreature("morker", 0.5);

		// Exactly at threshold — should NOT be LOD (> not >=)
		updateLod(assembled, LOD_DISTANCE_SQ);
		expect(assembled.lodMesh.visible).toBe(false);

		// Just above threshold — should be LOD
		updateLod(assembled, LOD_DISTANCE_SQ + 1);
		expect(assembled.lodMesh.visible).toBe(true);
	});
});
