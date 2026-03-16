import type { World } from "koota";
import { createWorld } from "koota";
import type { AiTypeId, SpeciesId } from "./ecs/traits/index.ts";
import {
	AiType,
	AnimState,
	BehaviorState,
	CookingState,
	CreatureAI,
	CreatureAnimation,
	CreatureHealth,
	CreatureTag,
	CreatureType,
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
	Rotation,
	Species,
	Stamina,
	ToolSwing,
	Velocity,
	WorldSeed,
	WorldTime,
} from "./ecs/traits/index.ts";

/**
 * Create a fresh Koota world with optional world-level traits.
 * Worlds are cheap — create one per test for isolation.
 */
export function createTestWorld(): World {
	return createWorld();
}

/** Default values for spawning a player entity. Override any field. */
export interface PlayerOverrides {
	health?: Partial<{ current: number; max: number }>;
	hunger?: Partial<{ current: number; max: number; decayRate: number }>;
	stamina?: Partial<{ current: number; max: number; regenRate: number }>;
	moveInput?: Partial<{
		forward: boolean;
		backward: boolean;
		left: boolean;
		right: boolean;
		jump: boolean;
		sprint: boolean;
	}>;
	playerState?: Partial<{
		isRunning: boolean;
		isDead: boolean;
		damageFlash: number;
		shakeX: number;
		shakeY: number;
		hungerSlowed: boolean;
		wantsEat: boolean;
	}>;
	position?: Partial<{ x: number; y: number; z: number }>;
	velocity?: Partial<{ x: number; y: number; z: number }>;
	rotation?: Partial<{ pitch: number; yaw: number }>;
	physics?: Partial<{
		onGround: boolean;
		isSwimming: boolean;
		gravity: number;
		width: number;
		height: number;
		depth: number;
	}>;
	inscription?: Partial<{
		totalBlocksPlaced: number;
		totalBlocksMined: number;
		structuresBuilt: number;
	}>;
}

/**
 * Spawn a player entity with all standard traits.
 * Pass overrides to customize initial trait values for specific test scenarios.
 */
export function spawnPlayer(world: World, overrides: PlayerOverrides = {}) {
	return world.spawn(
		PlayerTag,
		Position(overrides.position ?? {}),
		Velocity(overrides.velocity ?? {}),
		Rotation(overrides.rotation ?? {}),
		Health(overrides.health ?? {}),
		Hunger(overrides.hunger ?? {}),
		Stamina(overrides.stamina ?? {}),
		MoveInput(overrides.moveInput ?? {}),
		PlayerState(overrides.playerState ?? {}),
		PhysicsBody(overrides.physics ?? {}),
		ToolSwing(),
		MiningState(),
		Inventory(),
		Hotbar(),
		QuestProgress(),
		CookingState(),
		InscriptionLevel(overrides.inscription ?? {}),
	);
}

/** Spawn a world-time entity (for timeSystem tests). */
export function spawnWorldTime(
	world: World,
	overrides: Partial<{ timeOfDay: number; dayDuration: number; dayCount: number }> = {},
) {
	return world.spawn(WorldTime(overrides));
}

/** Spawn a world-seed entity. */
export function spawnWorldSeed(world: World, seed = "test-seed") {
	return world.spawn(WorldSeed({ seed }));
}

/** Override options for spawning a creature entity. */
export interface CreatureOverrides {
	species?: SpeciesId;
	aiType?: AiTypeId;
	hp?: number;
	maxHp?: number;
	aggroRange?: number;
	attackRange?: number;
	attackDamage?: number;
	moveSpeed?: number;
	detectionRange?: number;
	position?: Partial<{ x: number; y: number; z: number }>;
}

/** Spawn a creature entity with all creature traits. Defaults to a Mörker. */
export function spawnCreature(world: World, overrides: CreatureOverrides = {}) {
	return world.spawn(
		CreatureTag,
		Position(overrides.position ?? {}),
		CreatureType({ species: overrides.species ?? Species.Morker }),
		CreatureAI({
			aiType: overrides.aiType ?? AiType.Hostile,
			behaviorState: BehaviorState.Idle,
			targetEntity: -1,
			aggroRange: overrides.aggroRange ?? 15,
			attackRange: overrides.attackRange ?? 1.5,
			attackDamage: overrides.attackDamage ?? 15,
			attackCooldown: 0,
			moveSpeed: overrides.moveSpeed ?? 2.5,
			detectionRange: overrides.detectionRange ?? 15,
		}),
		CreatureAnimation({
			animState: AnimState.Idle,
			animTimer: 0,
			variant: 0,
		}),
		CreatureHealth({
			hp: overrides.hp ?? 6,
			maxHp: overrides.maxHp ?? 6,
			velY: 0,
			meshIndex: -1,
		}),
	);
}
