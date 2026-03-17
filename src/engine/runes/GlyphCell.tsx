// ─── GlyphCell ───
// Standalone visual component rendering a rune glyph with canvas glow.
// Different from RuneCell (which is part of RuneSimulator's grid).
// Used for rune rendering on block faces and UI displays.

import { useEffect, useRef } from "react";
import { RUNES, type RuneIdValue } from "../../ecs/systems/rune-data.ts";
import { getGlyph } from "./glyph-strokes.ts";

export interface GlyphCellProps {
	runeId: number;
	glowIntensity: number;
	size: number;
}

export function GlyphCell({ runeId, glowIntensity, size }: GlyphCellProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const def = runeId !== 0 ? RUNES[runeId] : null;
	const glyph = runeId !== 0 ? getGlyph(runeId as RuneIdValue) : null;
	const runeName = def?.name?.toLowerCase() ?? "none";
	const color = def?.color ?? "#666";

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		canvas.width = size * dpr;
		canvas.height = size * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		// Dark stone background
		ctx.fillStyle = "#1a1816";
		ctx.fillRect(0, 0, size, size);

		if (!glyph || !def) return;

		const pad = size * 0.12;
		const drawSize = size - pad * 2;

		// Radial glow behind glyph
		if (glowIntensity > 0) {
			const hex = Math.round(glowIntensity * 60)
				.toString(16)
				.padStart(2, "0");
			const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, drawSize * 0.6);
			grad.addColorStop(0, `${color}${hex}`);
			grad.addColorStop(1, "transparent");
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, size, size);
		}

		const alpha = Math.max(0.3, glowIntensity);
		const alphaHex = Math.round(alpha * 255)
			.toString(16)
			.padStart(2, "0");
		const glowHex = Math.round(alpha * 0.4 * 255)
			.toString(16)
			.padStart(2, "0");

		// Outer glow stroke
		ctx.strokeStyle = `${color}${glowHex}`;
		ctx.lineWidth = 4;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		for (const stroke of glyph.strokes) {
			ctx.beginPath();
			for (let i = 0; i < stroke.length; i++) {
				const sx = pad + stroke[i].x * drawSize;
				const sy = pad + stroke[i].y * drawSize;
				if (i === 0) ctx.moveTo(sx, sy);
				else ctx.lineTo(sx, sy);
			}
			ctx.stroke();
		}

		// Inner core stroke
		ctx.strokeStyle = `${color}${alphaHex}`;
		ctx.lineWidth = 2;
		for (const stroke of glyph.strokes) {
			ctx.beginPath();
			for (let i = 0; i < stroke.length; i++) {
				const sx = pad + stroke[i].x * drawSize;
				const sy = pad + stroke[i].y * drawSize;
				if (i === 0) ctx.moveTo(sx, sy);
				else ctx.lineTo(sx, sy);
			}
			ctx.stroke();
		}
	}, [glowIntensity, size, glyph, def, color]);

	return (
		<canvas
			ref={canvasRef}
			style={{ width: size, height: size }}
			data-testid="rune-cell"
			data-rune={runeName}
			data-glow={String(glowIntensity)}
		/>
	);
}
