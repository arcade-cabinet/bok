import { useCallback, useEffect, useRef, useState } from "react";
import type { InventoryData } from "./ecs/inventory.ts";
import { addItem, canAfford, deductCost } from "./ecs/inventory.ts";
import { getMaxDurability } from "./ecs/systems/tool-durability.ts";
import type { BlockIdValue, HotbarSlot } from "./ecs/traits/index.ts";
import {
	Health,
	Hotbar,
	Hunger,
	Inventory,
	MiningState,
	PhysicsBody,
	PlayerState,
	PlayerTag,
	Position,
	QuestProgress,
	Stamina,
	WorldTime,
} from "./ecs/traits/index.ts";
import {
	applyVoxelDeltas,
	disableVoxelDeltaTracking,
	enableVoxelDeltaTracking,
	initGame,
	kootaWorld,
	readPlayerStateForSave,
	restorePlayerState,
} from "./engine/game.ts";
import { setupInputHandlers } from "./engine/input-handler.ts";
import {
	createSaveSlot,
	initDatabase,
	listSaveSlots,
	loadPlayerState,
	loadVoxelDeltas,
	savePlayerState,
	saveVoxelDelta,
} from "./persistence/db.ts";
import { CraftingMenu } from "./ui/components/CraftingMenu.tsx";
import { Crosshair } from "./ui/hud/Crosshair.tsx";
import { DamageVignette } from "./ui/hud/DamageVignette.tsx";
import { HotbarDisplay } from "./ui/hud/HotbarDisplay.tsx";
import { MobileControls } from "./ui/hud/MobileControls.tsx";
import { QuestTracker } from "./ui/hud/QuestTracker.tsx";
import { TimeDisplay } from "./ui/hud/TimeDisplay.tsx";
import { UnderwaterOverlay } from "./ui/hud/UnderwaterOverlay.tsx";
import { VitalsBar } from "./ui/hud/VitalsBar.tsx";
import { DeathScreen } from "./ui/screens/DeathScreen.tsx";
import { TitleScreen } from "./ui/screens/TitleScreen.tsx";
import { RECIPES } from "./world/blocks.ts";

function isMobile(): boolean {
	if (typeof window === "undefined" || typeof navigator === "undefined") return false;
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
const AUTO_SAVE_INTERVAL_MS = 60_000;

type GamePhase = "title" | "playing" | "dead";

export default function App() {
	const [phase, setPhase] = useState<GamePhase>("title");
	const [craftingOpen, setCraftingOpen] = useState(false);
	const [hasSaveSlot, setHasSaveSlot] = useState(false);
	const cleanupRef = useRef<(() => void) | null>(null);
	const saveSlotRef = useRef<number | null>(null);
	const saveSeedRef = useRef<string>("");

	// Poll ECS state for HUD (runs on animationFrame)
	const [hudState, setHudState] = useState({
		health: 100,
		hunger: 100,
		stamina: 100,
		hungerSlowed: false,
		inventory: { items: {}, capacity: 256 } as InventoryData,
		hotbarSlots: [null, null, null, null, null] as (HotbarSlot | null)[],
		activeSlot: 0,
		miningActive: false,
		miningProgress: 0,
		questStep: 0,
		questProgress: 0,
		damageFlash: 0,
		isSwimming: false,
		timeOfDay: 0.25,
		dayCount: 1,
		isDead: false,
	});

	// Init database + check for existing saves on mount
	useEffect(() => {
		initDatabase()
			.then(() => listSaveSlots())
			.then((slots) => setHasSaveSlot(slots.length > 0))
			.catch((err) => console.error("DB init failed:", err));
	}, []);

	// HUD polling loop — single setHudState per frame
	useEffect(() => {
		if (phase !== "playing") return;

		let raf: number;
		const poll = () => {
			let playerUpdate: Partial<typeof hudState> = {};
			let timeUpdate: Partial<typeof hudState> = {};

			kootaWorld
				.query(
					PlayerTag,
					Health,
					Hunger,
					Stamina,
					Inventory,
					Hotbar,
					MiningState,
					QuestProgress,
					PlayerState,
					PhysicsBody,
				)
				.readEach(([health, hunger, stamina, inv, hotbar, mining, quest, state, body]) => {
					playerUpdate = {
						health: health.current,
						hunger: hunger.current,
						stamina: stamina.current,
						hungerSlowed: state.hungerSlowed,
						inventory: { items: { ...inv.items }, capacity: inv.capacity },
						hotbarSlots: [...hotbar.slots],
						activeSlot: hotbar.activeSlot,
						miningActive: mining.active,
						miningProgress: mining.progress,
						questStep: quest.step,
						questProgress: quest.progress,
						damageFlash: state.damageFlash,
						isSwimming: body.isSwimming,
						isDead: state.isDead,
					};

					if (state.isDead) {
						setPhase("dead");
					}
				});

			kootaWorld.query(WorldTime).readEach(([time]) => {
				timeUpdate = {
					timeOfDay: time.timeOfDay,
					dayCount: time.dayCount,
				};
			});

			setHudState((prev) => ({
				...prev,
				...playerUpdate,
				...timeUpdate,
			}));

			raf = requestAnimationFrame(poll);
		};
		raf = requestAnimationFrame(poll);
		return () => cancelAnimationFrame(raf);
	}, [phase]);

	const performSave = useCallback(async (): Promise<void> => {
		const slotId = saveSlotRef.current;
		if (slotId === null) return;
		const data = readPlayerStateForSave();
		if (!data) return;
		try {
			await savePlayerState(slotId, data);
		} catch (err) {
			console.error("Auto-save failed:", err);
		}
	}, []);

	// Auto-save every 60 seconds while playing
	useEffect(() => {
		if (phase !== "playing") return;

		const interval = setInterval(() => {
			performSave();
		}, AUTO_SAVE_INTERVAL_MS);
		return () => clearInterval(interval);
	}, [phase, performSave]);

	// Cleanup input handlers when leaving playing phase or unmounting
	useEffect(() => {
		if (phase !== "playing") {
			cleanupRef.current?.();
			cleanupRef.current = null;
			disableVoxelDeltaTracking();
			return;
		}
		return () => {
			cleanupRef.current?.();
			cleanupRef.current = null;
			disableVoxelDeltaTracking();
		};
	}, [phase]);

	// Keyboard listener for crafting toggle
	useEffect(() => {
		if (phase !== "playing") return;

		const onKey = (e: KeyboardEvent) => {
			if (e.code === "KeyE") {
				setCraftingOpen((prev) => {
					const next = !prev;
					if (next) {
						document.exitPointerLock();
					} else {
						const canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null;
						canvas?.requestPointerLock();
					}
					return next;
				});
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [phase]);

	const handleStartGame = useCallback(async (seed: string) => {
		const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
		if (!canvas) return;

		try {
			await initGame(canvas, seed);
			saveSeedRef.current = seed;

			// Create save slot and wire delta tracking
			const slotId = await createSaveSlot(seed);
			saveSlotRef.current = slotId;
			enableVoxelDeltaTracking((x, y, z, blockId) => {
				saveVoxelDelta(slotId, x, y, z, blockId).catch((err) => console.error("Delta save failed:", err));
			});

			cleanupRef.current?.();
			cleanupRef.current = setupInputHandlers(canvas);
			setPhase("playing");
		} catch (err) {
			console.error("Failed to start game:", err);
		}
	}, []);

	const handleContinueGame = useCallback(async () => {
		const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
		if (!canvas) return;

		try {
			const slots = await listSaveSlots();
			if (slots.length === 0) return;

			// Load most recent save
			const slot = slots[0];
			const playerData = await loadPlayerState(slot.id);
			if (!playerData) return;

			await initGame(canvas, slot.seed);
			saveSeedRef.current = slot.seed;
			saveSlotRef.current = slot.id;

			// Apply voxel deltas from DB
			const deltas = await loadVoxelDeltas(slot.id);
			if (deltas.length > 0) {
				// Temporarily disable delta tracking to avoid re-saving loaded deltas
				applyVoxelDeltas(deltas);
			}

			// Restore player state
			restorePlayerState(playerData);

			// Wire delta tracking for new changes
			enableVoxelDeltaTracking((x, y, z, blockId) => {
				saveVoxelDelta(slot.id, x, y, z, blockId).catch((err) => console.error("Delta save failed:", err));
			});

			cleanupRef.current?.();
			cleanupRef.current = setupInputHandlers(canvas);
			setPhase("playing");
		} catch (err) {
			console.error("Failed to continue game:", err);
		}
	}, []);

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
	}, []);

	const handleCraft = useCallback((recipeId: string) => {
		const recipe = RECIPES.find((r) => r.id === recipeId);
		if (!recipe) return;

		kootaWorld.query(PlayerTag, Inventory, Hotbar).updateEach(([inv, hotbar]) => {
			if (!canAfford(inv, recipe.cost)) return;

			deductCost(inv, recipe.cost);

			if (recipe.result.type === "block") {
				addItem(inv, recipe.result.id, recipe.result.qty);
			}

			const newSlot: HotbarSlot =
				recipe.result.type === "block"
					? { id: recipe.result.id as BlockIdValue, type: "block" }
					: { id: recipe.result.id, type: "item", durability: getMaxDurability(recipe.result.id) };
			const emptySlot = hotbar.slots.indexOf(null);
			if (emptySlot >= 0) {
				hotbar.slots[emptySlot] = newSlot;
			} else {
				hotbar.slots[hotbar.activeSlot] = newSlot;
			}
		});
	}, []);

	const handleSlotClick = useCallback((index: number) => {
		kootaWorld.query(PlayerTag, Hotbar, PlayerState).updateEach(([hotbar, state]) => {
			if (hotbar.activeSlot === index) {
				// Tapping the already-active slot triggers eat
				state.wantsEat = true;
			} else {
				hotbar.activeSlot = index;
			}
		});
	}, []);

	return (
		<>
			{/* Overlays */}
			{phase === "playing" && (
				<>
					<DamageVignette health={hudState.health} damageFlash={hudState.damageFlash} />
					<UnderwaterOverlay isUnderwater={hudState.isSwimming} />
				</>
			)}

			{/* UI Layer */}
			<div className="absolute inset-0 z-10 pointer-events-none">
				{phase === "title" && (
					<TitleScreen onStartGame={handleStartGame} onContinueGame={hasSaveSlot ? handleContinueGame : undefined} />
				)}
				{phase === "dead" && <DeathScreen onRespawn={handleRespawn} />}

				{phase === "playing" && (
					<>
						{!isMobile() && <Crosshair isMining={hudState.miningActive} miningProgress={hudState.miningProgress} />}
						{isMobile() && <MobileControls onCraftToggle={() => setCraftingOpen((prev) => !prev)} />}

						<div
							className="absolute top-4 left-4 right-4 flex justify-between items-start"
							style={{ textShadow: "1px 1px 2px #000, 0 0 4px #000" }}
						>
							<TimeDisplay timeOfDay={hudState.timeOfDay} dayCount={hudState.dayCount} />
							<QuestTracker step={hudState.questStep} progress={hudState.questProgress} />
						</div>

						<div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
							<VitalsBar
								health={hudState.health}
								hunger={hudState.hunger}
								stamina={hudState.stamina}
								hungerSlowed={hudState.hungerSlowed}
							/>
							<HotbarDisplay
								slots={hudState.hotbarSlots}
								activeSlot={hudState.activeSlot}
								inventory={hudState.inventory}
								onSlotClick={handleSlotClick}
							/>
						</div>

						<CraftingMenu
							isOpen={craftingOpen}
							inventory={hudState.inventory}
							onCraft={handleCraft}
							onClose={() => {
								setCraftingOpen(false);
								const canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null;
								canvas?.requestPointerLock();
							}}
						/>
					</>
				)}
			</div>
		</>
	);
}
