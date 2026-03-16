/**
 * Boids flocking algorithm — separation, alignment, cohesion.
 * Pure math — no Three.js dependency. Used by Trana (crane) AI.
 *
 * Classic Reynolds Boids with three steering behaviors:
 * - Separation: avoid crowding neighbors
 * - Alignment: steer towards average heading of neighbors
 * - Cohesion: steer towards average position of neighbors
 */

// ─── Types ───

export interface BoidAgent {
	x: number;
	z: number;
	vx: number;
	vz: number;
}

export interface BoidParams {
	separationWeight: number;
	alignmentWeight: number;
	cohesionWeight: number;
	separationRadius: number;
	neighborRadius: number;
	maxSpeed: number;
	maxForce: number;
}

export interface SteeringForce {
	fx: number;
	fz: number;
}

// ─── Default Parameters ───

export const TRANA_BOID_PARAMS: BoidParams = {
	separationWeight: 1.5,
	alignmentWeight: 1.0,
	cohesionWeight: 1.0,
	separationRadius: 2.0,
	neighborRadius: 8.0,
	maxSpeed: 3.0,
	maxForce: 0.8,
};

// ─── Core Boid Steering ───

/**
 * Compute separation force: steer away from nearby neighbors.
 */
export function separation(agent: BoidAgent, neighbors: BoidAgent[], radius: number): SteeringForce {
	let fx = 0;
	let fz = 0;
	let count = 0;

	for (const n of neighbors) {
		const dx = agent.x - n.x;
		const dz = agent.z - n.z;
		const distSq = dx * dx + dz * dz;
		if (distSq > 0 && distSq < radius * radius) {
			const dist = Math.sqrt(distSq);
			fx += dx / dist / dist;
			fz += dz / dist / dist;
			count++;
		}
	}

	if (count > 0) {
		fx /= count;
		fz /= count;
	}

	return { fx, fz };
}

/**
 * Compute alignment force: steer towards average heading of neighbors.
 */
export function alignment(agent: BoidAgent, neighbors: BoidAgent[], radius: number): SteeringForce {
	let avgVx = 0;
	let avgVz = 0;
	let count = 0;

	for (const n of neighbors) {
		const dx = agent.x - n.x;
		const dz = agent.z - n.z;
		const distSq = dx * dx + dz * dz;
		if (distSq > 0 && distSq < radius * radius) {
			avgVx += n.vx;
			avgVz += n.vz;
			count++;
		}
	}

	if (count === 0) return { fx: 0, fz: 0 };

	avgVx /= count;
	avgVz /= count;

	return { fx: avgVx - agent.vx, fz: avgVz - agent.vz };
}

/**
 * Compute cohesion force: steer towards center of mass of neighbors.
 */
export function cohesion(agent: BoidAgent, neighbors: BoidAgent[], radius: number): SteeringForce {
	let avgX = 0;
	let avgZ = 0;
	let count = 0;

	for (const n of neighbors) {
		const dx = agent.x - n.x;
		const dz = agent.z - n.z;
		const distSq = dx * dx + dz * dz;
		if (distSq > 0 && distSq < radius * radius) {
			avgX += n.x;
			avgZ += n.z;
			count++;
		}
	}

	if (count === 0) return { fx: 0, fz: 0 };

	avgX /= count;
	avgZ /= count;

	return { fx: avgX - agent.x, fz: avgZ - agent.z };
}

/**
 * Compute combined boid steering force from all three behaviors.
 */
export function computeFlockForce(agent: BoidAgent, neighbors: BoidAgent[], params: BoidParams): SteeringForce {
	const sep = separation(agent, neighbors, params.separationRadius);
	const ali = alignment(agent, neighbors, params.neighborRadius);
	const coh = cohesion(agent, neighbors, params.neighborRadius);

	let fx = sep.fx * params.separationWeight + ali.fx * params.alignmentWeight + coh.fx * params.cohesionWeight;
	let fz = sep.fz * params.separationWeight + ali.fz * params.alignmentWeight + coh.fz * params.cohesionWeight;

	// Clamp to maxForce
	const mag = Math.sqrt(fx * fx + fz * fz);
	if (mag > params.maxForce) {
		fx = (fx / mag) * params.maxForce;
		fz = (fz / mag) * params.maxForce;
	}

	return { fx, fz };
}

/**
 * Apply steering force to an agent and clamp to max speed.
 * Returns new velocity.
 */
export function applyForce(
	vx: number,
	vz: number,
	force: SteeringForce,
	dt: number,
	maxSpeed: number,
): { vx: number; vz: number } {
	let newVx = vx + force.fx * dt;
	let newVz = vz + force.fz * dt;

	const speed = Math.sqrt(newVx * newVx + newVz * newVz);
	if (speed > maxSpeed) {
		newVx = (newVx / speed) * maxSpeed;
		newVz = (newVz / speed) * maxSpeed;
	}

	return { vx: newVx, vz: newVz };
}

/**
 * Check if a group of agents forms a V-formation.
 * A V-formation means agents trail behind a leader, spreading laterally.
 * Returns true if at least half the flock is behind the leader.
 */
export function isVFormation(agents: BoidAgent[]): boolean {
	if (agents.length < 2) return false;

	// Leader is the agent with the largest forward velocity component
	let leader = agents[0];
	let maxForward = leader.vx * leader.vx + leader.vz * leader.vz;
	for (let i = 1; i < agents.length; i++) {
		const spd = agents[i].vx * agents[i].vx + agents[i].vz * agents[i].vz;
		if (spd > maxForward) {
			maxForward = spd;
			leader = agents[i];
		}
	}

	// Direction of travel
	const speed = Math.sqrt(leader.vx * leader.vx + leader.vz * leader.vz);
	if (speed < 0.01) return false;
	const dirX = leader.vx / speed;
	const dirZ = leader.vz / speed;

	// Count agents behind leader (negative dot product with travel direction)
	let behind = 0;
	for (const a of agents) {
		if (a === leader) continue;
		const dx = a.x - leader.x;
		const dz = a.z - leader.z;
		const dot = dx * dirX + dz * dirZ;
		if (dot < 0) behind++;
	}

	return behind >= Math.floor((agents.length - 1) / 2);
}
