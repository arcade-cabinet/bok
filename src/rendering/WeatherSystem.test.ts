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
});
