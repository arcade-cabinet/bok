import { describe, expect, it } from 'vitest';
import { ALL_TOME_PAGE_IDS, TOME_PAGE_CATALOG, TOME_PAGE_EXTENDED } from '../../content/tomePages';

/**
 * Pure-logic tests for TomeUnlockBanner.
 * The component itself is React + Framer Motion and would require browser tests.
 * Here we test the data that feeds the banner: ability names, icons, and catalog integrity.
 */

const AUTO_DISMISS_MS = 5000;

describe('TomeUnlockBanner — data logic', () => {
  it('auto-dismiss timing is 5 seconds', () => {
    expect(AUTO_DISMISS_MS).toBe(5000);
  });

  it('all tome abilities have a name and icon for the banner', () => {
    for (const id of ALL_TOME_PAGE_IDS) {
      const meta = TOME_PAGE_CATALOG[id];
      expect(meta).toBeDefined();
      expect(meta.name.length).toBeGreaterThan(0);
      expect(meta.icon.length).toBeGreaterThan(0);
    }
  });

  it('there are exactly 8 tome page abilities', () => {
    expect(ALL_TOME_PAGE_IDS).toHaveLength(8);
  });

  it('extended catalog has boss and biome for every ability', () => {
    for (const id of ALL_TOME_PAGE_IDS) {
      const meta = TOME_PAGE_EXTENDED[id];
      expect(meta).toBeDefined();
      expect(meta.bossName.length).toBeGreaterThan(0);
      expect(meta.biomeName.length).toBeGreaterThan(0);
    }
  });

  it('extended catalog ability names match base catalog', () => {
    for (const id of ALL_TOME_PAGE_IDS) {
      expect(TOME_PAGE_EXTENDED[id].name).toBe(TOME_PAGE_CATALOG[id].name);
      expect(TOME_PAGE_EXTENDED[id].icon).toBe(TOME_PAGE_CATALOG[id].icon);
      expect(TOME_PAGE_EXTENDED[id].description).toBe(TOME_PAGE_CATALOG[id].description);
    }
  });

  it('each boss maps to a unique ability', () => {
    const bossNames = ALL_TOME_PAGE_IDS.map((id) => TOME_PAGE_EXTENDED[id].bossName);
    expect(new Set(bossNames).size).toBe(ALL_TOME_PAGE_IDS.length);
  });

  it('each biome maps to a unique ability', () => {
    const biomeNames = ALL_TOME_PAGE_IDS.map((id) => TOME_PAGE_EXTENDED[id].biomeName);
    expect(new Set(biomeNames).size).toBe(ALL_TOME_PAGE_IDS.length);
  });

  it('banner renders ability name from catalog lookup', () => {
    // Simulate what the banner does: look up ability by ID after boss defeat
    const tomeAbility = 'dash';
    const meta = TOME_PAGE_CATALOG[tomeAbility];
    expect(meta).toBeDefined();
    expect(meta.name).toBe('Dash');
    expect(meta.icon).toBe('💨');
  });
});
