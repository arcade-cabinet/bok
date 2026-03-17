/**
 * Save management hook — handles new game, continue, auto-save, and respawn.
 * Extracted from App.tsx to reduce component complexity.
 */

import { useCallback, useEffect, useRef } from "react";
import { Health, Hunger, PlayerState, PlayerTag, Position } from "../../ecs/traits/index.ts";
import {
	applyRuneEntries,
	applyVoxelDeltas,
	disableVoxelDeltaTracking,
	enableVoxelDeltaTracking,
	getRuneIndexEntries,
	initGame,
	kootaWorld,
	readPlayerStateForSave,
	restorePlayerState,
} from "../../engine/game.ts";
import {
	createSaveSlot,
	initDatabase,
	listSaveSlots,
	loadPlayerState,
	loadRuneFaces,
	loadVoxelDeltas,
	savePlayerState,
	saveRuneFaces,
	saveVoxelDelta,
} from "../../persistence/db.ts";

type GamePhase = "title" | "playing" | "dead";
const AUTO_SAVE_INTERVAL_MS = 60_000;

export function useSaveManager(phase: GamePhase, setPhase: (p: GamePhase) => void) {
	const saveSlotRef = useRef<number | null>(null);
	const saveSeedRef = useRef<string>("");

	const performSave = useCallback(async (): Promise<void> => {
		const slotId = saveSlotRef.current;
		if (slotId === null) return;
		const data = readPlayerStateForSave();
		if (!data) return;
		try {
			await savePlayerState(slotId, data);
			await saveRuneFaces(slotId, getRuneIndexEntries());
		} catch (err) {
			console.error("Auto-save failed:", err);
		}
	}, []);

	// Auto-save interval
	useEffect(() => {
		if (phase !== "playing") return;
		const interval = setInterval(() => performSave(), AUTO_SAVE_INTERVAL_MS);
		return () => clearInterval(interval);
	}, [phase, performSave]);

	// Cleanup delta tracking on phase change
	useEffect(() => {
		if (phase !== "playing") disableVoxelDeltaTracking();
		return () => disableVoxelDeltaTracking();
	}, [phase]);

	const handleStartGame = useCallback(
		async (seed: string) => {
			const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
			if (!canvas) return;
			try {
				await initDatabase();
				await initGame(canvas, seed);
				saveSeedRef.current = seed;
				const slotId = await createSaveSlot(seed);
				saveSlotRef.current = slotId;
				enableVoxelDeltaTracking((x, y, z, blockId) => {
					saveVoxelDelta(slotId, x, y, z, blockId).catch((err) => console.error("Delta save failed:", err));
				});
				setPhase("playing");
			} catch (err) {
				console.error("Failed to start game:", err);
			}
		},
		[setPhase],
	);

	const handleContinueGame = useCallback(async () => {
		const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
		if (!canvas) return;
		try {
			await initDatabase();
			const slots = await listSaveSlots();
			if (slots.length === 0) return;
			const slot = slots[0];
			const playerData = await loadPlayerState(slot.id);
			if (!playerData) return;
			await initGame(canvas, slot.seed);
			saveSeedRef.current = slot.seed;
			saveSlotRef.current = slot.id;
			const deltas = await loadVoxelDeltas(slot.id);
			if (deltas.length > 0) applyVoxelDeltas(deltas);
			restorePlayerState(playerData);
			const runeEntries = await loadRuneFaces(slot.id);
			if (runeEntries.length > 0) applyRuneEntries(runeEntries);
			enableVoxelDeltaTracking((x, y, z, blockId) => {
				saveVoxelDelta(slot.id, x, y, z, blockId).catch((err) => console.error("Delta save failed:", err));
			});
			setPhase("playing");
		} catch (err) {
			console.error("Failed to continue game:", err);
		}
	}, [setPhase]);

	const handleRespawn = useCallback(() => {
		kootaWorld.query(PlayerTag, Health, Hunger, Position, PlayerState).updateEach(([health, hunger, pos, state]) => {
			health.current = 100;
			hunger.current = 100;
			pos.x = 8.5;
			pos.y = 30;
			pos.z = 8.5;
			state.isDead = false;
			state.isRunning = true;
			state.damageFlash = 0;
		});
		setPhase("playing");
	}, [setPhase]);

	return { handleStartGame, handleContinueGame, handleRespawn };
}
