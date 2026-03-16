import { trait } from "koota";
import { BlockId } from "../../world/blocks.ts";

// ─── Player Traits ───
export const PlayerTag = trait();

export const Position = trait({ x: 0, y: 0, z: 0 });
export const Velocity = trait({ x: 0, y: 0, z: 0 });
export const Rotation = trait({ pitch: 0, yaw: 0 });

export const Health = trait({ current: 100, max: 100 });
export const Hunger = trait({ current: 100, max: 100, decayRate: 0.4 });
export const Stamina = trait({ current: 100, max: 100, regenRate: 15 });

export const PhysicsBody = trait({
	onGround: false,
	isSwimming: false,
	gravity: 28,
	width: 0.6,
	height: 1.6,
	depth: 0.6,
});

export const MoveInput = trait({
	forward: false,
	backward: false,
	left: false,
	right: false,
	jump: false,
	sprint: false,
});

export const PlayerState = trait({
	isRunning: false,
	isDead: false,
	damageFlash: 0,
	/** Camera shake offset (applied then decayed each frame) */
	shakeX: 0,
	shakeY: 0,
	/** True when hunger is below the slow threshold (20%). Read by movement + UI. */
	hungerSlowed: false,
	/** Set to true by UI/input to request eating the active hotbar item. */
	wantsEat: false,
});

// ─── Camera Traits ───
export const CameraTag = trait();
export const CameraFollow = trait({
	targetEntity: 0,
	smoothing: 10,
});

// ─── Inventory & Crafting ───
export type { InventoryData } from "../inventory.ts";

export const Inventory = trait((): import("../inventory.ts").InventoryData => ({
	items: {},
	capacity: 256,
}));

export type BlockIdValue = (typeof BlockId)[keyof typeof BlockId];
export type HotbarSlot = { id: BlockIdValue; type: "block" } | { id: number; type: "item"; durability?: number };

export interface HotbarState {
	slots: (HotbarSlot | null)[];
	activeSlot: number;
}

export const Hotbar = trait(
	(): HotbarState => ({
		slots: [
			{ id: BlockId.Wood, type: "block" },
			{ id: BlockId.Sand, type: "block" },
			{ id: BlockId.StoneBricks, type: "block" },
			{ id: BlockId.Glass, type: "block" },
			{ id: BlockId.Torch, type: "block" },
		],
		activeSlot: 0,
	}),
);

// ─── Mining ───
export const MiningState = trait({
	active: false,
	progress: 0,
	targetX: 0,
	targetY: 0,
	targetZ: 0,
	targetKey: "",
	lastHitTime: 0,
});

// ─── Quest / Progression ───
export const QuestProgress = trait({
	step: 0,
	progress: 0,
});

// ─── World / Time ───
export const WorldTime = trait({
	timeOfDay: 0.25,
	dayDuration: 240,
	dayCount: 1,
});

export const WorldSeed = trait({ seed: "" });

// ─── World Events ───

/** Norrsken (Northern Lights) event state — singleton trait. */
export const NorrskenEvent = trait({
	/** Whether the aurora is currently active. */
	active: false,
	/** Seconds remaining in the current event. */
	timer: 0,
	/** dayCount when last triggered (prevents re-trigger same night). */
	dayTriggered: -1,
	/** Whether we were in night last frame (for edge detection). */
	wasNight: false,
});

// ─── Creature Traits ───

/** All creature species in the game, from Swedish folklore. */
export const Species = {
	Morker: "morker",
	Lyktgubbe: "lyktgubbe",
	Skogssnigle: "skogssnigle",
	Trana: "trana",
	Vittra: "vittra",
	Nacken: "nacken",
	Runvaktare: "runvaktare",
	Lindorm: "lindorm",
	Draug: "draug",
	Jatten: "jatten",
} as const;
export type SpeciesId = (typeof Species)[keyof typeof Species];

/** AI archetype controlling base behavior tree. */
export const AiType = {
	Passive: "passive",
	Neutral: "neutral",
	Hostile: "hostile",
	Boss: "boss",
} as const;
export type AiTypeId = (typeof AiType)[keyof typeof AiType];

/** Behavior state for AI state machine. */
export const BehaviorState = {
	Idle: 0,
	Chase: 1,
	Attack: 2,
	Flee: 3,
} as const;
export type BehaviorStateId = (typeof BehaviorState)[keyof typeof BehaviorState];

/** Animation states for creature visual feedback. */
export const AnimState = {
	Idle: "idle",
	Walk: "walk",
	Chase: "chase",
	Attack: "attack",
	Flee: "flee",
	Burn: "burn",
} as const;
export type AnimStateId = (typeof AnimState)[keyof typeof AnimState];

export const CreatureTag = trait();

export const CreatureType = trait((): { species: SpeciesId } => ({
	species: Species.Morker,
}));

export const CreatureAI = trait(
	(): {
		aiType: AiTypeId;
		behaviorState: BehaviorStateId;
		targetEntity: number;
		aggroRange: number;
		attackRange: number;
		attackDamage: number;
		attackCooldown: number;
		moveSpeed: number;
		detectionRange: number;
	} => ({
		aiType: AiType.Hostile,
		behaviorState: BehaviorState.Idle,
		targetEntity: -1,
		aggroRange: 15,
		attackRange: 1.5,
		attackDamage: 15,
		attackCooldown: 0,
		moveSpeed: 2.5,
		detectionRange: 15,
	}),
);

export const CreatureAnimation = trait(
	(): {
		animState: AnimStateId;
		animTimer: number;
		variant: number;
	} => ({
		animState: AnimState.Idle,
		animTimer: 0,
		variant: 0,
	}),
);

export const CreatureHealth = trait({
	hp: 6,
	maxHp: 6,
	velY: 0,
	meshIndex: -1,
});

// ─── Legacy aliases (kept for backward compatibility during migration) ───
export const EnemyTag = CreatureTag;
export const EnemyState = CreatureHealth;

// ─── Cooking ───
export const CookingState = trait({
	/** Whether a cooking operation is in progress. */
	active: false,
	/** Seconds remaining until cooking completes. */
	timer: 0,
	/** The raw food item being cooked. */
	inputId: 0,
	/** The resulting cooked item. */
	resultId: 0,
});

// ─── Workstation Proximity ───
export const WorkstationProximity = trait({
	/** Highest workstation tier within scan radius. 0 = hand-craft only. */
	maxTier: 0 as 0 | 1 | 2 | 3,
});

// ─── Inscription Level ───

/** Tracks how much the player has modified the world. */
export const InscriptionLevel = trait({
	totalBlocksPlaced: 0,
	totalBlocksMined: 0,
	structuresBuilt: 0,
});

// ─── Shelter / Structure ───

/** Tracks whether the player is inside an enclosed structure. */
export const ShelterState = trait({
	/** True when player is inside a fully enclosed space. */
	inShelter: false,
	/** Volume (air blocks) of the current structure. 0 if not sheltered. */
	structureVolume: 0,
	/** Falu red blocks found in structure walls or nearby. */
	faluRedCount: 0,
	/** Mörker spawn radius multiplier (1 = normal, lower = reduced). */
	morkerSpawnMult: 1,
});

// ─── Exploration ───

/** Tracks which chunks the player has visited. Uses packed ints (cx * 65536 + cz). */
export const ExploredChunks = trait((): { visited: Set<number> } => ({
	visited: new Set(),
}));

// ─── Codex (Knowledge) ───

export interface CodexData {
	/** Observation progress per species id. Range [0, 1]. */
	creatureProgress: Record<string, number>;
	/** Collected lore entry IDs. */
	loreEntries: Set<string>;
	/** Recipe IDs discovered through exploration. */
	discoveredRecipes: Set<number>;
}

export const Codex = trait(
	(): CodexData => ({
		creatureProgress: {},
		loreEntries: new Set(),
		discoveredRecipes: new Set(),
	}),
);

// ─── Tool Swing / ViewModel ───
export const ToolSwing = trait({
	progress: 0,
	swayX: 0,
	swayY: 0,
	targetSwayX: 0,
	targetSwayY: 0,
});
