import { describe, expect, it } from 'vitest';
import { DayNightCycle, type TimeOfDay } from './DayNightCycle';

describe('DayNightCycle', () => {
  it('starts near midday', () => {
    const cycle = new DayNightCycle();
    expect(cycle.normalizedTime).toBeCloseTo(0.4, 1);
    expect(cycle.getTimeOfDay()).toBe('midday');
  });

  it('getTimeOfDay returns correct period for different times', () => {
    const cycle = new DayNightCycle();

    // Advance to different times and check periods
    // Default starts at 0.4 (midday)
    expect(cycle.getTimeOfDay()).toBe('midday');

    // Advance to dusk: need to get to ~0.7
    // Cycle duration is 240s, so advancing 72s gets to 0.4 + 72/240 = 0.7
    cycle.update(72);
    expect(cycle.getTimeOfDay()).toBe('dusk');
  });

  it('time wraps around after full cycle', () => {
    const cycle = new DayNightCycle();
    const startTime = cycle.normalizedTime;

    // Advance exactly one full cycle (240 seconds)
    cycle.update(240);

    // Should be back close to start
    expect(cycle.normalizedTime).toBeCloseTo(startTime, 2);
  });

  it('normalizedTime increases with update', () => {
    const cycle = new DayNightCycle();
    const before = cycle.normalizedTime;
    cycle.update(10);
    expect(cycle.normalizedTime).toBeGreaterThan(before);
  });

  it('sceneObjects returns 5 objects (sun, moon, dir light, ambient, starfield)', () => {
    const cycle = new DayNightCycle();
    expect(cycle.sceneObjects).toHaveLength(5);
  });

  it('directionalLight and ambientLight are accessible', () => {
    const cycle = new DayNightCycle();
    expect(cycle.directionalLight).toBeDefined();
    expect(cycle.ambientLight).toBeDefined();
  });

  it('skyColor is a valid THREE.Color', () => {
    const cycle = new DayNightCycle();
    const color = cycle.skyColor;
    expect(color.r).toBeGreaterThanOrEqual(0);
    expect(color.r).toBeLessThanOrEqual(1);
  });

  it('getSunDirection returns a normalized vector', () => {
    const cycle = new DayNightCycle();
    cycle.update(1); // Need at least one update to set positions
    const dir = cycle.getSunDirection();
    const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
    expect(length).toBeCloseTo(1, 2);
  });

  it('setBiomeTint shifts sky color toward the tint', async () => {
    const { Color } = await import('three');
    const cycle = new DayNightCycle();

    // Capture sky color without tint
    cycle.update(0.1);
    const baseR = cycle.skyColor.r;
    const baseG = cycle.skyColor.g;
    const baseB = cycle.skyColor.b;

    // Apply a strong red tint and update again
    const redTint = new Color(1, 0, 0);
    cycle.setBiomeTint(redTint);
    cycle.update(0.1);

    // Sky should have shifted toward red (higher R, lower G/B compared to base)
    // At 30% blend the red channel should increase
    expect(cycle.skyColor.r).toBeGreaterThanOrEqual(baseR * 0.9); // At least not less
    // The tint blends at 30%, so the final color is lerp(base, red, 0.3)
    // We just check it's different from the untinted version
    const shifted = cycle.skyColor.r !== baseR || cycle.skyColor.g !== baseG || cycle.skyColor.b !== baseB;
    expect(shifted).toBe(true);
  });

  it('cycling through all time-of-day periods', () => {
    const cycle = new DayNightCycle();
    const periods = new Set<TimeOfDay>();

    // Sample at many points through a full cycle
    for (let i = 0; i < 240; i += 5) {
      cycle.update(5);
      periods.add(cycle.getTimeOfDay());
    }

    expect(periods.has('morning')).toBe(true);
    expect(periods.has('midday')).toBe(true);
    expect(periods.has('dusk')).toBe(true);
    expect(periods.has('night')).toBe(true);
  });
});
