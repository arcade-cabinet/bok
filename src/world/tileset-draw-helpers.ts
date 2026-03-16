/**
 * Drawing primitives and species-specific texture helpers for procedural tileset.
 * Draw callbacks receive a seeded PRNG (rng) for deterministic texture generation.
 *
 * Palette reference (docs/design/art-direction.md):
 *   Björk #e0d5c1, Mossa #3a5a40, Sten #6b6b6b, Glöd #a3452a,
 *   Falu #8b2500, Guld #c9a84c, Himmel #87ceeb, Bläck #1a1a2e
 */

export type DrawFn = (ctx: CanvasRenderingContext2D, s: number, rng: () => number) => void;

// ─── Base Noise ───

export function addNoise(ctx: CanvasRenderingContext2D, s: number, rng: () => number): void {
	for (let i = 0; i < 200; i++) {
		ctx.fillStyle = rng() > 0.5 ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
		ctx.fillRect(rng() * s, rng() * s, 2, 2);
	}
}

/** Warm-biased noise: light pixels tinted slightly warm instead of pure white. */
export function addWarmNoise(ctx: CanvasRenderingContext2D, s: number, rng: () => number): void {
	for (let i = 0; i < 200; i++) {
		ctx.fillStyle = rng() > 0.5 ? "rgba(0,0,0,0.1)" : "rgba(255,240,230,0.1)";
		ctx.fillRect(rng() * s, rng() * s, 2, 2);
	}
}

// ─── Generic Wood ───

export function drawWoodGrain(ctx: CanvasRenderingContext2D, s: number, rng: () => number): void {
	addNoise(ctx, s, rng);
	ctx.strokeStyle = "rgba(0,0,0,0.15)";
	ctx.lineWidth = 1;
	for (let i = 0; i < 6; i++) {
		const x = (i + 0.5) * (s / 6);
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, s);
		ctx.stroke();
	}
}

export function drawWoodRings(ctx: CanvasRenderingContext2D, s: number, rng: () => number): void {
	addNoise(ctx, s, rng);
	ctx.strokeStyle = "rgba(0,0,0,0.2)";
	ctx.lineWidth = 1;
	for (const r of [s / 4, s / 6]) {
		ctx.beginPath();
		ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2);
		ctx.stroke();
	}
}

// ─── Birch — white bark with horizontal dark lenticels ───

export function drawBirchBark(ctx: CanvasRenderingContext2D, s: number, rng: () => number): void {
	addNoise(ctx, s, rng);
	// Horizontal lenticels — the distinctive dark dashes on birch bark
	ctx.fillStyle = "rgba(80,60,40,0.35)";
	for (let i = 0; i < 8; i++) {
		const y = rng() * s;
		const x = rng() * s * 0.6;
		const w = 4 + rng() * 8;
		ctx.fillRect(x, y, w, 1.5);
	}
}

export function drawBirchRings(ctx: CanvasRenderingContext2D, s: number, rng: () => number): void {
	addNoise(ctx, s, rng);
	ctx.strokeStyle = "rgba(80,60,40,0.2)";
	ctx.lineWidth = 1;
	for (const r of [s / 3.5, s / 5.5]) {
		ctx.beginPath();
		ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2);
		ctx.stroke();
	}
}

// ─── Beech — smooth grey-brown, very subtle texture ───

export function drawBeechGrain(ctx: CanvasRenderingContext2D, s: number, rng: () => number): void {
	// Smooth texture — fewer, lighter noise dots than generic wood
	for (let i = 0; i < 100; i++) {
		ctx.fillStyle = rng() > 0.5 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
		ctx.fillRect(rng() * s, rng() * s, 2, 2);
	}
	// Very subtle vertical grain — lighter and fewer than pine
	ctx.strokeStyle = "rgba(0,0,0,0.08)";
	ctx.lineWidth = 1;
	for (let i = 0; i < 3; i++) {
		const x = (i + 1) * (s / 4);
		ctx.beginPath();
		ctx.moveTo(x + rng() * 2, 0);
		ctx.lineTo(x + rng() * 2, s);
		ctx.stroke();
	}
}

export function drawBeechRings(ctx: CanvasRenderingContext2D, s: number, rng: () => number): void {
	for (let i = 0; i < 80; i++) {
		ctx.fillStyle = rng() > 0.5 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
		ctx.fillRect(rng() * s, rng() * s, 2, 2);
	}
	ctx.strokeStyle = "rgba(0,0,0,0.12)";
	ctx.lineWidth = 1;
	for (const r of [s / 4, s / 6, s / 8]) {
		ctx.beginPath();
		ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2);
		ctx.stroke();
	}
}

// ─── Pine — dark, pronounced vertical grain ───

export function drawPineGrain(ctx: CanvasRenderingContext2D, s: number, rng: () => number): void {
	addNoise(ctx, s, rng);
	// Dark, pronounced vertical grain
	ctx.strokeStyle = "rgba(0,0,0,0.25)";
	ctx.lineWidth = 1.5;
	for (let i = 0; i < 7; i++) {
		const x = (i + 0.3) * (s / 7);
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x + rng() * 3 - 1.5, s);
		ctx.stroke();
	}
	// Resin knots — small dark spots
	ctx.fillStyle = "rgba(40,20,10,0.3)";
	for (let i = 0; i < 3; i++) {
		ctx.beginPath();
		ctx.arc(rng() * s, rng() * s, 1.5, 0, Math.PI * 2);
		ctx.fill();
	}
}

export function drawPineRings(ctx: CanvasRenderingContext2D, s: number, rng: () => number): void {
	addNoise(ctx, s, rng);
	ctx.strokeStyle = "rgba(0,0,0,0.3)";
	ctx.lineWidth = 1;
	for (const r of [s / 3, s / 4.5, s / 7]) {
		ctx.beginPath();
		ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2);
		ctx.stroke();
	}
}

// ─── Leaf Factory ───

export function withLeaves(highlight: string): DrawFn {
	return (ctx, s, rng) => {
		for (let i = 0; i < 100; i++) {
			ctx.fillStyle = rng() > 0.5 ? "rgba(0,0,0,0.15)" : highlight;
			ctx.fillRect(rng() * s, rng() * s, 3, 3);
		}
	};
}

// ─── Ore with Metallic Sparkle ───

export function withOreSparke(oreColor: string): DrawFn {
	return (ctx, s, rng) => {
		addNoise(ctx, s, rng);
		// Ore veins
		ctx.fillStyle = oreColor;
		for (let i = 0; i < 8; i++) {
			ctx.fillRect(rng() * (s - 4), rng() * (s - 4), 3 + rng() * 3, 3 + rng() * 3);
		}
		// Metallic sparkle highlights — small bright pixels
		for (let i = 0; i < 6; i++) {
			ctx.fillStyle = rng() > 0.5 ? "rgba(255,255,240,0.8)" : "rgba(255,250,200,0.6)";
			ctx.fillRect(rng() * (s - 2), rng() * (s - 2), 1.5, 1.5);
		}
	};
}

// ─── Biome Ground Textures ───

/** Moss — deep green, soft blotchy pattern. */
export function drawMossTexture(ctx: CanvasRenderingContext2D, s: number, rng: () => number): void {
	// Overlapping soft green blotches at varying sizes
	for (let i = 0; i < 150; i++) {
		const shade = rng();
		if (shade > 0.6) {
			ctx.fillStyle = "rgba(60,120,50,0.2)";
		} else if (shade > 0.3) {
			ctx.fillStyle = "rgba(50,100,55,0.15)";
		} else {
			ctx.fillStyle = "rgba(0,0,0,0.08)";
		}
		const size = 2 + rng() * 3;
		ctx.fillRect(rng() * s, rng() * s, size, size);
	}
}

/** Peat — dark brown, fibrous horizontal streaks. */
export function drawPeatTexture(ctx: CanvasRenderingContext2D, s: number, rng: () => number): void {
	addNoise(ctx, s, rng);
	// Fibrous horizontal lines
	ctx.strokeStyle = "rgba(80,50,30,0.25)";
	ctx.lineWidth = 1;
	for (let i = 0; i < 10; i++) {
		const y = rng() * s;
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(s, y + rng() * 3 - 1.5);
		ctx.stroke();
	}
	// Dark organic matter flecks
	ctx.fillStyle = "rgba(60,40,20,0.2)";
	for (let i = 0; i < 30; i++) {
		ctx.fillRect(rng() * s, rng() * s, 2, 1);
	}
}

/** Soot — black-grey, ashy particle detail. */
export function drawSootTexture(ctx: CanvasRenderingContext2D, s: number, rng: () => number): void {
	// Ash particles — light grey on dark
	for (let i = 0; i < 100; i++) {
		const v = rng();
		if (v > 0.7) {
			ctx.fillStyle = "rgba(120,110,100,0.15)";
		} else if (v > 0.4) {
			ctx.fillStyle = "rgba(0,0,0,0.15)";
		} else {
			ctx.fillStyle = "rgba(50,50,80,0.12)";
		}
		ctx.fillRect(rng() * s, rng() * s, 2, 2);
	}
	// Ember tint — rare warm orange specks
	ctx.fillStyle = "rgba(180,80,30,0.1)";
	for (let i = 0; i < 4; i++) {
		ctx.fillRect(rng() * s, rng() * s, 1.5, 1.5);
	}
}
