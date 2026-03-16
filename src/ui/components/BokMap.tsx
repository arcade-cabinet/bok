/**
 * BokMap — top-down fog-of-war map rendered on a canvas element.
 *
 * Biome colors for explored chunks, parchment for unexplored,
 * bright highlight for player's current chunk, rune glyphs for landmarks.
 */

import { useEffect, useRef } from "react";
import type { FogState, LandmarkMarker } from "../../ecs/systems/map-data.ts";
import {
	BIOME_COLORS,
	CURRENT_COLOR_ALPHA,
	chunkFogState,
	FOG_COLOR,
	LANDMARK_GLYPHS,
} from "../../ecs/systems/map-data.ts";
import type { BiomeId } from "../../world/biomes.ts";
import { useMapGestures } from "../hooks/useMapGestures.ts";

export interface BokMapProps {
	/** Packed chunk keys the player has visited. */
	visited: ReadonlySet<number>;
	/** Player's current chunk. */
	playerCx: number;
	playerCz: number;
	/** Biome resolver: chunk coords → biome id. */
	biomeAt: (cx: number, cz: number) => BiomeId;
	/** Discovered landmark markers. */
	landmarks: readonly LandmarkMarker[];
}

const CANVAS_SIZE = 300;
const PLAYER_COLOR = "#e8d44d";

export function BokMap({ visited, playerCx, playerCz, biomeAt, landmarks }: BokMapProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const gestures = useMapGestures();
	const cellSize = Math.max(2, Math.floor(CANVAS_SIZE / (gestures.zoom * 2 + 1)));

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const viewRadius = gestures.zoom;
		const size = viewRadius * 2 + 1;
		canvas.width = size * cellSize;
		canvas.height = size * cellSize;

		// Draw chunks
		for (let dx = -viewRadius; dx <= viewRadius; dx++) {
			for (let dz = -viewRadius; dz <= viewRadius; dz++) {
				const cx = playerCx + dx;
				const cz = playerCz + dz;
				const fog = chunkFogState(cx, cz, playerCx, playerCz, visited);
				const px = (dx + viewRadius) * cellSize;
				const py = (dz + viewRadius) * cellSize;

				ctx.fillStyle = chunkColor(fog, cx, cz, biomeAt);
				ctx.fillRect(px, py, cellSize, cellSize);

				if (fog === "current") {
					ctx.fillStyle = PLAYER_COLOR;
					ctx.globalAlpha = CURRENT_COLOR_ALPHA;
					ctx.fillRect(px, py, cellSize, cellSize);
					ctx.globalAlpha = 1;
				}
			}
		}

		// Draw landmark markers
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `${Math.max(8, cellSize - 2)}px serif`;
		for (const lm of landmarks) {
			const dx = lm.cx - playerCx;
			const dz = lm.cz - playerCz;
			if (Math.abs(dx) > viewRadius || Math.abs(dz) > viewRadius) continue;
			const px = (dx + viewRadius) * cellSize + cellSize / 2;
			const py = (dz + viewRadius) * cellSize + cellSize / 2;
			ctx.fillStyle = "#c9a84c";
			ctx.fillText(LANDMARK_GLYPHS[lm.type] ?? "\u16A0", px, py);
		}

		// Player dot
		const cx = viewRadius * cellSize + cellSize / 2;
		const cy = viewRadius * cellSize + cellSize / 2;
		ctx.fillStyle = PLAYER_COLOR;
		ctx.beginPath();
		ctx.arc(cx, cy, Math.max(2, cellSize / 4), 0, Math.PI * 2);
		ctx.fill();
	}, [visited, playerCx, playerCz, biomeAt, landmarks, gestures.zoom, cellSize]);

	return (
		<div
			className="flex flex-col items-center gap-2"
			data-testid="bok-map"
			onTouchStart={gestures.onTouchStart}
			onTouchMove={gestures.onTouchMove}
			onWheel={gestures.onWheel}
		>
			<canvas
				ref={canvasRef}
				className="rounded-lg border"
				style={{
					border: "2px solid var(--color-bok-gold)",
					maxWidth: "100%",
					imageRendering: "pixelated",
				}}
				data-testid="bok-map-canvas"
				aria-label="World map"
			/>
			<p className="text-xs opacity-50 font-body" style={{ color: "var(--color-bok-ink)" }}>
				Pinch to zoom
			</p>
		</div>
	);
}

function chunkColor(fog: FogState, cx: number, cz: number, biomeAt: (cx: number, cz: number) => BiomeId): string {
	if (fog === "unexplored") return FOG_COLOR;
	return BIOME_COLORS[biomeAt(cx, cz)] ?? FOG_COLOR;
}
