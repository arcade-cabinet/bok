/**
 * Yuka-ECS Bridge — Vehicle pool + sync between Koota ECS and Yuka AI.
 *
 * Yuka is a computation layer: it decides movement via steering behaviors
 * and state machines, then we copy results back into ECS traits.
 * We do NOT use Yuka's EntityManager — manual vehicle.update(dt) calls keep
 * the Koota game loop in control.
 */

import { Vector3, Vehicle } from "yuka";

// ─── Vehicle Pool ───

const vehiclePool = new Map<number, Vehicle>();

/** Get the Yuka Vehicle for an entity, or undefined if not created. */
export function getVehicle(entityId: number): Vehicle | undefined {
	return vehiclePool.get(entityId);
}

/** Check if a vehicle exists for the given entity. */
export function hasVehicle(entityId: number): boolean {
	return vehiclePool.has(entityId);
}

/** Get the entire vehicle pool (read-only iteration). */
export function getAllVehicles(): ReadonlyMap<number, Vehicle> {
	return vehiclePool;
}

// ─── Vehicle Configuration ───

export interface VehicleConfig {
	/** Maximum movement speed (blocks/sec). */
	maxSpeed: number;
	/** Maximum steering force. */
	maxForce: number;
	/** Entity mass (affects acceleration). */
	mass: number;
	/** Bounding radius for obstacle avoidance. */
	boundingRadius?: number;
	/** Initial position. */
	position?: { x: number; y: number; z: number };
}

const DEFAULT_CONFIG: VehicleConfig = {
	maxSpeed: 2.5,
	maxForce: 5.0,
	mass: 1.0,
	boundingRadius: 0.5,
};

// ─── Factory ───

/**
 * Create a Yuka Vehicle for a creature entity.
 * Configures mass, maxSpeed, maxForce, and bounding radius.
 */
export function createCreatureVehicle(entityId: number, config?: Partial<VehicleConfig>): Vehicle {
	const existing = vehiclePool.get(entityId);
	if (existing) return existing;

	const cfg = { ...DEFAULT_CONFIG, ...config };
	const vehicle = new Vehicle();
	vehicle.maxSpeed = cfg.maxSpeed;
	vehicle.maxForce = cfg.maxForce;
	vehicle.mass = cfg.mass;
	vehicle.boundingRadius = cfg.boundingRadius ?? 0.5;

	if (cfg.position) {
		vehicle.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
	}

	vehiclePool.set(entityId, vehicle);
	return vehicle;
}

/**
 * Remove a Yuka Vehicle when a creature is destroyed.
 * Clears all steering behaviors and removes from pool.
 */
export function destroyCreatureVehicle(entityId: number): void {
	const vehicle = vehiclePool.get(entityId);
	if (vehicle) {
		vehicle.steering.clear();
		vehiclePool.delete(entityId);
	}
}

/** Clear the entire vehicle pool (e.g. on world reset). */
export function resetVehiclePool(): void {
	for (const vehicle of vehiclePool.values()) {
		vehicle.steering.clear();
	}
	vehiclePool.clear();
}

// ─── ECS ↔ Yuka Sync ───

/**
 * Copy ECS Position/Velocity into Yuka Vehicle before computing AI.
 * Call this before vehicle.update(dt).
 */
export function syncEcsToYuka(
	entityId: number,
	pos: { x: number; y: number; z: number },
	vel: { x: number; y: number; z: number },
): void {
	const vehicle = vehiclePool.get(entityId);
	if (!vehicle) return;

	vehicle.position.set(pos.x, pos.y, pos.z);
	vehicle.velocity.set(vel.x, vel.y, vel.z);
}

/**
 * Copy Yuka Vehicle results back into ECS after vehicle.update(dt).
 * Only copies horizontal (x, z) position + velocity — gravity is handled by ECS.
 */
export function syncYukaToEcs(
	entityId: number,
	pos: { x: number; y: number; z: number },
	vel: { x: number; y: number; z: number },
): void {
	const vehicle = vehiclePool.get(entityId);
	if (!vehicle) return;

	pos.x = vehicle.position.x;
	// Y is NOT synced — ECS gravity owns vertical movement
	pos.z = vehicle.position.z;

	vel.x = vehicle.velocity.x;
	// vel.y stays as-is (ECS gravity)
	vel.z = vehicle.velocity.z;
}

// ─── Steering Helpers ───

/**
 * Set the target position on all steering behaviors that have a `target` property.
 * Yuka behaviors each have their own target — this updates all of them.
 */
export function setVehicleTarget(entityId: number, tx: number, ty: number, tz: number): void {
	const vehicle = vehiclePool.get(entityId);
	if (!vehicle) return;

	for (const behavior of vehicle.steering.behaviors) {
		if ("target" in behavior && behavior.target instanceof Vector3) {
			(behavior.target as Vector3).set(tx, ty, tz);
		}
	}
}

/**
 * Update a single vehicle's AI step.
 * Call after syncEcsToYuka, before syncYukaToEcs.
 */
export function updateVehicle(entityId: number, dt: number): void {
	const vehicle = vehiclePool.get(entityId);
	if (!vehicle) return;

	// Yuka's vehicle.update() runs the SteeringManager which
	// accumulates forces from all registered behaviors
	vehicle.update(dt);
}

/** Get the pool size (for debugging/tests). */
export function getPoolSize(): number {
	return vehiclePool.size;
}
