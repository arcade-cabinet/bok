// ─── RuneSimulator ───
// 2D top-down visual test harness for the surface rune language.
// Renders a material grid with inscriptions, wavefront signals, and resources.
// Supports both signal-only mode and full world-tick mode with WorldState.

import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from "react";
import { RUNES } from "../../ecs/systems/rune-data.ts";
import type { SurfaceInscription } from "./inscription.ts";
import { InscriptionIndex } from "./inscription.ts";
import type { MaterialIdValue } from "./material.ts";
import { MaterialId } from "./material.ts";
import { RuneCell } from "./RuneCell.tsx";
import type { InscriptionState } from "./rune-effects.ts";
import { createInscriptionState, processInscription } from "./rune-effects.ts";
import type { SignalField, WavefrontEmitter } from "./wavefront.ts";
import { getSignalAt, getSourceCount, propagateWavefront } from "./wavefront.ts";
import { WorldState } from "./world-state.ts";
import type { BerkananConfig } from "./world-tick.ts";
import { createTickState, tickWorld } from "./world-tick.ts";

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
	/** Enable world effects (resource production). */
	worldEnabled?: boolean;
	/** Berkanan resource config: position key → resource type. */
	berkananConfig?: BerkananConfig;
}

export interface RuneSimulatorHandle {
	/** Advance simulation by one tick. */
	tick: () => void;
	/** Get current signal field. */
	getField: () => SignalField;
	/** Get current tick count. */
	getTickCount: () => number;
	/** Get current world state (if world-enabled). */
	getWorldState: () => WorldState;
}

// ─── Component ───

export const RuneSimulator = forwardRef<RuneSimulatorHandle, RuneSimulatorProps>(function RuneSimulator(props, ref) {
	const {
		width,
		height,
		materials,
		inscriptions,
		cellSize = 24,
		showControls = false,
		worldEnabled = false,
		berkananConfig,
	} = props;

	const [tickCount, setTickCount] = useState(0);
	const [field, setField] = useState<SignalField>(new Map());
	const [, forceRender] = useState(0);

	// Build inscription index
	const insIndex = useMemo(() => {
		const idx = new InscriptionIndex();
		for (const ins of inscriptions) idx.add(ins);
		return idx;
	}, [inscriptions]);

	// Inscription state map (persists across ticks) — signal-only mode
	const [insStates] = useState(() => new Map<string, InscriptionState>());

	// World state (persists across ticks) — world-enabled mode
	const [worldState] = useState(() => new WorldState());
	const [worldTickState] = useState(() => createTickState());

	// Material sampler
	const getMaterial = useCallback(
		(x: number, y: number, z: number): MaterialIdValue => {
			if (y !== 0) return MaterialId.Air;
			if (z < 0 || z >= height || x < 0 || x >= width) return MaterialId.Air;
			return materials[z]?.[x] ?? MaterialId.Air;
		},
		[materials, width, height],
	);

	// Tick function — signal-only mode
	const tickSignalOnly = useCallback(() => {
		const emitters: WavefrontEmitter[] = [];

		for (const ins of insIndex.all()) {
			const key = `${ins.x},${ins.y},${ins.z},${ins.glyph}`;
			let state = insStates.get(key);
			if (!state) {
				state = createInscriptionState();
				insStates.set(key, state);
			}

			const signalStr = getSignalAt(field, ins.x, ins.y, ins.z);
			const sourceCnt = getSourceCount(field, ins.x, ins.y, ins.z);
			processInscription(ins.glyph, ins.material, state, signalStr, sourceCnt, ins.strength);

			if (state.emitting && state.outputStrength > 0) {
				emitters.push({ x: ins.x, y: ins.y, z: ins.z, strength: state.outputStrength });
			}
		}

		const newField = propagateWavefront(emitters, getMaterial);
		setField(newField);
		setTickCount((t) => t + 1);
	}, [field, getMaterial, insIndex, insStates]);

	// Tick function — world-enabled mode
	const tickWithWorld = useCallback(() => {
		const result = tickWorld(insIndex, getMaterial, field, worldState, worldTickState, berkananConfig ?? new Map());
		setField(result.field);
		setTickCount(result.tickCount);
		forceRender((n) => n + 1);
	}, [field, getMaterial, insIndex, worldState, worldTickState, berkananConfig]);

	const tick = worldEnabled ? tickWithWorld : tickSignalOnly;

	useImperativeHandle(ref, () => ({
		tick,
		getField: () => field,
		getTickCount: () => tickCount,
		getWorldState: () => worldState,
	}));

	// Pre-compute cell grid
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

					// Get emitting state from appropriate source
					let emitting = false;
					if (inscription) {
						if (worldEnabled) {
							const wsKey = `${inscription.x},${inscription.y},${inscription.z},${inscription.glyph}`;
							emitting = worldTickState.insStates.get(wsKey)?.emitting ?? false;
						} else {
							const key = `${inscription.x},${inscription.y},${inscription.z},${inscription.glyph}`;
							emitting = insStates.get(key)?.emitting ?? false;
						}
					}

					const resource = worldEnabled ? worldState.get(cell.x, 0, cell.z) : null;

					return (
						<RuneCell
							key={cell.id}
							id={cell.id}
							material={mat}
							signal={signal}
							runeDef={runeDef}
							emitting={emitting}
							cellSize={cellSize}
							resource={resource}
						/>
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
