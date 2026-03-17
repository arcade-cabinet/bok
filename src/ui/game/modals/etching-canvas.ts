// ─── Etching Canvas Rendering ───
// Canvas drawing helpers for the EtchingSurface component.
// Extracted to keep EtchingSurface under 200 LOC.

import type { GlyphDef, StrokePoint } from "../../../engine/runes/glyph-strokes.ts";

/** Canvas size in CSS pixels. */
export const CANVAS_SIZE = 280;
/** Padding inside the canvas for drawing. */
export const PAD = 30;
/** Drawing area size. */
export const DRAW_SIZE = CANVAS_SIZE - PAD * 2;

/** Convert client coordinates to [0,1]² normalized space. */
export function clientToNormalized(canvas: HTMLCanvasElement, clientX: number, clientY: number): StrokePoint | null {
	const rect = canvas.getBoundingClientRect();
	const nx = (clientX - rect.left - PAD) / DRAW_SIZE;
	const ny = (clientY - rect.top - PAD) / DRAW_SIZE;
	if (nx < -0.1 || nx > 1.1 || ny < -0.1 || ny > 1.1) return null;
	return { x: Math.max(0, Math.min(1, nx)), y: Math.max(0, Math.min(1, ny)) };
}

/** Draw a player stroke on the canvas with glow effect. */
export function drawPlayerStroke(ctx: CanvasRenderingContext2D, stroke: StrokePoint[], color: string) {
	if (stroke.length < 2) return;

	ctx.strokeStyle = `${color}60`;
	ctx.lineWidth = 6;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.beginPath();
	for (let i = 0; i < stroke.length; i++) {
		const sx = PAD + stroke[i].x * DRAW_SIZE;
		const sy = PAD + stroke[i].y * DRAW_SIZE;
		if (i === 0) ctx.moveTo(sx, sy);
		else ctx.lineTo(sx, sy);
	}
	ctx.stroke();

	ctx.strokeStyle = color;
	ctx.lineWidth = 2.5;
	ctx.beginPath();
	for (let i = 0; i < stroke.length; i++) {
		const sx = PAD + stroke[i].x * DRAW_SIZE;
		const sy = PAD + stroke[i].y * DRAW_SIZE;
		if (i === 0) ctx.moveTo(sx, sy);
		else ctx.lineTo(sx, sy);
	}
	ctx.stroke();
}

/** Draw the ghost tracery of a prediction glyph. */
export function drawGhostGlyph(ctx: CanvasRenderingContext2D, glyph: GlyphDef, color: string, alpha: number) {
	const hex = Math.round(alpha * 255)
		.toString(16)
		.padStart(2, "0");
	ctx.strokeStyle = `${color}${hex}`;
	ctx.lineWidth = 6;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";

	for (const stroke of glyph.strokes) {
		ctx.beginPath();
		for (let i = 0; i < stroke.length; i++) {
			const sx = PAD + stroke[i].x * DRAW_SIZE;
			const sy = PAD + stroke[i].y * DRAW_SIZE;
			if (i === 0) ctx.moveTo(sx, sy);
			else ctx.lineTo(sx, sy);
		}
		ctx.stroke();
	}
}

/** Render the full etching canvas frame. */
export function renderEtchingFrame(
	canvas: HTMLCanvasElement,
	opts: {
		predGlyph: GlyphDef | null;
		predColor: string;
		strokes: StrokePoint[][];
		currentStroke: StrokePoint[];
		phase: "idle" | "drawing" | "success" | "failure";
	},
) {
	const c = canvas.getContext("2d");
	if (!c) return;

	const dpr = window.devicePixelRatio || 1;
	canvas.width = CANVAS_SIZE * dpr;
	canvas.height = CANVAS_SIZE * dpr;
	c.setTransform(dpr, 0, 0, dpr, 0, 0);

	// Background — dark stone
	c.fillStyle = "rgba(40, 35, 30, 0.95)";
	c.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

	// Prediction ghost tracery
	if (opts.predGlyph && (opts.phase === "idle" || opts.phase === "drawing")) {
		const ghostAlpha = opts.phase === "idle" ? 0.12 : 0.05;
		drawGhostGlyph(c, opts.predGlyph, opts.predColor, ghostAlpha);
	}

	// Player strokes
	for (const stroke of opts.strokes) {
		drawPlayerStroke(c, stroke, opts.predColor);
	}
	if (opts.currentStroke.length >= 2) {
		drawPlayerStroke(c, opts.currentStroke, opts.predColor);
	}

	// Phase overlays
	if (opts.phase === "success") {
		c.fillStyle = `${opts.predColor}30`;
		c.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
	}
	if (opts.phase === "failure") {
		c.fillStyle = "rgba(255, 50, 50, 0.2)";
		c.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
	}
}
