import { describe, expect, it, beforeEach } from 'vitest';
import * as THREE from 'three';
import { LODManager } from './LODManager.ts';

describe('LODManager', () => {
  let lod: LODManager;
  let camera: THREE.Vector3;

  beforeEach(() => {
    lod = new LODManager({ lowDetailDistance: 30, cullDistance: 50, updateInterval: 0.5 });
    camera = new THREE.Vector3(0, 0, 0);
  });

  describe('track / untrack', () => {
    it('tracks an object and reports correct count', () => {
      const obj = new THREE.Object3D();
      lod.track('a', obj);
      expect(lod.trackedCount).toBe(1);
    });

    it('untracks an object', () => {
      const obj = new THREE.Object3D();
      lod.track('a', obj);
      lod.untrack('a');
      expect(lod.trackedCount).toBe(0);
    });

    it('replaces an object with the same id', () => {
      const obj1 = new THREE.Object3D();
      const obj2 = new THREE.Object3D();
      lod.track('a', obj1);
      lod.track('a', obj2);
      expect(lod.trackedCount).toBe(1);
    });

    it('untrack is a no-op for unknown ids', () => {
      lod.untrack('nonexistent');
      expect(lod.trackedCount).toBe(0);
    });
  });

  describe('cull distance', () => {
    it('hides objects beyond cull distance', () => {
      const obj = new THREE.Object3D();
      obj.position.set(60, 0, 0); // 60 > 50 cull distance
      lod.track('far', obj);

      // Force update by exceeding the update interval
      lod.update(1.0, camera);

      expect(obj.visible).toBe(false);
    });

    it('shows objects within cull distance', () => {
      const obj = new THREE.Object3D();
      obj.position.set(10, 0, 0); // 10 < 30 low detail distance
      lod.track('near', obj);

      lod.update(1.0, camera);

      expect(obj.visible).toBe(true);
    });
  });

  describe('low detail distance', () => {
    it('shows objects between low and cull distance', () => {
      const obj = new THREE.Object3D();
      obj.position.set(40, 0, 0); // 30 < 40 < 50
      lod.track('mid', obj);

      lod.update(1.0, camera);

      expect(obj.visible).toBe(true);
    });
  });

  describe('update interval throttle', () => {
    it('skips LOD evaluation when not enough time has passed', () => {
      const obj = new THREE.Object3D();
      obj.position.set(60, 0, 0);
      obj.visible = true;
      lod.track('throttled', obj);

      // dt=0.1 is less than updateInterval=0.5
      lod.update(0.1, camera);

      // Should NOT have changed visibility yet
      expect(obj.visible).toBe(true);
    });

    it('evaluates LOD when enough time accumulates', () => {
      const obj = new THREE.Object3D();
      obj.position.set(60, 0, 0);
      obj.visible = true;
      lod.track('throttled', obj);

      lod.update(0.3, camera);
      expect(obj.visible).toBe(true); // not yet

      lod.update(0.3, camera); // total 0.6 > 0.5
      expect(obj.visible).toBe(false); // now culled
    });
  });

  describe('setConfig', () => {
    it('updates config dynamically', () => {
      const obj = new THREE.Object3D();
      obj.position.set(25, 0, 0);
      lod.track('dynamic', obj);

      lod.update(1.0, camera);
      expect(obj.visible).toBe(true);

      // Shrink cull distance so 25 is beyond it
      lod.setConfig({ cullDistance: 20 });
      lod.update(1.0, camera);
      expect(obj.visible).toBe(false);
    });
  });

  describe('dispose', () => {
    it('clears all tracked objects', () => {
      lod.track('a', new THREE.Object3D());
      lod.track('b', new THREE.Object3D());
      lod.dispose();
      expect(lod.trackedCount).toBe(0);
    });
  });

  describe('config getter', () => {
    it('returns the current config', () => {
      const config = lod.config;
      expect(config.lowDetailDistance).toBe(30);
      expect(config.cullDistance).toBe(50);
      expect(config.updateInterval).toBe(0.5);
    });

    it('returns a copy that does not affect internal state', () => {
      const config = lod.config;
      (config as { cullDistance: number }).cullDistance = 999;
      expect(lod.config.cullDistance).toBe(50);
    });
  });

  describe('default config', () => {
    it('uses sensible defaults when no config is provided', () => {
      const defaultLod = new LODManager();
      const config = defaultLod.config;
      expect(config.lowDetailDistance).toBe(30);
      expect(config.cullDistance).toBe(50);
      expect(config.updateInterval).toBe(0.5);
    });
  });
});
