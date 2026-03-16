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
});

// ─── Camera Traits ───
export const CameraTag = trait();
export const CameraFollow = trait({
	targetEntity: 0,
	smoothing: 10,
});

// ─── Inventory & Crafting ───
export interface InventoryData {
	wood: number;
	stone: number;
	dirt: number;
	grass: number;
	sand: number;
	glass: number;
	stonebricks: number;
	planks: number;
	torches: number;
}

export const Inventory = trait(
	(): InventoryData => ({
		wood: 0,
		stone: 0,
		dirt: 0,
		grass: 0,
		sand: 0,
		glass: 0,
		stonebricks: 0,
		planks: 0,
		torches: 0,
	}),
);

export type BlockIdValue = (typeof BlockId)[keyof typeof BlockId];
export type HotbarSlot = { id: BlockIdValue; type: "block" } | { id: number; type: "item" };

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

// ─── Tool Swing / ViewModel ───
export const ToolSwing = trait({
	progress: 0,
	swayX: 0,
	swayY: 0,
	targetSwayX: 0,
	targetSwayY: 0,
});
