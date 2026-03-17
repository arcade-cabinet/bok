// ─── RuneCell ───
// Renders a single cell in the RuneSimulator grid.
// Shows material background, rune glyph, signal glow, and resource dots.

import type { RuneDef } from "../../ecs/systems/rune-data.ts";
import type { MaterialIdValue } from "./material.ts";
import { MaterialId } from "./material.ts";
import { RESOURCES } from "./resource.ts";
import type { CellResource } from "./world-state.ts";

// ─── Material Colors ───

const MAT_COLORS: Record<MaterialIdValue, string> = {
	[MaterialId.Air]: "#1a1a2e",
	[MaterialId.Stone]: "#6b6b6b",
	[MaterialId.Iron]: "#8a8a8a",
	[MaterialId.Crystal]: "#b388ff",
	[MaterialId.Copper]: "#b87333",
	[MaterialId.Wood]: "#8b6914",
	[MaterialId.Dirt]: "#5c4033",
	[MaterialId.Water]: "#2196f3",
};

// ─── Props ───

export interface RuneCellProps {
	id: string;
	material: MaterialIdValue;
	signal: number;
	runeDef: RuneDef | null;
	emitting: boolean;
	cellSize: number;
	resource: CellResource | null;
}

// ─── Component ───

export function RuneCell({ id, material, signal, runeDef, emitting, cellSize, resource }: RuneCellProps) {
	const glow = Math.min(signal / 10, 1);
	const resMeta = resource ? RESOURCES[resource.type] : null;

	return (
		<div
			data-testid={`cell-${id}`}
			data-material={material}
			data-signal={signal > 0 ? signal.toFixed(1) : undefined}
			data-glyph={runeDef?.glyph}
			data-rune={runeDef?.name.toLowerCase()}
			data-emitting={emitting ? "true" : undefined}
			data-resource={resMeta?.name.toLowerCase()}
			data-resource-qty={resource?.qty}
			style={{
				width: cellSize,
				height: cellSize,
				backgroundColor: MAT_COLORS[material],
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontSize: cellSize * 0.6,
				color: runeDef?.color ?? "#fff",
				position: "relative",
				boxShadow: glow > 0 ? `inset 0 0 ${glow * 8}px ${runeDef?.color ?? "#ff0"}` : undefined,
				opacity: material === MaterialId.Air ? 0.3 : 1,
			}}
		>
			{runeDef?.glyph}
			{signal > 0 && (
				<div
					data-testid={`signal-${id}`}
					style={{
						position: "absolute",
						inset: 0,
						background: `rgba(255, 200, 0, ${glow * 0.4})`,
						pointerEvents: "none",
					}}
				/>
			)}
			{resource && resMeta && (
				<div
					data-testid={`resource-${id}`}
					style={{
						position: "absolute",
						bottom: 1,
						right: 2,
						fontSize: cellSize * 0.35,
						color: resMeta.color,
						lineHeight: 1,
						pointerEvents: "none",
					}}
				>
					{resMeta.symbol}
					{resource.qty > 1 && <span style={{ fontSize: cellSize * 0.25 }}>{resource.qty}</span>}
				</div>
			)}
		</div>
	);
}
