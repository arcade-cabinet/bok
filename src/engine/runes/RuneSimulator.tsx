// ─── RuneSimulator ───
// 2D top-down visual test harness for the surface rune language.
// Renders a material grid with inscriptions and wavefront signals.
// Exposes tick control for Playwright CT testing.

import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from "react";
import { RUNES } from "../../ecs/systems/rune-data.ts";
import type { SurfaceInscription } from "./inscription.ts";
import { InscriptionIndex } from "./inscription.ts";
import type { MaterialIdValue } from "./material.ts";
import { MaterialId } from "./material.ts";
import type { InscriptionState } from "./rune-effects.ts";
import { createInscriptionState, processInscription } from "./rune-effects.ts";
import type { SignalField, WavefrontEmitter } from "./wavefront.ts";
import { getSignalAt, getSourceCount, propagateWavefront } from "./wavefront.ts";

// ─── Types ───

export interface RuneSimulatorProps {
	/** Grid width in cells. */
	width: number;
	/** Grid height (z-axis) in cells. */
	height: number;
	/** Material at each cell: [row][col]. Defaults to Air. */
	materials: MaterialIdValue[][];
	/** Inscriptions placed on the grid. */
	inscriptions: SurfaceInscription[];
	/** Cell size in pixels (default 24). */
	cellSize?: number;
	/** Show tick button for testing (default false). */
	showControls?: boolean;
}

export interface RuneSimulatorHandle {
	/** Advance simulation by one tick. */
	tick: () => void;
	/** Get current signal field. */
	getField: () => SignalField;
	/** Get current tick count. */
	getTickCount: () => number;
}

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

// ─── Component ───

export const RuneSimulator = forwardRef<RuneSimulatorHandle, RuneSimulatorProps>(function RuneSimulator(props, ref) {
	const { width, height, materials, inscriptions, cellSize = 24, showControls = false } = props;

	const [tickCount, setTickCount] = useState(0);
	const [field, setField] = useState<SignalField>(new Map());

	// Build inscription index
	const insIndex = useMemo(() => {
		const idx = new InscriptionIndex();
		for (const ins of inscriptions) idx.add(ins);
		return idx;
	}, [inscriptions]);

	// Inscription state map (persists across ticks)
	const [insStates] = useState(() => new Map<string, InscriptionState>());

	// Material sampler
	const getMaterial = useCallback(
		(x: number, y: number, z: number): MaterialIdValue => {
			if (y !== 0) return MaterialId.Air;
			if (z < 0 || z >= height || x < 0 || x >= width) return MaterialId.Air;
			return materials[z]?.[x] ?? MaterialId.Air;
		},
		[materials, width, height],
	);

	// Tick function
	const tick = useCallback(() => {
		// 1. Process all inscriptions to determine emitters
		const emitters: WavefrontEmitter[] = [];

		for (const ins of insIndex.all()) {
			const key = `${ins.x},${ins.y},${ins.z},${ins.glyph}`;
			let state = insStates.get(key);
			if (!state) {
				state = createInscriptionState();
				insStates.set(key, state);
			}

			// Check incoming signal from previous field
			const signalStr = getSignalAt(field, ins.x, ins.y, ins.z);
			const sourceCnt = getSourceCount(field, ins.x, ins.y, ins.z);

			processInscription(ins.glyph, ins.material, state, signalStr, sourceCnt, ins.strength);

			if (state.emitting && state.outputStrength > 0) {
				emitters.push({
					x: ins.x,
					y: ins.y,
					z: ins.z,
					strength: state.outputStrength,
				});
			}
		}

		// 2. Propagate wavefronts
		const newField = propagateWavefront(emitters, getMaterial);
		setField(newField);
		setTickCount((t) => t + 1);
	}, [field, getMaterial, insIndex, insStates]);

	useImperativeHandle(ref, () => ({
		tick,
		getField: () => field,
		getTickCount: () => tickCount,
	}));

	// Pre-compute cell data to avoid array-index-as-key lint
	const cells = useMemo(() => {
		const result: { x: number; z: number; id: string }[] = [];
		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				result.push({ x, z, id: `${x}-${z}` });
			}
		}
		return result;
	}, [width, height]);

	return (
		<>
			<div
				data-testid="rune-simulator"
				style={{
					display: "grid",
					gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
					gap: 1,
					padding: 4,
					background: "#0d0d1a",
					width: "fit-content",
				}}
			>
				{cells.map((cell) => {
					const mat = getMaterial(cell.x, 0, cell.z);
					const signal = getSignalAt(field, cell.x, 0, cell.z);
					const insAt = insIndex.at(cell.x, 0, cell.z);
					const inscription = insAt.length > 0 ? insAt[0] : null;
					const runeDef = inscription ? RUNES[inscription.glyph as number] : null;
					const glow = Math.min(signal / 10, 1);

					return (
						<div
							key={cell.id}
							data-testid={`cell-${cell.id}`}
							data-material={mat}
							data-signal={signal > 0 ? signal.toFixed(1) : undefined}
							data-glyph={runeDef?.glyph}
							data-rune={runeDef?.name.toLowerCase()}
							data-emitting={
								inscription
									? insStates.get(`${inscription.x},${inscription.y},${inscription.z},${inscription.glyph}`)?.emitting
										? "true"
										: undefined
									: undefined
							}
							style={{
								width: cellSize,
								height: cellSize,
								backgroundColor: MAT_COLORS[mat],
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: cellSize * 0.6,
								color: runeDef?.color ?? "#fff",
								position: "relative",
								boxShadow: glow > 0 ? `inset 0 0 ${glow * 8}px ${runeDef?.color ?? "#ff0"}` : undefined,
								opacity: mat === MaterialId.Air ? 0.3 : 1,
							}}
						>
							{runeDef?.glyph}
							{signal > 0 && (
								<div
									data-testid={`signal-${cell.id}`}
									style={{
										position: "absolute",
										inset: 0,
										background: `rgba(255, 200, 0, ${glow * 0.4})`,
										pointerEvents: "none",
									}}
								/>
							)}
						</div>
					);
				})}
			</div>
			{showControls && (
				<div data-testid="sim-controls" style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
					<button type="button" data-testid="tick-btn" onClick={tick} style={{ padding: "4px 12px" }}>
						Tick
					</button>
					<span data-testid="tick-count">Tick: {tickCount}</span>
				</div>
			)}
		</>
	);
});
