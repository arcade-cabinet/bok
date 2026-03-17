/**
 * Performance monitor — tracks FPS, draw calls, memory, and frame time.
 * Dev-only: activated via `Shift+P` or `window.__bokPerf.start()`.
 * Reads Three.js renderer.info for draw call / triangle counts.
 */

import type * as THREE from "three";

/** Performance budget thresholds from CLAUDE.md. */
export const PERF_BUDGETS = {
	fpsMobile: 55,
	fpsDesktop: 60,
	drawCalls: 50,
	memoryMB: 100,
	bundleKB: 500,
	ttiMs: 3000,
} as const;

export interface PerfSnapshot {
	fps: number;
	frameTimeMs: number;
	drawCalls: number;
	triangles: number;
	geometries: number;
	textures: number;
	memoryMB: number | null;
	violations: string[];
}

const SAMPLE_WINDOW = 60;

let frames: number[] = [];
let lastTime = 0;
let renderer: THREE.WebGLRenderer | null = null;
let active = false;
let overlayEl: HTMLDivElement | null = null;
let rafId = 0;

/** Bind to the Three.js renderer for draw call info. */
export function bindRenderer(r: THREE.WebGLRenderer): void {
	renderer = r;
}

/** Take a single performance snapshot. */
export function snapshot(): PerfSnapshot {
	const now = performance.now();
	const dt = now - lastTime;
	lastTime = now;

	frames.push(dt);
	if (frames.length > SAMPLE_WINDOW) frames.shift();

	const avgMs = frames.reduce((a, b) => a + b, 0) / frames.length;
	const fps = avgMs > 0 ? 1000 / avgMs : 0;

	const info = renderer?.info;
	const drawCalls = info?.render?.calls ?? 0;
	const triangles = info?.render?.triangles ?? 0;
	const geometries = info?.memory?.geometries ?? 0;
	const textures = info?.memory?.textures ?? 0;

	// Chrome-only memory API
	const perfMem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
	const memoryMB = perfMem ? perfMem.usedJSHeapSize / (1024 * 1024) : null;

	const violations: string[] = [];
	const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
	const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
	const fpsTarget = isMobile ? PERF_BUDGETS.fpsMobile : PERF_BUDGETS.fpsDesktop;

	if (fps > 0 && fps < fpsTarget) {
		violations.push(`FPS ${fps.toFixed(1)} < ${fpsTarget}`);
	}
	if (drawCalls > PERF_BUDGETS.drawCalls) {
		violations.push(`Draw calls ${drawCalls} > ${PERF_BUDGETS.drawCalls}`);
	}
	if (memoryMB !== null && memoryMB > PERF_BUDGETS.memoryMB) {
		violations.push(`Memory ${memoryMB.toFixed(1)}MB > ${PERF_BUDGETS.memoryMB}MB`);
	}

	return { fps, frameTimeMs: avgMs, drawCalls, triangles, geometries, textures, memoryMB, violations };
}

/** Create or update the on-screen overlay. */
function updateOverlay(snap: PerfSnapshot): void {
	if (!overlayEl) {
		overlayEl = document.createElement("div");
		overlayEl.id = "bok-perf-overlay";
		Object.assign(overlayEl.style, {
			position: "fixed",
			top: "4px",
			left: "4px",
			zIndex: "99999",
			background: "rgba(0,0,0,0.8)",
			color: "#0f0",
			fontFamily: "monospace",
			fontSize: "11px",
			padding: "6px 8px",
			borderRadius: "4px",
			pointerEvents: "none",
			lineHeight: "1.4",
			whiteSpace: "pre",
		});
		document.body.appendChild(overlayEl);
	}

	const memStr = snap.memoryMB !== null ? `${snap.memoryMB.toFixed(1)}MB` : "N/A";
	const vioStr = snap.violations.length > 0 ? `\n!! ${snap.violations.join(" | ")}` : "";
	const vioColor = snap.violations.length > 0 ? "color:#f44" : "color:#0f0";

	overlayEl.innerHTML = [
		`FPS: <span style="${snap.fps < 55 ? "color:#f44" : "color:#0f0"}">${snap.fps.toFixed(1)}</span>`,
		`Frame: ${snap.frameTimeMs.toFixed(1)}ms`,
		`Draws: <span style="${snap.drawCalls > 50 ? "color:#f44" : "color:#0f0"}">${snap.drawCalls}</span>`,
		`Tris: ${(snap.triangles / 1000).toFixed(1)}k`,
		`Geo: ${snap.geometries} | Tex: ${snap.textures}`,
		`Mem: ${memStr}`,
		vioStr ? `<span style="${vioColor}">${vioStr}</span>` : "",
	]
		.filter(Boolean)
		.join("\n");
}

function loop(): void {
	if (!active) return;
	const snap = snapshot();
	updateOverlay(snap);
	renderer?.info.reset();
	rafId = requestAnimationFrame(loop);
}

/** Start the performance monitor overlay. */
export function startMonitor(): void {
	if (active) return;
	active = true;
	lastTime = performance.now();
	frames = [];
	loop();
}

/** Stop the performance monitor overlay. */
export function stopMonitor(): void {
	active = false;
	cancelAnimationFrame(rafId);
	if (overlayEl) {
		overlayEl.remove();
		overlayEl = null;
	}
}

/** Toggle monitor on/off. */
export function toggleMonitor(): void {
	if (active) stopMonitor();
	else startMonitor();
}

/** Register Shift+P keyboard shortcut (dev only). */
export function registerPerfShortcut(): void {
	document.addEventListener("keydown", (e) => {
		if (e.shiftKey && e.code === "KeyP") {
			e.preventDefault();
			toggleMonitor();
		}
	});
}
