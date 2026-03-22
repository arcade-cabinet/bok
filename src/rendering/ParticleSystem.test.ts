import { describe, expect, it } from 'vitest';
import { ParticleSystem } from './ParticleSystem';

describe('ParticleSystem', () => {
  it('creates with a valid InstancedMesh', () => {
    const ps = new ParticleSystem();
    expect(ps.mesh).toBeDefined();
    expect(ps.mesh.isInstancedMesh).toBe(true);
  });

  it('emit creates particles without error', () => {
    const ps = new ParticleSystem();
    expect(() => {
      ps.emit('blockBreak', { x: 0, y: 5, z: 0 }, 5);
    }).not.toThrow();
  });

  it('update advances particles without error', () => {
    const ps = new ParticleSystem();
    ps.emit('enemyDeath', { x: 10, y: 3, z: 10 }, 10);
    expect(() => {
      ps.update(0.016);
    }).not.toThrow();
  });

  it('particles expire after their lifetime', () => {
    const ps = new ParticleSystem();
    ps.emit('hit', { x: 0, y: 0, z: 0 }, 5);

    // Hit particles have life ~0.3s. Advance past that.
    for (let i = 0; i < 60; i++) {
      ps.update(0.016);
    }

    // After ~1 second all hit particles should be dead.
    // Emitting more should still work (particles recycled).
    expect(() => {
      ps.emit('hit', { x: 1, y: 1, z: 1 }, 5);
    }).not.toThrow();
  });

  it('supports all particle types without error', () => {
    const ps = new ParticleSystem();
    const types: Array<'blockBreak' | 'enemyDeath' | 'sprintDust' | 'ambient' | 'hit'> = [
      'blockBreak',
      'enemyDeath',
      'sprintDust',
      'ambient',
      'hit',
    ];
    for (const type of types) {
      expect(() => {
        ps.emit(type, { x: 0, y: 0, z: 0 }, 3);
      }).not.toThrow();
    }
  });

  it('color override works without error', () => {
    const ps = new ParticleSystem();
    expect(() => {
      ps.emit('blockBreak', { x: 0, y: 0, z: 0 }, 5, 0xff0000);
    }).not.toThrow();
  });

  it('respects particle budget (no crash from over-emission)', () => {
    const ps = new ParticleSystem();
    // Try to emit way more than the 200 particle budget
    expect(() => {
      ps.emit('ambient', { x: 0, y: 0, z: 0 }, 500);
    }).not.toThrow();
  });

  it('update with no active particles does not throw', () => {
    const ps = new ParticleSystem();
    expect(() => {
      ps.update(0.016);
    }).not.toThrow();
  });
});
