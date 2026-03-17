/**
 * BokMap — top-down fog-of-war map rendered on a canvas element.
 *
 * Biome colors for explored chunks, parchment for unexplored,
 * bright highlight for player's current chunk, rune glyphs for landmarks.
 */

import { useCallback, useEffect, useRef } from "react";
import type { FogState, LandmarkMarker } from "../../../ecs/systems/map-data.ts";
import {
	BIOME_COLORS,
	CURRENT_COLOR_ALPHA,
	chunkFogState,
	FOG_COLOR,
	LANDMARK_GLYPHS,
} from "../../../ecs/systems/map-data.ts";
import type { TravelAnchor } from "../../../ecs/systems/raido-travel.ts";
import type { BiomeId } from "../../../world/biomes.ts";
import { useMapGestures } from "../../hooks/useMapGestures.ts";

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
	/** Active Raido fast-travel anchors (optional for backward compat). */
	travelAnchors?: readonly TravelAnchor[];
	/** Called when player taps a travel anchor. */
	onTravelRequest?: (anchor: TravelAnchor) => void;
}

const CANVAS_SIZE = 300;
const PLAYER_COLOR = "#e8d44d";
const RAIDO_COLOR = "#6A5ACD";
const RAIDO_GLYPH = "\u16B1"; // ᚱ

export function BokMap({
	visited,
	playerCx,
	playerCz,
	biomeAt,
	landmarks,
	travelAnchors,
	onTravelRequest,
}: BokMapProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const gestures = useMapGestures();
	const cellSize = Math.max(2, Math.floor(CANVAS_SIZE / (gestures.zoom * 2 + 1)));
	const viewRadius = gestures.zoom;

	// Store anchor positions in pixel coords for click detection
	const anchorHitsRef = useRef<Array<{ anchor: TravelAnchor; px: number; py: number }>>([]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const size = viewRadius * 2 + 1;
		canvas.width = size * cellSize;
		canvas.height = size * cellSize;
		const hits: typeof anchorHitsRef.current = [];

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

		// Draw Raido travel anchors (interactive markers)
		if (travelAnchors) {
			ctx.font = `bold ${Math.max(10, cellSize)}px serif`;
			for (const anchor of travelAnchors) {
				const dx = anchor.cx - playerCx;
				const dz = anchor.cz - playerCz;
				if (Math.abs(dx) > viewRadius || Math.abs(dz) > viewRadius) continue;
				const px = (dx + viewRadius) * cellSize + cellSize / 2;
				const py = (dz + viewRadius) * cellSize + cellSize / 2;

				// Glow ring
				ctx.strokeStyle = RAIDO_COLOR;
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(px, py, Math.max(4, cellSize / 2.5), 0, Math.PI * 2);
				ctx.stroke();

				// Rune glyph
				ctx.fillStyle = RAIDO_COLOR;
				ctx.fillText(RAIDO_GLYPH, px, py);

				hits.push({ anchor, px, py });
			}
		}

		// Player dot
		const cx = viewRadius * cellSize + cellSize / 2;
		const cy = viewRadius * cellSize + cellSize / 2;
		ctx.fillStyle = PLAYER_COLOR;
		ctx.beginPath();
		ctx.arc(cx, cy, Math.max(2, cellSize / 4), 0, Math.PI * 2);
		ctx.fill();

		anchorHitsRef.current = hits;
	}, [visited, playerCx, playerCz, biomeAt, landmarks, travelAnchors, viewRadius, cellSize]);

	// Handle click/tap on canvas to detect anchor hits
	const handleCanvasClick = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (!onTravelRequest || anchorHitsRef.current.length === 0) return;
			const canvas = canvasRef.current;
			if (!canvas) return;

			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;
			const clickX = (e.clientX - rect.left) * scaleX;
			const clickY = (e.clientY - rect.top) * scaleY;
			const hitRadius = Math.max(8, cellSize);

			for (const hit of anchorHitsRef.current) {
				const dx = clickX - hit.px;
				const dy = clickY - hit.py;
				if (dx * dx + dy * dy < hitRadius * hitRadius) {
					onTravelRequest(hit.anchor);
					return;
				}
			}
		},
		[onTravelRequest, cellSize],
	);

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
					cursor: travelAnchors && travelAnchors.length > 0 ? "pointer" : "default",
				}}
				data-testid="bok-map-canvas"
				aria-label="World map"
				onClick={handleCanvasClick}
			/>
			<p className="text-xs opacity-50 font-body" style={{ color: "var(--color-bok-ink)" }}>
				{travelAnchors && travelAnchors.length > 0 ? "Tap ᚱ to travel" : "Pinch to zoom"}
			</p>
		</div>
	);
}

function chunkColor(fog: FogState, cx: number, cz: number, biomeAt: (cx: number, cz: number) => BiomeId): string {
	if (fog === "unexplored") return FOG_COLOR;
	return BIOME_COLORS[biomeAt(cx, cz)] ?? FOG_COLOR;
}
