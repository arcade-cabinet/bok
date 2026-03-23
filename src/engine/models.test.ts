import { describe, expect, it } from 'vitest';

import {
  ANIMAL_MODELS,
  BLOCK_MODELS,
  CHARACTER_MODELS,
  COLLECTIBLE_MODELS,
  ENEMY_MODELS,
  ENVIRONMENT_MODELS,
  OBJECT_MODELS,
  PIXEL_BLOCK_MODELS,
  STONE_MODELS,
  VILLAGE_MODELS,
  WEAPON_MODELS,
} from './models.ts';

describe('model registries', () => {
  it('ENEMY_MODELS has entries for all core enemy types', () => {
    const coreTypes = ['skeleton', 'goblin', 'zombie', 'demon', 'wizard', 'yeti', 'giant', 'hedgehog'];
    for (const type of coreTypes) {
      expect(ENEMY_MODELS[type]).toBeDefined();
      expect(ENEMY_MODELS[type]).toMatch(/\.gltf$/);
    }
  });

  it('ENEMY_MODELS has entries for all biome enemies', () => {
    const biomeTypes = [
      'slime',
      'sand-wraith',
      'scorpion',
      'frost-wolf',
      'ice-golem',
      'fire-imp',
      'lava-elemental',
      'swamp-lurker',
      'bog-witch',
      'crystal-sentinel',
      'gem-spider',
      'sky-hawk',
      'wind-elemental',
      'depth-crawler',
      'angler-fish',
    ];
    for (const type of biomeTypes) {
      expect(ENEMY_MODELS[type]).toBeDefined();
      expect(ENEMY_MODELS[type]).toMatch(/\.gltf$/);
    }
  });

  it('ENEMY_MODELS has entries for all bosses', () => {
    const bossTypes = [
      'ancient-treant',
      'pharaoh-construct',
      'frost-wyrm',
      'magma-king',
      'mire-hag',
      'crystal-hydra',
      'storm-titan',
      'abyssal-leviathan',
    ];
    for (const type of bossTypes) {
      expect(ENEMY_MODELS[type]).toBeDefined();
      expect(ENEMY_MODELS[type]).toMatch(/\.gltf$/);
    }
  });

  it('WEAPON_MODELS covers all four tiers for pickaxes, shovels, and axes', () => {
    const tools = ['pickaxe', 'shovel', 'axe'];
    const tiers = ['wood', 'stone', 'gold', 'diamond'];
    for (const tool of tools) {
      for (const tier of tiers) {
        const key = `${tool}_${tier}`;
        expect(WEAPON_MODELS[key]).toBeDefined();
        expect(WEAPON_MODELS[key]).toMatch(/\.gltf$/);
      }
    }
  });

  it('ENVIRONMENT_MODELS has tree variants', () => {
    expect(ENVIRONMENT_MODELS.tree1).toBeDefined();
    expect(ENVIRONMENT_MODELS.tree2).toBeDefined();
    expect(ENVIRONMENT_MODELS.tree3).toBeDefined();
    expect(ENVIRONMENT_MODELS.deadTree1).toBeDefined();
  });

  it('ANIMAL_MODELS has all CubeWorld animal types', () => {
    const coreTypes = ['cat', 'chick', 'chicken', 'dog', 'horse', 'pig', 'raccoon', 'sheep', 'wolf'];
    for (const type of coreTypes) {
      expect(ANIMAL_MODELS[type as keyof typeof ANIMAL_MODELS]).toBeDefined();
    }
  });

  it('ANIMAL_MODELS has all voxel-converted animal types', () => {
    const voxelTypes = [
      'axolotl',
      'bear',
      'bunny',
      'cow',
      'crocodile',
      'elephant',
      'fox',
      'frog',
      'mole',
      'monkey',
      'mouse',
      'panda',
      'parrot',
      'penguin',
      'piglet',
      'turtle',
      'unicorn',
    ];
    for (const type of voxelTypes) {
      expect(ANIMAL_MODELS[type as keyof typeof ANIMAL_MODELS]).toBeDefined();
      expect(ANIMAL_MODELS[type as keyof typeof ANIMAL_MODELS]).toMatch(/\.gltf$/);
    }
  });

  it('CHARACTER_MODELS has both genders with two variants each', () => {
    expect(CHARACTER_MODELS.female1).toBeDefined();
    expect(CHARACTER_MODELS.female2).toBeDefined();
    expect(CHARACTER_MODELS.male1).toBeDefined();
    expect(CHARACTER_MODELS.male2).toBeDefined();
  });

  it('BLOCK_MODELS has all terrain block types', () => {
    const blockTypes = ['grass', 'dirt', 'stone', 'ice', 'snow', 'coal', 'diamond', 'crystal', 'metal'];
    for (const type of blockTypes) {
      expect(BLOCK_MODELS[type as keyof typeof BLOCK_MODELS]).toBeDefined();
    }
  });

  it('STONE_MODELS has floor, wall, pillar, and moss variants', () => {
    expect(STONE_MODELS.floor).toBeDefined();
    expect(STONE_MODELS.floorDark).toBeDefined();
    expect(STONE_MODELS.wall).toBeDefined();
    expect(STONE_MODELS.wallRubble).toBeDefined();
    expect(STONE_MODELS.pillar).toBeDefined();
    expect(STONE_MODELS.pillarDark).toBeDefined();
    expect(STONE_MODELS.moss3D).toBeDefined();
    expect(STONE_MODELS.floorG).toBeDefined();
    expect(STONE_MODELS.floorG12).toBeDefined();
    expect(STONE_MODELS.forestGrassSand).toBeDefined();
  });

  it('VILLAGE_MODELS has all village pieces', () => {
    expect(VILLAGE_MODELS.chimney).toBeDefined();
    expect(VILLAGE_MODELS.wall).toBeDefined();
    expect(VILLAGE_MODELS.wallPlain).toBeDefined();
    expect(VILLAGE_MODELS.wallV2Inv).toBeDefined();
    expect(Object.keys(VILLAGE_MODELS).length).toBeGreaterThanOrEqual(19);
  });

  it('OBJECT_MODELS has decorative objects', () => {
    expect(OBJECT_MODELS.barrel).toBeDefined();
    expect(OBJECT_MODELS.crate).toBeDefined();
    expect(OBJECT_MODELS.torchLong).toBeDefined();
    expect(OBJECT_MODELS.door).toBeDefined();
  });

  it('COLLECTIBLE_MODELS has food items', () => {
    expect(COLLECTIBLE_MODELS.apple).toBeDefined();
    expect(COLLECTIBLE_MODELS.fish).toBeDefined();
    expect(COLLECTIBLE_MODELS.honey).toBeDefined();
  });

  it('PIXEL_BLOCK_MODELS has all 18 pixel block types', () => {
    expect(Object.keys(PIXEL_BLOCK_MODELS)).toHaveLength(18);
    expect(PIXEL_BLOCK_MODELS.pixelGrass).toBeDefined();
    expect(PIXEL_BLOCK_MODELS.pixelDirt).toBeDefined();
    expect(PIXEL_BLOCK_MODELS.pixelStone).toBeDefined();
    expect(PIXEL_BLOCK_MODELS.pixelBricksRed).toBeDefined();
    expect(PIXEL_BLOCK_MODELS.pixelDiamond).toBeDefined();
  });

  it('all model paths start with /assets/models/', () => {
    const allModels = [
      ...Object.values(ENEMY_MODELS),
      ...Object.values(WEAPON_MODELS),
      ...Object.values(ENVIRONMENT_MODELS),
      ...Object.values(ANIMAL_MODELS),
      ...Object.values(CHARACTER_MODELS),
      ...Object.values(BLOCK_MODELS),
      ...Object.values(STONE_MODELS),
      ...Object.values(VILLAGE_MODELS),
      ...Object.values(OBJECT_MODELS),
      ...Object.values(COLLECTIBLE_MODELS),
      ...Object.values(PIXEL_BLOCK_MODELS),
    ];
    for (const path of allModels) {
      expect(path).toMatch(/^\/assets\/models\//);
    }
  });

  it('no model paths contain double slashes', () => {
    const allModels = [
      ...Object.values(ENEMY_MODELS),
      ...Object.values(WEAPON_MODELS),
      ...Object.values(ENVIRONMENT_MODELS),
      ...Object.values(ANIMAL_MODELS),
      ...Object.values(CHARACTER_MODELS),
      ...Object.values(BLOCK_MODELS),
      ...Object.values(STONE_MODELS),
      ...Object.values(VILLAGE_MODELS),
      ...Object.values(OBJECT_MODELS),
      ...Object.values(COLLECTIBLE_MODELS),
      ...Object.values(PIXEL_BLOCK_MODELS),
    ];
    for (const path of allModels) {
      expect(path).not.toMatch(/\/\//);
    }
  });
});

describe('spawnModelActor', () => {
  it('is exported from models module', async () => {
    const mod = await import('./models.ts');
    expect(mod.spawnModelActor).toBeTypeOf('function');
  });

  it('spawnModelActorAsync is exported', async () => {
    const mod = await import('./models.ts');
    expect(mod.spawnModelActorAsync).toBeTypeOf('function');
  });

  it('spawnEnemyModelActor is exported', async () => {
    const mod = await import('./models.ts');
    expect(mod.spawnEnemyModelActor).toBeTypeOf('function');
  });

  it('spawnWeaponModelActor is exported', async () => {
    const mod = await import('./models.ts');
    expect(mod.spawnWeaponModelActor).toBeTypeOf('function');
  });

  it('clearModelCache is exported', async () => {
    const mod = await import('./models.ts');
    expect(mod.clearModelCache).toBeTypeOf('function');
  });

  it('spawnEnemyModelActor throws for unknown enemy type', async () => {
    const mod = await import('./models.ts');
    // biome-ignore lint/suspicious/noExplicitAny: testing error case without real JpWorld
    expect(() => mod.spawnEnemyModelActor({} as any, 'nonexistent-enemy', { x: 0, y: 0, z: 0 })).toThrow(
      'No model mapping for enemy type "nonexistent-enemy"',
    );
  });

  it('spawnWeaponModelActor throws for unknown weapon', async () => {
    const mod = await import('./models.ts');
    // biome-ignore lint/suspicious/noExplicitAny: testing error case without real JpWorld
    expect(() => mod.spawnWeaponModelActor({} as any, 'nonexistent-weapon', { x: 0, y: 0, z: 0 })).toThrow(
      'No model mapping for weapon "nonexistent-weapon"',
    );
  });
});
