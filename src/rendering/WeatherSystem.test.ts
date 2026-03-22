import { describe, expect, it } from 'vitest';
import { WeatherSystem } from './WeatherSystem';

describe('WeatherSystem', () => {
  it('starts inactive', () => {
    const weather = new WeatherSystem();
    expect(weather.active).toBe(false);
  });

  it('setWeather activates for biomes with weather effects', () => {
    const weather = new WeatherSystem();

    weather.setWeather('desert');
    expect(weather.active).toBe(true);

    weather.setWeather('tundra');
    expect(weather.active).toBe(true);

    weather.setWeather('swamp');
    expect(weather.active).toBe(true);

    weather.setWeather('volcanic');
    expect(weather.active).toBe(true);
  });

  it('setWeather deactivates for biomes without weather effects', () => {
    const weather = new WeatherSystem();

    // First activate
    weather.setWeather('desert');
    expect(weather.active).toBe(true);

    // Then set a biome with no weather
    weather.setWeather('forest');
    expect(weather.active).toBe(false);
  });

  it('clear stops weather and sets inactive', () => {
    const weather = new WeatherSystem();
    weather.setWeather('tundra');
    expect(weather.active).toBe(true);

    weather.clear();
    expect(weather.active).toBe(false);
  });

  it('update does nothing when inactive', () => {
    const weather = new WeatherSystem();
    // Should not throw when updating without active weather
    expect(() => weather.update(0.016)).not.toThrow();
  });

  it('update runs without error when active', () => {
    const weather = new WeatherSystem();
    weather.setWeather('desert');
    // Run several update frames
    expect(() => {
      for (let i = 0; i < 10; i++) {
        weather.update(0.016);
      }
    }).not.toThrow();
  });

  it('mesh is an InstancedMesh that can be added to a scene', () => {
    const weather = new WeatherSystem();
    expect(weather.mesh).toBeDefined();
    expect(weather.mesh.isInstancedMesh).toBe(true);
  });

  it('mesh starts not visible', () => {
    const weather = new WeatherSystem();
    expect(weather.mesh.visible).toBe(false);
  });

  it('mesh becomes visible when weather is set', () => {
    const weather = new WeatherSystem();
    weather.setWeather('volcanic');
    expect(weather.mesh.visible).toBe(true);
  });

  it('mesh becomes not visible after clear', () => {
    const weather = new WeatherSystem();
    weather.setWeather('volcanic');
    weather.clear();
    expect(weather.mesh.visible).toBe(false);
  });

  it('setWeather("volcanic") applies orange ember color', () => {
    const weather = new WeatherSystem();
    weather.setWeather('volcanic');

    const mat = weather.mesh.material as import('three').MeshBasicMaterial;
    // Orange ember: 0xff6600 — red dominant, some green, no blue
    expect(mat.color.r).toBeGreaterThan(mat.color.g);
    expect(mat.color.r).toBeGreaterThan(mat.color.b);
    expect(mat.color.b).toBeCloseTo(0, 1);
  });

  it('setWeather("tundra") applies white blizzard color', () => {
    const weather = new WeatherSystem();
    weather.setWeather('tundra');

    const mat = weather.mesh.material as import('three').MeshBasicMaterial;
    // White blizzard: 0xeeeeff — all channels high, blue slightly above rest
    expect(mat.color.r).toBeGreaterThan(0.5);
    expect(mat.color.g).toBeGreaterThan(0.5);
    expect(mat.color.b).toBeGreaterThanOrEqual(mat.color.r);
  });

  it('setWeather("desert") applies tan sandstorm color', () => {
    const weather = new WeatherSystem();
    weather.setWeather('desert');

    const mat = weather.mesh.material as import('three').MeshBasicMaterial;
    // Tan: 0xd2b48c — red > green > blue
    expect(mat.color.r).toBeGreaterThan(mat.color.g);
    expect(mat.color.g).toBeGreaterThan(mat.color.b);
  });

  it('setWeather("swamp") applies green-grey fog color', () => {
    const weather = new WeatherSystem();
    weather.setWeather('swamp');

    const mat = weather.mesh.material as import('three').MeshBasicMaterial;
    // Dark olive green: 0x556b2f — green channel dominates red
    expect(mat.color.g).toBeGreaterThan(mat.color.r);
  });

  it('dispose cleans up and deactivates', () => {
    const weather = new WeatherSystem();
    weather.setWeather('volcanic');
    expect(weather.active).toBe(true);

    weather.dispose();
    expect(weather.active).toBe(false);
  });

  it('mesh has frustumCulled disabled for full visibility', () => {
    const weather = new WeatherSystem();
    expect(weather.mesh.frustumCulled).toBe(false);
  });

  it('particles spawn around cameraPosition without error', () => {
    const weather = new WeatherSystem();
    weather.cameraPosition.set(50, 10, 50);
    weather.setWeather('tundra');

    // Run enough updates to emit and move particles — should not throw
    expect(() => {
      for (let i = 0; i < 20; i++) {
        weather.update(0.016);
      }
    }).not.toThrow();

    // Weather should still be active after updates
    expect(weather.active).toBe(true);
  });
});
