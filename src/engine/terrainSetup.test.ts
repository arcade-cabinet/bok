import { describe, expect, it } from 'vitest';
import { getBiomeBlockDefs } from './biomeBlocks.ts';

describe('getBiomeBlockDefs', () => {
  const ALL_BIOME_IDS = ['forest', 'desert', 'tundra', 'volcanic', 'swamp', 'crystal-caves', 'sky-ruins', 'deep-ocean'];

  it('always includes base blocks (IDs 1-7) for every biome', () => {
    for (const biomeId of ALL_BIOME_IDS) {
      const defs = getBiomeBlockDefs(biomeId);
      const ids = defs.map((d) => d.id);
      expect(ids).toContain(1); // grass
      expect(ids).toContain(2); // dirt
      expect(ids).toContain(3); // stone
      expect(ids).toContain(4); // water
      expect(ids).toContain(5); // sand
      expect(ids).toContain(6); // wood
      expect(ids).toContain(7); // leaves
    }
  });

  it('forest biome uses only base blocks (no extra IDs)', () => {
    const defs = getBiomeBlockDefs('forest');
    const ids = defs.map((d) => d.id);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('desert biome includes sand-surface (10), sandstone (11), desert-stone (12)', () => {
    const defs = getBiomeBlockDefs('desert');
    const ids = defs.map((d) => d.id);
    expect(ids).toContain(10);
    expect(ids).toContain(11);
    expect(ids).toContain(12);
    expect(ids).toContain(13); // oasis water
    expect(ids).toContain(14); // cactus
  });

  it('tundra biome includes snow-top (20), frozen-dirt (21), ice (22)', () => {
    const defs = getBiomeBlockDefs('tundra');
    const ids = defs.map((d) => d.id);
    expect(ids).toContain(20);
    expect(ids).toContain(21);
    expect(ids).toContain(22);
    expect(ids).toContain(23); // frost water
    expect(ids).toContain(24); // permafrost
  });

  it('volcanic biome includes obsidian (30), lava (33)', () => {
    const defs = getBiomeBlockDefs('volcanic');
    const ids = defs.map((d) => d.id);
    expect(ids).toContain(30);
    expect(ids).toContain(31); // ash
    expect(ids).toContain(32); // basalt
    expect(ids).toContain(33); // lava
    expect(ids).toContain(34); // magma crust
  });

  it('volcanic lava block is non-collidable', () => {
    const defs = getBiomeBlockDefs('volcanic');
    const lava = defs.find((d) => d.id === 33);
    expect(lava).toBeDefined();
    expect(lava?.name).toBe('Lava');
    expect(lava?.collidable).toBe(false);
  });

  it('swamp biome includes mud-surface (40), murky-water (43), dead-wood (44)', () => {
    const defs = getBiomeBlockDefs('swamp');
    const ids = defs.map((d) => d.id);
    expect(ids).toContain(40);
    expect(ids).toContain(41); // peat
    expect(ids).toContain(42); // swamp stone
    expect(ids).toContain(43); // murky water
    expect(ids).toContain(44); // dead wood
  });

  it('crystal-caves biome includes crystal-surface (50), amethyst (52), quartz (54)', () => {
    const defs = getBiomeBlockDefs('crystal-caves');
    const ids = defs.map((d) => d.id);
    expect(ids).toContain(50);
    expect(ids).toContain(51); // geode wall
    expect(ids).toContain(52); // amethyst
    expect(ids).toContain(53); // crystal water
    expect(ids).toContain(54); // quartz
  });

  it('sky-ruins biome includes cloud-top (60), sky-stone (62), wind-block (64)', () => {
    const defs = getBiomeBlockDefs('sky-ruins');
    const ids = defs.map((d) => d.id);
    expect(ids).toContain(60);
    expect(ids).toContain(61); // cloud base
    expect(ids).toContain(62); // sky stone
    expect(ids).toContain(63); // void
    expect(ids).toContain(64); // wind block
  });

  it('deep-ocean biome includes coral-surface (70), deep-water (73), kelp (74)', () => {
    const defs = getBiomeBlockDefs('deep-ocean');
    const ids = defs.map((d) => d.id);
    expect(ids).toContain(70);
    expect(ids).toContain(71); // sea floor
    expect(ids).toContain(72); // ocean stone
    expect(ids).toContain(73); // deep water
    expect(ids).toContain(74); // kelp
  });

  it('each biome has unique surface block IDs (no two biomes share surface blocks beyond base)', () => {
    const biomeSpecificIds = new Map<string, number[]>();
    for (const biomeId of ALL_BIOME_IDS) {
      const defs = getBiomeBlockDefs(biomeId);
      const extraIds = defs.filter((d) => d.id > 7).map((d) => d.id);
      biomeSpecificIds.set(biomeId, extraIds);
    }

    // Check no overlap between different biomes' extra blocks
    const entries = [...biomeSpecificIds.entries()];
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [nameA, idsA] = entries[i];
        const [nameB, idsB] = entries[j];
        const overlap = idsA.filter((id) => idsB.includes(id));
        expect(overlap, `${nameA} and ${nameB} share block IDs: ${overlap.join(', ')}`).toEqual([]);
      }
    }
  });

  it('all block definitions have valid structure', () => {
    for (const biomeId of ALL_BIOME_IDS) {
      const defs = getBiomeBlockDefs(biomeId);
      for (const def of defs) {
        expect(def.id).toBeGreaterThan(0);
        expect(def.name).toBeTruthy();
        expect(def.shapeId).toBe('cube');
        expect(typeof def.collidable).toBe('boolean');
        expect(def.defaultTexture).toBeDefined();
        expect(def.defaultTexture?.tilesetId).toBe('game');
      }
    }
  });

  it('water-type blocks are non-collidable across all biomes', () => {
    const waterBlockIds = [4, 13, 23, 33, 43, 53, 73]; // water, oasis, frost, lava, murky, crystal, deep
    for (const biomeId of ALL_BIOME_IDS) {
      const defs = getBiomeBlockDefs(biomeId);
      for (const def of defs) {
        if (waterBlockIds.includes(def.id)) {
          expect(def.collidable, `Block ${def.id} (${def.name}) in ${biomeId} should be non-collidable`).toBe(false);
        }
      }
    }
  });

  it('unknown biome ID falls back to base blocks', () => {
    const defs = getBiomeBlockDefs('unknown-biome');
    const ids = defs.map((d) => d.id);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('biome block IDs match their JSON config references', () => {
    // Each biome JSON references specific block IDs. Verify they exist in the definitions.
    const biomeBlockMapping: Record<string, { surface: number; subsurface: number; stone: number }> = {
      forest: { surface: 1, subsurface: 2, stone: 3 },
      desert: { surface: 10, subsurface: 11, stone: 12 },
      tundra: { surface: 20, subsurface: 21, stone: 22 },
      volcanic: { surface: 30, subsurface: 31, stone: 32 },
      swamp: { surface: 40, subsurface: 41, stone: 42 },
      'crystal-caves': { surface: 50, subsurface: 51, stone: 52 },
      'sky-ruins': { surface: 60, subsurface: 61, stone: 62 },
      'deep-ocean': { surface: 70, subsurface: 71, stone: 72 },
    };

    for (const [biomeId, expected] of Object.entries(biomeBlockMapping)) {
      const defs = getBiomeBlockDefs(biomeId);
      const ids = new Set(defs.map((d) => d.id));
      expect(ids.has(expected.surface), `${biomeId} missing surface block ${expected.surface}`).toBe(true);
      expect(ids.has(expected.subsurface), `${biomeId} missing subsurface block ${expected.subsurface}`).toBe(true);
      expect(ids.has(expected.stone), `${biomeId} missing stone block ${expected.stone}`).toBe(true);
    }
  });
});
