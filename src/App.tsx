import { useCallback, useEffect, useRef, useState } from "react";
import type { InventoryData } from "./ecs/inventory.ts";
import { addItem, canAfford, deductCost } from "./ecs/inventory.ts";
import { getDiscoveredLandmarks } from "./ecs/systems/exploration.ts";
import { worldToChunk } from "./ecs/systems/map-data.ts";
import { findMicroGoal } from "./ecs/systems/micro-goals.ts";
import { CRYSTAL_DUST_ID } from "./ecs/systems/raido-data.ts";
import type { FaceIndex, RuneIdValue } from "./ecs/systems/rune-data.ts";
import { PLACEABLE_RUNES } from "./ecs/systems/rune-data.ts";
import { placeRune } from "./ecs/systems/rune-inscription.ts";
import { computeActiveObjective, computeSagaStats } from "./ecs/systems/saga-data.ts";
import { AUTO_SAVE_INTERVAL_MS } from "./ecs/systems/session-data.ts";
import type { ResumeContext } from "./ecs/systems/session-resume.ts";
import { generateResumeContext } from "./ecs/systems/session-resume.ts";
import { getMaxDurability } from "./ecs/systems/tool-durability.ts";
import type { BlockIdValue, HotbarSlot } from "./ecs/traits/index.ts";
import {
	CameraTransition,
	ChiselState,
	Codex,
	CreatureTag,
	EtchingState,
	ExploredChunks,
	Health,
	Hotbar,
	Hunger,
	InscriptionLevel,
	Inventory,
	MiningState,
	MoveInput,
	PhysicsBody,
	PlayerState,
	PlayerTag,
	Position,
	QuestProgress,
	RuneDiscovery,
	SagaLog,
	ShelterState,
	Stamina,
	WorkstationProximity,
	WorldTime,
} from "./ecs/traits/index.ts";
import { getJoystickState } from "./engine/behaviors/InputBehavior.ts";
import {
	applyRuneEntries,
	applyVoxelDeltas,
	disableVoxelDeltaTracking,
	enableVoxelDeltaTracking,
	getBlockHighlight,
	getRuneIndexEntries,
	getTravelAnchors,
	initGame,
	kootaWorld,
	placeBlock,
	readPlayerStateForSave,
	releasePointerLock,
	requestPointerLock,
	restorePlayerState,
	setGamePaused,
	travelToAnchor,
} from "./engine/game.ts";
import { isMobile } from "./engine/input-config.ts";
import type { PredictionContext } from "./engine/runes/rune-predictor.ts";
import { topPredictions } from "./engine/runes/rune-predictor.ts";
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
} from "./persistence/db.ts";
import { CraftingMenu } from "./ui/components/CraftingMenu.tsx";
import { BokIndicator } from "./ui/hud/BokIndicator.tsx";
import { Crosshair } from "./ui/hud/Crosshair.tsx";
import { DamageVignette } from "./ui/hud/DamageVignette.tsx";
import { EtchingSurface } from "./ui/hud/EtchingSurface.tsx";
import { HotbarDisplay } from "./ui/hud/HotbarDisplay.tsx";
import { HungerOverlay } from "./ui/hud/HungerOverlay.tsx";
import { triggerGameHaptic } from "./ui/hud/haptics.ts";
import { MicroGoalHint } from "./ui/hud/MicroGoalHint.tsx";
import { MobileControls } from "./ui/hud/MobileControls.tsx";
import type { MobileButtonId } from "./ui/hud/mobile-controls-data.ts";
import { ResumeBanner } from "./ui/hud/ResumeBanner.tsx";
import { UnderwaterOverlay } from "./ui/hud/UnderwaterOverlay.tsx";
import { VitalsBar } from "./ui/hud/VitalsBar.tsx";
import type { MapData } from "./ui/screens/BokScreen.tsx";
import { BokScreen } from "./ui/screens/BokScreen.tsx";
import { DeathScreen } from "./ui/screens/DeathScreen.tsx";
import { TitleScreen } from "./ui/screens/TitleScreen.tsx";
import type { RecipeTier } from "./world/blocks.ts";
import { RECIPES } from "./world/blocks.ts";
import { biomeAt } from "./world/landmark-generator.ts";

type GamePhase = "title" | "playing" | "dead";

export default function App() {
	const [phase, setPhase] = useState<GamePhase>("title");
	const [craftingOpen, setCraftingOpen] = useState(false);
	const [bokOpen, setBokOpen] = useState(false);
	const mobileMode = isMobile();
	const prevDamageFlashRef = useRef(0);
	const [hasSaveSlot, setHasSaveSlot] = useState(false);
	const saveSlotRef = useRef<number | null>(null);
	const saveSeedRef = useRef<string>("");
	const [mapData, setMapData] = useState<MapData | null>(null);
	const [codexData, setCodexData] = useState<{
		creatureProgress: Record<string, number>;
		loreEntryIds: string[];
		discoveredRecipeCount: number;
		discoveredRuneIds: number[];
	} | null>(null);
	const [ledgerItems, setLedgerItems] = useState<Record<number, number> | null>(null);
	const [sagaData, setSagaData] = useState<import("./ui/components/BokSaga.tsx").BokSagaProps | null>(null);
	const [showVitalsBars, setShowVitalsBars] = useState(() => {
		try {
			return localStorage.getItem("bok-show-vitals") !== "false";
		} catch {
			return true;
		}
	});
	const lastSeenSagaCountRef = useRef(0);
	const [resumeContext, setResumeContext] = useState<ResumeContext | null>(null);
	const [microGoal, setMicroGoal] = useState<import("./ecs/systems/micro-goals.ts").MicroGoal | null>(null);
	const recentRunePlacementsRef = useRef<RuneIdValue[]>([]);
	const runePlacementCountsRef = useRef<Record<number, number>>({});

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
		workstationTier: 0 as RecipeTier,
		sagaEntryCount: 0,
		chiselWheelOpen: false,
		chiselSelectedX: 0,
		chiselSelectedY: 0,
		chiselSelectedZ: 0,
		chiselSelectedFace: -1 as number,
		discoveredRunes: [] as number[],
		etchingActive: false,
		etchingRuneId: 0 as number,
		etchingBlockX: 0,
		etchingBlockY: 0,
		etchingBlockZ: 0,
		etchingFaceIndex: -1 as number,
		lookingAtBlock: false,
		joystickActive: false,
		joystickX: 0,
		joystickY: 0,
		joystickCenterX: 0,
		joystickCenterY: 0,
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
					WorkstationProximity,
				)
				.readEach(([health, hunger, stamina, inv, hotbar, mining, quest, state, body, ws]) => {
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
						workstationTier: ws.maxTier as RecipeTier,
					};

					if (state.isDead) {
						setPhase("dead");
					}
				});

			kootaWorld.query(PlayerTag, ChiselState).readEach(([chisel]) => {
				playerUpdate.chiselWheelOpen = chisel.wheelOpen;
				playerUpdate.chiselSelectedX = chisel.selectedX;
				playerUpdate.chiselSelectedY = chisel.selectedY;
				playerUpdate.chiselSelectedZ = chisel.selectedZ;
				playerUpdate.chiselSelectedFace = chisel.selectedFace;
			});

			kootaWorld.query(PlayerTag, RuneDiscovery).readEach(([disc]) => {
				playerUpdate.discoveredRunes = [...disc.discovered];
			});

			kootaWorld.query(PlayerTag, EtchingState).readEach(([etching]) => {
				playerUpdate.etchingActive = etching.active;
				playerUpdate.etchingRuneId = etching.selectedRuneId;
				playerUpdate.etchingBlockX = etching.blockX;
				playerUpdate.etchingBlockY = etching.blockY;
				playerUpdate.etchingBlockZ = etching.blockZ;
				playerUpdate.etchingFaceIndex = etching.faceIndex;
			});

			kootaWorld.query(WorldTime).readEach(([time]) => {
				timeUpdate = {
					timeOfDay: time.timeOfDay,
					dayCount: time.dayCount,
				};
			});

			// Saga entry count — read every frame for rune glow indicator
			kootaWorld.query(PlayerTag, SagaLog).readEach(([saga]) => {
				playerUpdate.sagaEntryCount = saga.entries.length;
			});

			// Block highlight — are we looking at a block?
			playerUpdate.lookingAtBlock = getBlockHighlight()?.lastHit != null;

			// Joystick visual state — polled from InputBehavior module cache
			if (mobileMode) {
				const joy = getJoystickState();
				playerUpdate.joystickActive = joy.active;
				playerUpdate.joystickX = joy.offsetX;
				playerUpdate.joystickY = joy.offsetY;
				playerUpdate.joystickCenterX = joy.centerX;
				playerUpdate.joystickCenterY = joy.centerY;
			}

			// Map + codex data — only read when bok is open
			if (bokOpen) {
				kootaWorld.query(PlayerTag, Position, ExploredChunks).readEach(([pos, explored]) => {
					const [pcx, pcz] = worldToChunk(pos.x, pos.z);
					setMapData({
						visited: explored.visited,
						playerCx: pcx,
						playerCz: pcz,
						biomeAt: (cx, cz) => biomeAt(cx * 16 + 8, cz * 16 + 8),
						landmarks: getDiscoveredLandmarks(),
						travelAnchors: getTravelAnchors(),
					});
				});
				kootaWorld.query(PlayerTag, Codex).readEach(([codex]) => {
					let runeIds: number[] = [];
					kootaWorld.query(PlayerTag, RuneDiscovery).readEach(([disc]) => {
						runeIds = [...disc.discovered];
					});
					setCodexData({
						creatureProgress: { ...codex.creatureProgress },
						loreEntryIds: [...codex.loreEntries],
						discoveredRecipeCount: codex.discoveredRecipes.size,
						discoveredRuneIds: runeIds,
					});
				});
				kootaWorld.query(PlayerTag, Inventory).readEach(([inv]) => {
					setLedgerItems({ ...inv.items });
				});
				kootaWorld
					.query(PlayerTag, SagaLog, InscriptionLevel, ShelterState, Codex)
					.readEach(([saga, inscription, shelter, codex]) => {
						const dayCount = timeUpdate.dayCount ?? hudState.dayCount ?? 1;
						setSagaData({
							entries: [...saga.entries],
							activeObjective: computeActiveObjective(
								dayCount,
								shelter.inShelter,
								saga.creaturesKilled > 0,
								saga.achieved,
							),
							stats: computeSagaStats(
								dayCount,
								inscription.totalBlocksPlaced,
								inscription.totalBlocksMined,
								codex.creatureProgress,
							),
						});
					});
			}

			// Haptic feedback on damage (edge detection)
			if (mobileMode && playerUpdate.damageFlash != null) {
				if (playerUpdate.damageFlash > prevDamageFlashRef.current) {
					triggerGameHaptic("damage");
				}
				prevDamageFlashRef.current = playerUpdate.damageFlash;
			}

			setHudState((prev) => ({
				...prev,
				...playerUpdate,
				...timeUpdate,
			}));

			raf = requestAnimationFrame(poll);
		};
		raf = requestAnimationFrame(poll);
		return () => cancelAnimationFrame(raf);
	}, [phase, bokOpen, hudState.dayCount]);

	// Micro-goal scan — throttled to every 2 seconds
	useEffect(() => {
		if (phase !== "playing") return;

		const scan = () => {
			let pcx = 0;
			let pcz = 0;
			let visited: ReadonlySet<number> = new Set();
			let inShelter = false;
			let wsTier = 0;
			let discoveredCount = 0;
			let hasCreature = false;

			kootaWorld
				.query(PlayerTag, Position, ExploredChunks, ShelterState, WorkstationProximity)
				.readEach(([pos, explored, shelter, ws]) => {
					[pcx, pcz] = worldToChunk(pos.x, pos.z);
					visited = explored.visited;
					inShelter = shelter.inShelter;
					wsTier = ws.maxTier;
				});

			kootaWorld.query(PlayerTag, RuneDiscovery).readEach(([disc]) => {
				discoveredCount = disc.discovered.size;
			});

			// Check if any creature exists (simple presence check)
			kootaWorld.query(CreatureTag, Position).readEach(() => {
				hasCreature = true;
			});

			const undiscoveredRunes = PLACEABLE_RUNES.length - discoveredCount;
			const goal = findMicroGoal(
				pcx,
				pcz,
				visited,
				hudState.timeOfDay,
				inShelter,
				hasCreature,
				undiscoveredRunes,
				wsTier,
			);
			setMicroGoal(goal);
		};

		scan();
		const interval = setInterval(scan, 2000);
		return () => clearInterval(interval);
	}, [phase, hudState.timeOfDay]);

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

	// Auto-save every 60 seconds while playing
	useEffect(() => {
		if (phase !== "playing") return;

		const interval = setInterval(() => {
			performSave();
		}, AUTO_SAVE_INTERVAL_MS);
		return () => clearInterval(interval);
	}, [phase, performSave]);

	// Pause + quick-save on tab hidden, resume on visible
	useEffect(() => {
		if (phase !== "playing") return;

		const onVisibilityChange = () => {
			if (document.hidden) {
				setGamePaused(true);
				performSave();
			} else {
				setGamePaused(false);
			}
		};
		document.addEventListener("visibilitychange", onVisibilityChange);
		return () => document.removeEventListener("visibilitychange", onVisibilityChange);
	}, [phase, performSave]);

	// Disable voxel delta tracking when leaving playing phase
	useEffect(() => {
		if (phase !== "playing") {
			disableVoxelDeltaTracking();
		}
		return () => disableVoxelDeltaTracking();
	}, [phase]);

	// Keyboard listener for crafting (E) and bok (B) toggle
	useEffect(() => {
		if (phase !== "playing") return;

		const onKey = (e: KeyboardEvent) => {
			if (e.code === "KeyE") {
				setBokOpen(false);
				setCraftingOpen((prev) => {
					const next = !prev;
					if (next) {
						releasePointerLock();
					} else {
						requestPointerLock();
					}
					return next;
				});
			}
			if (e.code === "KeyB") {
				setCraftingOpen(false);
				setBokOpen((prev) => {
					const next = !prev;
					if (next) {
						releasePointerLock();
						lastSeenSagaCountRef.current = hudState.sagaEntryCount;
					} else {
						requestPointerLock();
					}
					return next;
				});
			}
			if (e.code === "KeyV") {
				setShowVitalsBars((prev) => {
					const next = !prev;
					try {
						localStorage.setItem("bok-show-vitals", String(next));
					} catch {
						/* localStorage unavailable */
					}
					return next;
				});
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [phase, hudState.sagaEntryCount]);

	const handleStartGame = useCallback(async (seed: string) => {
		const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
		if (!canvas) return;

		try {
			await initDatabase();
			await initGame(canvas, seed);
			saveSeedRef.current = seed;

			// Create save slot and wire delta tracking
			const slotId = await createSaveSlot(seed);
			saveSlotRef.current = slotId;
			enableVoxelDeltaTracking((x, y, z, blockId) => {
				saveVoxelDelta(slotId, x, y, z, blockId).catch((err) => console.error("Delta save failed:", err));
			});

			setPhase("playing");
		} catch (err) {
			console.error("Failed to start game:", err);
		}
	}, []);

	const handleContinueGame = useCallback(async () => {
		const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
		if (!canvas) return;

		try {
			await initDatabase();
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

			// Restore rune inscriptions
			const runeEntries = await loadRuneFaces(slot.id);
			if (runeEntries.length > 0) {
				applyRuneEntries(runeEntries);
			}

			// Wire delta tracking for new changes
			enableVoxelDeltaTracking((x, y, z, blockId) => {
				saveVoxelDelta(slot.id, x, y, z, blockId).catch((err) => console.error("Delta save failed:", err));
			});

			// Generate resume context from restored state
			let sagaEntries: Array<{ text: string }> = [];
			let inShelter = false;
			let hasKilled = false;
			let achieved = new Set<string>();
			kootaWorld.query(PlayerTag, SagaLog, ShelterState).readEach(([saga, shelter]) => {
				sagaEntries = saga.entries;
				inShelter = shelter.inShelter;
				hasKilled = saga.creaturesKilled > 0;
				achieved = saga.achieved;
			});
			const objective = computeActiveObjective(playerData.dayCount, inShelter, hasKilled, achieved);
			setResumeContext(
				generateResumeContext(
					playerData.dayCount,
					playerData.timeOfDay,
					playerData.health,
					playerData.hunger,
					inShelter,
					sagaEntries,
					objective?.text ?? null,
				),
			);

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

	// ─── Etching: inscribe callback (from EtchingSurface) ───
	const handleInscribe = useCallback(
		(runeId: RuneIdValue, _score: number) => {
			const { etchingBlockX, etchingBlockY, etchingBlockZ, etchingFaceIndex } = hudState;
			if (etchingFaceIndex < 0) return;

			const effects = { spawnParticles: () => {} };
			placeRune(
				kootaWorld,
				etchingBlockX,
				etchingBlockY,
				etchingBlockZ,
				etchingFaceIndex as FaceIndex,
				runeId,
				effects,
			);

			// Track for prediction context
			recentRunePlacementsRef.current = [runeId, ...recentRunePlacementsRef.current.slice(0, 9)];
			runePlacementCountsRef.current[runeId] = (runePlacementCountsRef.current[runeId] ?? 0) + 1;

			// Close etching + return camera
			kootaWorld.query(PlayerTag, EtchingState).updateEach(([etching]) => {
				etching.active = false;
				etching.faceIndex = -1;
			});
			kootaWorld.query(PlayerTag, ChiselState).updateEach(([chisel]) => {
				chisel.selectedFace = -1;
			});
			kootaWorld.query(PlayerTag, CameraTransition).updateEach(([ct]) => {
				ct.active = false;
			});
		},
		[hudState],
	);

	const handleEtchCancel = useCallback(() => {
		kootaWorld.query(PlayerTag, EtchingState).updateEach(([etching]) => {
			etching.active = false;
			etching.faceIndex = -1;
		});
		kootaWorld.query(PlayerTag, ChiselState).updateEach(([chisel]) => {
			chisel.selectedFace = -1;
		});
		kootaWorld.query(PlayerTag, CameraTransition).updateEach(([ct]) => {
			ct.active = false;
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

	// ─── Mobile button handlers ───

	const handleMobilePress = useCallback(
		(id: MobileButtonId) => {
			triggerGameHaptic(id === "mine" ? "mine" : id === "place" ? "place" : "jump");
			if (id === "mine") {
				kootaWorld.query(PlayerTag, MiningState).updateEach(([mining]) => {
					mining.active = true;
				});
			} else if (id === "place") {
				placeBlock();
			} else if (id === "jump") {
				kootaWorld.query(PlayerTag, MoveInput).updateEach(([move]) => {
					move.jump = true;
				});
			} else if (id === "bok") {
				setCraftingOpen(false);
				lastSeenSagaCountRef.current = hudState.sagaEntryCount;
				setBokOpen((prev) => !prev);
			} else if (id === "inventory") {
				setBokOpen(false);
				setCraftingOpen((prev) => !prev);
			}
		},
		[hudState.sagaEntryCount],
	);

	const handleMobileRelease = useCallback((id: MobileButtonId) => {
		if (id === "mine") {
			kootaWorld.query(PlayerTag, MiningState).updateEach(([mining]) => {
				mining.active = false;
			});
		} else if (id === "jump") {
			kootaWorld.query(PlayerTag, MoveInput).updateEach(([move]) => {
				move.jump = false;
			});
		}
	}, []);

	return (
		<>
			{/* Overlays */}
			{phase === "playing" && (
				<>
					<HungerOverlay hunger={hudState.hunger} />
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
						<Crosshair
							isMining={hudState.miningActive}
							miningProgress={hudState.miningProgress}
							lookingAtBlock={hudState.lookingAtBlock}
						/>

						<ResumeBanner context={resumeContext} onDismiss={() => setResumeContext(null)} />
						<MicroGoalHint goal={!resumeContext ? microGoal : null} />

						<div className="absolute top-4 right-4 flex items-center gap-3">
							<BokIndicator
								hasNewInfo={hudState.sagaEntryCount > lastSeenSagaCountRef.current}
								onOpen={() => {
									setCraftingOpen(false);
									lastSeenSagaCountRef.current = hudState.sagaEntryCount;
									setBokOpen((prev) => {
										const next = !prev;
										if (next) {
											releasePointerLock();
										} else {
											requestPointerLock();
										}
										return next;
									});
								}}
							/>
						</div>

						<div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
							<VitalsBar
								health={hudState.health}
								hunger={hudState.hunger}
								stamina={hudState.stamina}
								hungerSlowed={hudState.hungerSlowed}
								visible={showVitalsBars}
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
							maxTier={hudState.workstationTier}
							onCraft={handleCraft}
							onClose={() => {
								setCraftingOpen(false);
								requestPointerLock();
							}}
						/>

						{hudState.etchingActive &&
							(() => {
								const predCtx: PredictionContext = {
									discovered: hudState.discoveredRunes as RuneIdValue[],
									recentPlacements: recentRunePlacementsRef.current,
									adjacentRunes: [],
									placementCounts: runePlacementCountsRef.current,
								};
								return (
									<EtchingSurface
										predictions={topPredictions(predCtx)}
										discoveredRunes={hudState.discoveredRunes as RuneIdValue[]}
										onInscribe={handleInscribe}
										onCancel={handleEtchCancel}
										isTouch={mobileMode}
									/>
								);
							})()}

						<BokScreen
							isOpen={bokOpen}
							onClose={() => {
								setBokOpen(false);
								requestPointerLock();
							}}
							mapData={mapData ?? undefined}
							codexData={codexData ?? undefined}
							ledgerData={ledgerItems ? { items: ledgerItems } : undefined}
							sagaData={sagaData ?? undefined}
							travelData={{
								dustAvailable: hudState.inventory.items[CRYSTAL_DUST_ID] ?? 0,
								onTravel: (anchor, cost) => {
									const success = travelToAnchor(anchor, cost);
									if (success) {
										setBokOpen(false);
										requestPointerLock();
									}
									return success;
								},
							}}
						/>

						{mobileMode && (
							<MobileControls
								joystickActive={hudState.joystickActive}
								joystickX={hudState.joystickX}
								joystickY={hudState.joystickY}
								joystickCenterX={hudState.joystickCenterX}
								joystickCenterY={hudState.joystickCenterY}
								onButtonPress={handleMobilePress}
								onButtonRelease={handleMobileRelease}
							/>
						)}
					</>
				)}
			</div>
		</>
	);
}
