/**
 * RuneVisualRenderer — renders inscribed rune glyphs as Three.js Line objects.
 * Reads from the rune spatial index and signal field each frame.
 * Reuses a pool of Line objects (max 256) to avoid GC pressure.
 *
 * Plain class — no Jolly Pixel dependency.
 */

import * as THREE from "three";
import type { RuneIdValue } from "../ecs/systems/rune-data.ts";
import { getRuneColor } from "../ecs/systems/rune-data.ts";
import { getRuneIndex } from "../ecs/systems/rune-index.ts";
import { getLastSignalField } from "../ecs/systems/rune-world-tick.ts";
import type { WorldPoint } from "./rune-face-renderer.ts";
import { glyphToFaceCoords } from "./rune-face-renderer.ts";
import { computeFaceGlow } from "./signal-glow-renderer.ts";

const MAX_LINES = 256;

interface LineEntry {
	line: THREE.Line;
	inUse: boolean;
}

/** Build a BufferGeometry from a flat array of WorldPoint arrays (strokes). */
function buildStrokeGeometry(strokes: WorldPoint[][]): THREE.BufferGeometry {
	const positions: number[] = [];
	for (const stroke of strokes) {
		for (let i = 0; i < stroke.length; i++) {
			const pt = stroke[i];
			positions.push(pt.x, pt.y, pt.z);
			// Duplicate interior points to form line segments (LineSegments mode).
			// Using THREE.Line (strip), so just push each point once.
		}
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
	return geo;
}

/** Parse a CSS color string into a THREE.Color hex int. */
function cssColorToHex(css: string): number {
	return new THREE.Color(css).getHex();
}

export class RuneVisualRenderer {
	private scene: THREE.Scene | null = null;
	private pool: LineEntry[] = [];
	/** Active line entries keyed by "x,y,z,face" for stable reuse. */
	private active = new Map<string, LineEntry>();
	private elapsedSeconds = 0;

	setup(scene: THREE.Scene): void {
		this.scene = scene;
		for (let i = 0; i < MAX_LINES; i++) {
			const mat = new THREE.LineBasicMaterial({
				color: 0xffffff,
				transparent: true,
				opacity: 1,
				depthTest: true,
			});
			const geo = new THREE.BufferGeometry();
			const line = new THREE.Line(geo, mat);
			line.visible = false;
			line.renderOrder = 1;
			scene.add(line);
			this.pool.push({ line, inUse: false });
		}
	}

	update(dt: number): void {
		if (!this.scene) return;
		this.elapsedSeconds += dt;

		const index = getRuneIndex();
		const signalField = getLastSignalField();
		const entries = index.getAllEntries();

		// Mark all currently active slots as candidates for release.
		const seen = new Set<string>();

		for (const entry of entries) {
			const { x, y, z, face, runeId } = entry;
			const slotKey = `${x},${y},${z},${face}`;
			seen.add(slotKey);

			const glyphData = glyphToFaceCoords(runeId, face, x, y, z);
			if (!glyphData) continue;

			// Look up signal strength from the field (keyed by block coords).
			const fieldKey = `${x},${y},${z}`;
			const cellSignal = signalField.get(fieldKey);
			const strength = cellSignal?.strength ?? 0;

			const glow = computeFaceGlow(runeId as RuneIdValue, strength, this.elapsedSeconds);
			const colorStr = getRuneColor(runeId) ?? "#ffffff";
			const colorHex = cssColorToHex(colorStr);

			let slot = this.active.get(slotKey);
			if (!slot) {
				// Acquire a free pool entry.
				slot = this.acquireSlot();
				if (!slot) continue; // Pool exhausted — skip this rune.
				this.active.set(slotKey, slot);

				// Rebuild geometry for this stroke set.
				slot.line.geometry.dispose();
				slot.line.geometry = buildStrokeGeometry(glyphData.strokes);
			}

			// Update material each frame (glow + color may change).
			const mat = slot.line.material as THREE.LineBasicMaterial;
			mat.color.setHex(colorHex);
			mat.opacity = 0.4 + glow * 0.6;
			slot.line.visible = true;
		}

		// Release slots for runes that no longer exist in the index.
		for (const [slotKey, slot] of this.active) {
			if (!seen.has(slotKey)) {
				this.releaseSlot(slot);
				this.active.delete(slotKey);
			}
		}
	}

	dispose(): void {
		if (!this.scene) return;
		for (const entry of this.pool) {
			entry.line.geometry.dispose();
			(entry.line.material as THREE.Material).dispose();
			this.scene.remove(entry.line);
		}
		this.pool.length = 0;
		this.active.clear();
		this.scene = null;
	}

	// ─── Private helpers ───

	private acquireSlot(): LineEntry | undefined {
		for (const entry of this.pool) {
			if (!entry.inUse) {
				entry.inUse = true;
				return entry;
			}
		}
		return undefined;
	}

	private releaseSlot(slot: LineEntry): void {
		slot.inUse = false;
		slot.line.visible = false;
	}
}
