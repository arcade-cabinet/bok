import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { detectContext, getHeadBob } from './diegetic';
import type { EnemyState } from './types';

function makeEnemy(x: number, z: number): EnemyState {
  const mesh = new THREE.Object3D();
  mesh.position.set(x, 0, z);
  return {
    mesh,
    vehicle: {} as EnemyState['vehicle'],
    health: 50,
    maxHealth: 50,
    damage: 10,
    type: 'slime',
    attackCooldown: 0,
  };
}

const flatTerrain = () => 0;

describe('detectContext', () => {
  it('returns "combat" when enemy is within 5 blocks', () => {
    const cam = new THREE.Vector3(0, 0, 0);
    const enemies = [makeEnemy(3, 0)]; // 3 blocks away
    expect(detectContext(cam, enemies, flatTerrain)).toBe('combat');
  });

  it('returns "explore" when no enemies nearby on flat terrain', () => {
    const cam = new THREE.Vector3(0, 0, 0);
    const enemies = [makeEnemy(10, 10)]; // far away
    expect(detectContext(cam, enemies, flatTerrain)).toBe('explore');
  });

  it('returns "explore" with no enemies at all', () => {
    const cam = new THREE.Vector3(0, 0, 0);
    expect(detectContext(cam, [], flatTerrain)).toBe('explore');
  });

  it('returns "climb" when terrain rises by 1 block in a cardinal direction', () => {
    const cam = new THREE.Vector3(5, 0, 5);
    const climbTerrain = (x: number, z: number) => {
      if (x === 6 && z === 5) return 1; // 1 block up to the east
      return 0;
    };
    expect(detectContext(cam, [], climbTerrain)).toBe('climb');
  });

  it('returns "drop" when terrain drops by 2+ blocks', () => {
    const cam = new THREE.Vector3(5, 0, 5);
    const dropTerrain = (x: number, z: number) => {
      if (x === 6 && z === 5) return -3; // 3 blocks down
      return 0;
    };
    expect(detectContext(cam, [], dropTerrain)).toBe('drop');
  });

  it('combat takes priority over climb', () => {
    const cam = new THREE.Vector3(5, 0, 5);
    const enemies = [makeEnemy(7, 5)]; // 2 blocks away
    const climbTerrain = (x: number, z: number) => {
      if (x === 6 && z === 5) return 1;
      return 0;
    };
    expect(detectContext(cam, enemies, climbTerrain)).toBe('combat');
  });
});

describe('getHeadBob', () => {
  it('returns near-zero when standing still', () => {
    const bob = getHeadBob(0.016, false, 'explore', 0);
    expect(Math.abs(bob)).toBeLessThan(0.02);
  });

  it('returns non-zero when moving', () => {
    // At elapsed = PI/(2*8), sin(8 * elapsed) = sin(PI/2) = 1
    const elapsed = Math.PI / 16;
    const bob = getHeadBob(0.016, true, 'explore', elapsed);
    expect(Math.abs(bob)).toBeGreaterThan(0);
  });

  it('combat bob includes a crouch offset', () => {
    const bob = getHeadBob(0.016, true, 'combat', 0);
    expect(bob).toBeLessThan(0); // crouch is negative
  });

  it('climb bob has larger amplitude than explore', () => {
    // At peak: sin(10 * elapsed) = 1 → climb = 0.05, explore = 0.03
    const elapsed = Math.PI / 20; // sin(10 * PI/20) = sin(PI/2) = 1
    const climbBob = getHeadBob(0.016, true, 'climb', elapsed);
    const exploreBob = getHeadBob(0.016, true, 'explore', elapsed);
    expect(Math.abs(climbBob)).toBeGreaterThan(Math.abs(exploreBob));
  });
});
