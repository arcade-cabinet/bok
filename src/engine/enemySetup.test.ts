import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { Vehicle, EntityManager as YukaEntityManager } from 'yuka';
import { updateEnemyAI } from './enemySetup';
import type { EnemyState } from './types';

function createEnemy(x: number, z: number): EnemyState {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  mesh.position.set(x, 1, z);
  const vehicle = new Vehicle();
  vehicle.position.set(x, 1, z);
  return { mesh, vehicle, health: 30, attackCooldown: 1.5 };
}

describe('updateEnemyAI', () => {
  it('makes enemies chase player when within 15 units', () => {
    const enemy = createEnemy(10, 10);
    const playerPos = new THREE.Vector3(15, 1, 10); // 5 units away
    const manager = new YukaEntityManager();
    manager.add(enemy.vehicle);

    updateEnemyAI([enemy], playerPos, 0.016, manager);

    // Enemy should have non-zero velocity toward player
    const vel = enemy.vehicle.velocity;
    expect(vel.x).toBeGreaterThan(0); // Moving toward player (x=15 from x=10)
    expect(Math.abs(vel.z)).toBeLessThan(0.01); // Minimal Z movement (same Z)
  });

  it('stops enemies when very close to player', () => {
    const enemy = createEnemy(10, 10);
    const playerPos = new THREE.Vector3(10.5, 1, 10); // 0.5 units — within 1.5 stop range
    const manager = new YukaEntityManager();
    manager.add(enemy.vehicle);

    updateEnemyAI([enemy], playerPos, 0.016, manager);

    const vel = enemy.vehicle.velocity;
    expect(vel.x).toBe(0);
    expect(vel.z).toBe(0);
  });

  it('makes distant enemies wander randomly', () => {
    const enemy = createEnemy(10, 10);
    const playerPos = new THREE.Vector3(50, 1, 50); // Far away (>15 units)
    const manager = new YukaEntityManager();
    manager.add(enemy.vehicle);

    // Seed Math.random for deterministic wander
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.7);
    updateEnemyAI([enemy], playerPos, 0.016, manager);
    randomSpy.mockRestore();

    // Velocity should be small wander values (±0.25 range)
    const vel = enemy.vehicle.velocity;
    expect(Math.abs(vel.x)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(vel.z)).toBeLessThanOrEqual(0.5);
  });

  it('handles empty enemy list', () => {
    const playerPos = new THREE.Vector3(10, 1, 10);
    const manager = new YukaEntityManager();
    expect(() => updateEnemyAI([], playerPos, 0.016, manager)).not.toThrow();
  });
});
