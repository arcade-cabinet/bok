import type { World } from "koota";
import { getVoxelAt, isBlockSolid } from "../../world/voxel-helpers.ts";
import { EnemyState, EnemyTag, Health, PlayerState, PlayerTag, Position, WorldTime } from "../traits/index.ts";

const MAX_ENEMIES = 8;
const SPAWN_DISTANCE = 20;
const DESPAWN_DISTANCE = 50;
const CHASE_RANGE = 15;
const ATTACK_RANGE = 1.5;
const CHASE_SPEED = 2.5;
const ATTACK_DAMAGE = 15;
const ATTACK_COOLDOWN = 1.0;
const DAYTIME_DPS = 2;
const GRAVITY = 28;
const SPAWN_CHANCE = 0.01; // per frame

export interface EnemySideEffects {
	spawnParticles: (x: number, y: number, z: number, color: string | number, count: number) => void;
	onEnemySpawned: (entityId: number) => void;
	onEnemyDied: (entityId: number) => void;
}

export function enemySystem(world: World, dt: number, effects?: EnemySideEffects) {
	let timeOfDay = 0.25;
	world.query(WorldTime).readEach(([time]) => {
		timeOfDay = time.timeOfDay;
	});

	const isDaytime = timeOfDay > 0.25 && timeOfDay < 0.75;

	// Get player position
	let px = 0,
		pz = 0;
	let playerAlive = false;
	world.query(PlayerTag, Position, PlayerState).readEach(([pos, state]) => {
		px = pos.x;
		pz = pos.z;
		playerAlive = !state.isDead;
	});

	// Count current enemies
	let enemyCount = 0;
	world.query(EnemyTag).readEach(() => {
		enemyCount++;
	});

	// Spawn enemies at night
	if (!isDaytime && playerAlive && enemyCount < MAX_ENEMIES && Math.random() < SPAWN_CHANCE) {
		const angle = Math.random() * Math.PI * 2;
		const spawnX = px + Math.cos(angle) * SPAWN_DISTANCE;
		const spawnZ = pz + Math.sin(angle) * SPAWN_DISTANCE;

		// Find surface Y at spawn position
		let spawnY = -1;
		for (let y = 60; y >= 0; y--) {
			const v = getVoxelAt(Math.floor(spawnX), y, Math.floor(spawnZ));
			if (v > 0 && isBlockSolid(v)) {
				spawnY = y + 2;
				break;
			}
		}

		if (spawnY > 0) {
			const entity = world.spawn(
				EnemyTag,
				Position({ x: spawnX, y: spawnY, z: spawnZ }),
				EnemyState({ hp: 6, velY: 0, aiState: 0, attackCooldown: 0, meshIndex: -1 }),
			);
			effects?.onEnemySpawned(entity.id());
		}
	}

	// Update existing enemies
	world.query(EnemyTag, EnemyState, Position).updateEach(([enemy, pos], entity) => {
		const dx = px - pos.x;
		const dz = pz - pos.z;
		const dist = Math.sqrt(dx * dx + dz * dz);

		// Despawn if too far
		if (dist > DESPAWN_DISTANCE) {
			effects?.onEnemyDied(entity.id());
			entity.destroy();
			return;
		}

		// Daytime burn damage
		if (isDaytime) {
			enemy.hp -= DAYTIME_DPS * dt;
		}

		// Gravity
		enemy.velY -= GRAVITY * dt;
		pos.y += enemy.velY * dt;

		// Ground collision
		const feetX = Math.floor(pos.x);
		const feetZ = Math.floor(pos.z);
		const feetY = Math.floor(pos.y - 1);
		if (feetY >= 0) {
			const below = getVoxelAt(feetX, feetY, feetZ);
			if (below > 0 && isBlockSolid(below)) {
				pos.y = feetY + 1;
				enemy.velY = 0;
			}
		}
		if (pos.y < 0) {
			pos.y = 0;
			enemy.velY = 0;
		}

		// AI state machine
		enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);

		if (dist <= ATTACK_RANGE && playerAlive) {
			// Attack
			enemy.aiState = 2;
			if (enemy.attackCooldown <= 0) {
				enemy.attackCooldown = ATTACK_COOLDOWN;
				// Deal damage to player
				world.query(PlayerTag, Health, PlayerState).updateEach(([health, state]) => {
					health.current = Math.max(0, health.current - ATTACK_DAMAGE);
					state.damageFlash = 1.0;
					state.shakeX = (Math.random() - 0.5) * 0.1;
					state.shakeY = -0.15;
				});
			}
		} else if (dist <= CHASE_RANGE && playerAlive) {
			// Chase
			enemy.aiState = 1;
			const invDist = 1 / Math.max(dist, 0.01);
			const moveX = dx * invDist * CHASE_SPEED * dt;
			const moveZ = dz * invDist * CHASE_SPEED * dt;

			pos.x += moveX;
			pos.z += moveZ;

			// Jump over obstacles
			const aheadX = Math.floor(pos.x + dx * invDist * 0.5);
			const aheadZ = Math.floor(pos.z + dz * invDist * 0.5);
			const aheadY = Math.floor(pos.y);
			const aheadBlock = getVoxelAt(aheadX, aheadY, aheadZ);
			if (aheadBlock > 0 && isBlockSolid(aheadBlock) && enemy.velY === 0) {
				enemy.velY = 8;
			}
		} else {
			// Idle
			enemy.aiState = 0;
		}

		// Death
		if (enemy.hp <= 0) {
			effects?.spawnParticles(pos.x, pos.y, pos.z, 0xff0000, 20);
			effects?.onEnemyDied(entity.id());
			entity.destroy();
		}
	});
}

/**
 * Handle player hitting an enemy during combat.
 * Called from the mining/combat system when player attacks.
 */
export function damageEnemy(
	world: World,
	entityId: number,
	damage: number,
	effects?: { spawnParticles: (x: number, y: number, z: number, color: string | number, count: number) => void },
) {
	world.query(EnemyTag, EnemyState, Position).updateEach(([enemy, pos], entity) => {
		if (entity.id() === entityId) {
			enemy.hp -= damage;
			effects?.spawnParticles(pos.x, pos.y, pos.z, 0xff0000, 5);
		}
	});
}
