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

export interface HotbarSlot {
	id: number;
	type: "block" | "item";
}

export const Hotbar = trait((): { slots: (HotbarSlot | null)[]; activeSlot: number } => ({
	slots: [
		{ id: BlockId.Wood, type: "block" },
		{ id: BlockId.Sand, type: "block" },
		{ id: BlockId.StoneBricks, type: "block" },
		{ id: BlockId.Glass, type: "block" },
		{ id: BlockId.Torch, type: "block" },
	],
	activeSlot: 0,
}));

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

// ─── Enemy Traits ───
export const EnemyTag = trait();
export const EnemyState = trait({
	hp: 6,
	/** Vertical velocity for enemy gravity/jumping */
	velY: 0,
});

// ─── Tool Swing / ViewModel ───
export const ToolSwing = trait({
	progress: 0,
	swayX: 0,
	swayY: 0,
	targetSwayX: 0,
	targetSwayY: 0,
});
