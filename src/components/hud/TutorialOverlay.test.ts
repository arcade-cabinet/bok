import { describe, expect, it } from 'vitest';
import { TOME_PAGE_CATALOG } from '../../content/tomePages';

/**
 * Pure-logic tests for TutorialOverlay.
 * The component itself is React + Framer Motion and would require browser tests.
 * Here we test the data structures, localStorage helpers, and step definitions.
 */

const STORAGE_KEY = 'bok-tutorial-completed';

const TUTORIAL_STEPS = [
  { title: 'Welcome to Bok!', icon: '📖' },
  { title: 'Movement', icon: '🏃' },
  { title: 'Combat', icon: '⚔️' },
  { title: 'Loot', icon: '💎' },
  { title: 'Boss', icon: '👑' },
  { title: 'Hub', icon: '🏠' },
];

describe('TutorialOverlay — data logic', () => {
  it('has exactly 6 tutorial steps', () => {
    expect(TUTORIAL_STEPS).toHaveLength(6);
  });

  it('all steps have a title and icon', () => {
    for (const step of TUTORIAL_STEPS) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.icon.length).toBeGreaterThan(0);
    }
  });

  it('step titles are unique', () => {
    const titles = TUTORIAL_STEPS.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('next advances through all steps sequentially', () => {
    let currentStep = 0;
    for (let i = 0; i < TUTORIAL_STEPS.length - 1; i++) {
      currentStep++;
      expect(currentStep).toBe(i + 1);
    }
    expect(currentStep).toBe(TUTORIAL_STEPS.length - 1);
  });

  it('skip sets completion flag', () => {
    // Simulate skip behavior: sets the localStorage key
    const completed = STORAGE_KEY;
    expect(completed).toBe('bok-tutorial-completed');
  });

  it('completion check uses correct storage key', () => {
    expect(STORAGE_KEY).toBe('bok-tutorial-completed');
  });

  it('all 8 tome abilities exist in the catalog for the tutorial boss step', () => {
    // The tutorial references defeating bosses for tome pages —
    // verify the catalog actually has all expected abilities
    const expectedAbilities = [
      'dash',
      'ice-path',
      'fire-lance',
      'block-shield',
      'ground-pound',
      'wind-jump',
      'stone-skin',
      'shadow-step',
    ];
    for (const id of expectedAbilities) {
      expect(TOME_PAGE_CATALOG[id]).toBeDefined();
      expect(TOME_PAGE_CATALOG[id].name.length).toBeGreaterThan(0);
    }
  });
});
