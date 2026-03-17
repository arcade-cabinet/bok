// ─── Etching Surface ───
// Full-screen overlay for inscribing runes via freeform drawing.
// Prediction carousel: ghost tracery, double-tap to accept, swipe to cycle.
// Freeform draw: tap + draw, auto-recognized via findBestMatch().

import { useCallback, useEffect, useRef, useState } from "react";
import type { RuneIdValue } from "../../../ecs/systems/rune-data.ts";
import { RUNES } from "../../../ecs/systems/rune-data.ts";
import type { GlyphDef, Stroke, StrokePoint } from "../../../engine/runes/glyph-strokes.ts";
import { getAllGlyphs, getGlyph } from "../../../engine/runes/glyph-strokes.ts";
import { findBestMatch, matchGlyph, TOUCH_THRESHOLD } from "../../../engine/runes/stroke-matcher.ts";
import { CANVAS_SIZE, clientToNormalized, renderEtchingFrame } from "./etching-canvas.ts";

export interface EtchingSurfaceProps {
	predictions: readonly RuneIdValue[];
	discoveredRunes: readonly RuneIdValue[];
	onInscribe: (runeId: RuneIdValue, score: number) => void;
	onCancel: () => void;
	isTouch?: boolean;
}

const DOUBLE_TAP_MS = 350;
const SWIPE_MIN_PX = 40;
const PULSE_MS = 200;

type Phase = "idle" | "drawing" | "success" | "failure";

export function EtchingSurface({
	predictions,
	discoveredRunes,
	onInscribe,
	onCancel,
	isTouch = false,
}: EtchingSurfaceProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [strokes, setStrokes] = useState<Stroke[]>([]);
	const [currentStroke, setCurrentStroke] = useState<StrokePoint[]>([]);
	const [isDrawing, setIsDrawing] = useState(false);
	const [phase, setPhase] = useState<Phase>("idle");
	const [predIdx, setPredIdx] = useState(0);
	const [pulse, setPulse] = useState<"left" | "right" | null>(null);
	const [recognizedName, setRecognizedName] = useState<string | null>(null);
	const lastTapRef = useRef(0);
	const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
	const recognizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const threshold = isTouch ? TOUCH_THRESHOLD : 0.1;
	const pred = predictions.length > 0 ? predictions[predIdx % predictions.length] : null;
	const predGlyph = pred ? getGlyph(pred) : null;
	const predDef = pred ? RUNES[pred] : null;
	const predColor = predDef?.color ?? "#FFD700";

	const candidateGlyphs = useRef<GlyphDef[]>([]);
	useEffect(() => {
		const set = new Set(discoveredRunes);
		candidateGlyphs.current = getAllGlyphs().filter((g) => set.has(g.runeId));
	}, [discoveredRunes]);

	// ─── Prediction Carousel ───
	const cyclePrediction = useCallback(
		(dir: 1 | -1) => {
			const next = predIdx + dir;
			if (predictions.length <= 1 || next < 0 || next >= predictions.length) {
				setPulse(dir > 0 ? "right" : "left");
				setTimeout(() => setPulse(null), PULSE_MS);
				return;
			}
			setPredIdx(next);
		},
		[predictions.length, predIdx],
	);

	const handleDoubleTap = useCallback(() => {
		if (!pred) return;
		setPhase("success");
		setRecognizedName(predDef?.name ?? null);
		setTimeout(() => onInscribe(pred, 1.0), 400);
	}, [pred, predDef, onInscribe]);

	// ─── Stroke Input ───
	const startStroke = useCallback(
		(clientX: number, clientY: number) => {
			if (phase === "success" || phase === "failure") return;
			const now = Date.now();
			if (now - lastTapRef.current < DOUBLE_TAP_MS && strokes.length === 0) {
				handleDoubleTap();
				return;
			}
			lastTapRef.current = now;
			swipeStartRef.current = { x: clientX, y: clientY };
			const canvas = canvasRef.current;
			if (!canvas) return;
			const pt = clientToNormalized(canvas, clientX, clientY);
			if (!pt) return;
			setIsDrawing(true);
			setPhase("drawing");
			setCurrentStroke([pt]);
		},
		[phase, strokes.length, handleDoubleTap],
	);

	const continueStroke = useCallback(
		(clientX: number, clientY: number) => {
			if (!isDrawing || phase !== "drawing") return;
			const canvas = canvasRef.current;
			if (!canvas) return;
			const pt = clientToNormalized(canvas, clientX, clientY);
			if (!pt) return;
			setCurrentStroke((prev) => [...prev, pt]);
		},
		[isDrawing, phase],
	);

	const endStroke = useCallback(
		(clientX?: number) => {
			if (!isDrawing) return;
			setIsDrawing(false);
			if (swipeStartRef.current && clientX !== undefined && currentStroke.length < 5) {
				const dx = clientX - swipeStartRef.current.x;
				if (Math.abs(dx) > SWIPE_MIN_PX) {
					cyclePrediction(dx > 0 ? 1 : -1);
					setCurrentStroke([]);
					setPhase("idle");
					swipeStartRef.current = null;
					return;
				}
			}
			swipeStartRef.current = null;
			if (currentStroke.length >= 2) setStrokes((prev) => [...prev, currentStroke]);
			setCurrentStroke([]);
		},
		[isDrawing, currentStroke, cyclePrediction],
	);

	// ─── Auto-Recognize on Pause ───
	useEffect(() => {
		if (phase !== "drawing" || isDrawing || strokes.length === 0) return;
		recognizeTimerRef.current = setTimeout(() => {
			if (predGlyph) {
				const result = matchGlyph(strokes, predGlyph, threshold);
				if (result.pass) {
					setRecognizedName(predDef?.name ?? null);
					setPhase("success");
					if (pred != null) setTimeout(() => onInscribe(pred, result.score), 400);
					return;
				}
			}
			const match = findBestMatch(strokes, candidateGlyphs.current, threshold);
			if (match) {
				setRecognizedName(RUNES[match.glyph.runeId]?.name ?? null);
				setPhase("success");
				setTimeout(() => onInscribe(match.glyph.runeId as RuneIdValue, match.result.score), 400);
			} else {
				setPhase("failure");
				setTimeout(() => {
					setPhase("idle");
					setStrokes([]);
					setRecognizedName(null);
				}, 800);
			}
		}, 600);
		return () => {
			if (recognizeTimerRef.current) clearTimeout(recognizeTimerRef.current);
		};
	}, [phase, isDrawing, strokes, predGlyph, predDef, pred, threshold, onInscribe]);

	// ─── Event Wiring ───
	const onMD = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			startStroke(e.clientX, e.clientY);
		},
		[startStroke],
	);
	const onMM = useCallback((e: React.MouseEvent) => continueStroke(e.clientX, e.clientY), [continueStroke]);
	const onMU = useCallback((e: React.MouseEvent) => endStroke(e.clientX), [endStroke]);
	const onTS = useCallback(
		(e: React.TouchEvent) => {
			e.preventDefault();
			startStroke(e.touches[0].clientX, e.touches[0].clientY);
		},
		[startStroke],
	);
	const onTM = useCallback(
		(e: React.TouchEvent) => continueStroke(e.touches[0].clientX, e.touches[0].clientY),
		[continueStroke],
	);
	const onTE = useCallback((e: React.TouchEvent) => endStroke(e.changedTouches[0]?.clientX), [endStroke]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onCancel();
			if (e.key === "ArrowLeft") cyclePrediction(-1);
			if (e.key === "ArrowRight") cyclePrediction(1);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onCancel, cyclePrediction]);

	// ─── Canvas Render ───
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		renderEtchingFrame(canvas, { predGlyph: predGlyph ?? null, predColor, strokes, currentStroke, phase });
	}, [predGlyph, predColor, strokes, currentStroke, phase]);

	const predLabel = predictions.length > 0 ? `${predIdx + 1}/${predictions.length}` : null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center"
			data-testid="etching-surface"
			data-phase={phase}
			data-prediction={predDef?.name?.toLowerCase() ?? "none"}
			data-prediction-count={predictions.length}
			role="dialog"
			aria-modal="true"
			aria-label="Rune etching surface"
		>
			<div
				className="absolute inset-0 bg-black/60"
				onClick={onCancel}
				data-testid="etching-backdrop"
				aria-hidden="true"
			/>
			<div className="relative flex flex-col items-center gap-2 z-10">
				{predDef && phase !== "success" && (
					<div className="flex items-center gap-2" data-testid="prediction-header">
						<span className="text-2xl" style={{ color: predColor }}>
							{predDef.glyph}
						</span>
						<span className="text-sm" style={{ color: predColor }} data-testid="prediction-name">
							{predDef.name}
						</span>
						{predLabel && (
							<span className="text-xs text-neutral-400" data-testid="prediction-index">
								{predLabel}
							</span>
						)}
					</div>
				)}
				{phase === "idle" && predictions.length > 0 && (
					<div className="text-xs text-neutral-400" data-testid="etching-hint">
						double-tap to inscribe · draw to carve · swipe to cycle
					</div>
				)}
				{phase === "idle" && predictions.length === 0 && (
					<div className="text-xs text-neutral-400" data-testid="etching-hint">
						draw a rune to inscribe
					</div>
				)}
				<canvas
					ref={canvasRef}
					style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, touchAction: "none" }}
					className={`rounded-lg border-2 cursor-crosshair transition-all duration-150 ${pulse ? "border-amber-500/60" : "border-neutral-700"}`}
					onMouseDown={onMD}
					onMouseMove={onMM}
					onMouseUp={onMU}
					onMouseLeave={() => endStroke()}
					onTouchStart={onTS}
					onTouchMove={onTM}
					onTouchEnd={onTE}
					data-testid="etching-canvas"
				/>
				<div className="flex items-center gap-4">
					{strokes.length > 0 && phase === "drawing" && (
						<span className="text-xs text-neutral-400" data-testid="stroke-count">
							{strokes.length} stroke{strokes.length !== 1 ? "s" : ""}
						</span>
					)}
					{(phase === "drawing" || phase === "idle") && strokes.length > 0 && (
						<button
							type="button"
							className="px-3 py-1 min-h-[44px] rounded text-xs text-neutral-400 bg-neutral-800 hover:bg-neutral-700"
							onClick={() => {
								setStrokes([]);
								setCurrentStroke([]);
								setPhase("idle");
								setRecognizedName(null);
							}}
							data-testid="etching-clear"
						>
							Clear
						</button>
					)}
				</div>
				{phase === "success" && recognizedName && (
					<div className="text-sm font-bold" style={{ color: predColor }} data-testid="etching-result">
						{recognizedName} inscribed
					</div>
				)}
				{phase === "failure" && (
					<div className="text-sm text-red-400" data-testid="etching-result">
						unrecognized — try again
					</div>
				)}
			</div>
		</div>
	);
}
