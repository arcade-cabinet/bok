import { beforeEach, describe, expect, it } from 'vitest';
import type { ComboHit } from '../../content/index';
import { WeaponComboTracker } from './WeaponComboSystem';

const testCombo: ComboHit[] = [
  { damageMultiplier: 1.0, windowMs: 500, animation: 'slash1' },
  { damageMultiplier: 1.2, windowMs: 400, animation: 'slash2' },
  { damageMultiplier: 1.5, windowMs: 300, animation: 'slam' },
];

describe('WeaponComboTracker', () => {
  let tracker: WeaponComboTracker;

  beforeEach(() => {
    tracker = new WeaponComboTracker(testCombo);
  });

  it('starts at combo step 0', () => {
    expect(tracker.currentStep).toBe(0);
  });

  it('returns first hit multiplier on attack', () => {
    const hit = tracker.attack(0);
    expect(hit.damageMultiplier).toBe(1.0);
    expect(hit.animation).toBe('slash1');
    expect(tracker.currentStep).toBe(1);
  });

  it('advances combo when attack within window', () => {
    tracker.attack(0);
    const hit = tracker.attack(400); // within 500ms window
    expect(hit.damageMultiplier).toBe(1.2);
    expect(hit.animation).toBe('slash2');
    expect(tracker.currentStep).toBe(2);
  });

  it('completes full 3-hit combo', () => {
    const hit1 = tracker.attack(0);
    const hit2 = tracker.attack(400);
    const hit3 = tracker.attack(800); // 400ms after hit2, within 400ms window
    expect(hit1.damageMultiplier).toBe(1.0);
    expect(hit2.damageMultiplier).toBe(1.2);
    expect(hit3.damageMultiplier).toBe(1.5);
    expect(hit3.animation).toBe('slam');
  });

  it('resets to step 0 after completing full combo', () => {
    tracker.attack(0);
    tracker.attack(400);
    tracker.attack(800);
    // Combo finished, next attack starts fresh
    const hit = tracker.attack(1200);
    expect(hit.damageMultiplier).toBe(1.0);
    expect(tracker.currentStep).toBe(1);
  });

  it('resets combo when attack outside timing window', () => {
    tracker.attack(0);
    // Wait too long (> 500ms window)
    const hit = tracker.attack(600);
    expect(hit.damageMultiplier).toBe(1.0); // Reset to first hit
    expect(tracker.currentStep).toBe(1);
  });

  it('resets combo on explicit reset', () => {
    tracker.attack(0);
    tracker.attack(400);
    tracker.reset();
    expect(tracker.currentStep).toBe(0);
    const hit = tracker.attack(1000);
    expect(hit.damageMultiplier).toBe(1.0);
  });

  it('returns current combo multiplier without advancing', () => {
    tracker.attack(0);
    expect(tracker.currentMultiplier).toBe(1.2); // next hit multiplier
  });

  it('returns 1.0 multiplier when at step 0', () => {
    expect(tracker.currentMultiplier).toBe(1.0);
  });
});
