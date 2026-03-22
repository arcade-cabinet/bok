/**
 * @module engine/models
 * @role Load GLB models from public/models/ (CubeWorld asset pack)
 * @input Three.js scene, model path
 * @output Loaded THREE.Group clones positioned in scene
 *
 * All models are from the CubeWorld pack — one cohesive art style.
 */
import type * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map<string, THREE.Group>();

/**
 * Load a GLB model from public/models/. Caches by path.
 * Returns a clone of the loaded scene group.
 */
export async function loadModel(path: string): Promise<THREE.Group> {
  const cached = cache.get(path);
  if (cached) {
    return cached.clone();
  }

  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        cache.set(path, gltf.scene);
        resolve(gltf.scene.clone());
      },
      undefined,
      reject,
    );
  });
}

// =============================================================================
// CubeWorld Enemy Models
// =============================================================================
export const ENEMY_MODELS: Record<string, string> = {
  // --- CubeWorld core enemies ---
  skeleton: '/models/enemies/Skeleton.glb',
  'skeleton-archer': '/models/enemies/Skeleton_Armor.glb',
  goblin: '/models/enemies/Goblin.glb',
  zombie: '/models/enemies/Zombie.glb',
  demon: '/models/enemies/Demon.glb',
  wizard: '/models/enemies/Wizard.glb',
  yeti: '/models/enemies/Yeti.glb',
  giant: '/models/enemies/Giant.glb',
  hedgehog: '/models/enemies/Hedgehog.glb',

  // --- Biome enemy mappings (CubeWorld best-fit) ---
  slime: '/models/enemies/Hedgehog.glb',
  'sand-wraith': '/models/enemies/Wizard.glb',
  scorpion: '/models/enemies/Hedgehog.glb',
  'frost-wolf': '/models/animals/Wolf.glb',
  'ice-golem': '/models/enemies/Giant.glb',
  'fire-imp': '/models/enemies/Goblin.glb',
  'lava-elemental': '/models/enemies/Demon.glb',
  'swamp-lurker': '/models/enemies/Zombie.glb',
  'bog-witch': '/models/enemies/Wizard.glb',
  'crystal-sentinel': '/models/enemies/Skeleton_Armor.glb',
  'gem-spider': '/models/enemies/Hedgehog.glb',
  'sky-hawk': '/models/animals/Chicken.glb',
  'wind-elemental': '/models/enemies/Wizard.glb',
  'depth-crawler': '/models/enemies/Zombie.glb',
  'angler-fish': '/models/enemies/Hedgehog.glb',

  // --- Boss models ---
  'ancient-treant': '/models/enemies/Giant.glb',
  'pharaoh-construct': '/models/enemies/Skeleton_Armor.glb',
  'frost-wyrm': '/models/enemies/Yeti.glb',
  'magma-king': '/models/enemies/Demon.glb',
  'mire-hag': '/models/enemies/Wizard.glb',
  'crystal-hydra': '/models/enemies/Giant.glb',
  'storm-titan': '/models/enemies/Giant.glb',
  'abyssal-leviathan': '/models/enemies/Demon.glb',
};

// =============================================================================
// CubeWorld Weapon/Tool Models — 4 tiers (Wood → Stone → Gold → Diamond)
// =============================================================================
export const WEAPON_MODELS: Record<string, string> = {
  // Swords
  'wooden-sword': '/models/weapons/Sword_Wood.glb',
  'iron-sword': '/models/weapons/Sword_Stone.glb',
  'crystal-blade': '/models/weapons/Sword_Diamond.glb',
  'volcanic-edge': '/models/weapons/Sword_Gold.glb',
  'frost-cleaver': '/models/weapons/Sword_Diamond.glb',

  // Axes
  'battle-axe': '/models/weapons/Axe_Wood.glb',
  'war-hammer': '/models/weapons/Pickaxe_Stone.glb',

  // Pickaxes (mining tools — double as weapons)
  pickaxe_wood: '/models/weapons/Pickaxe_Wood.glb',
  pickaxe_stone: '/models/weapons/Pickaxe_Stone.glb',
  pickaxe_gold: '/models/weapons/Pickaxe_Gold.glb',
  pickaxe_diamond: '/models/weapons/Pickaxe_Diamond.glb',

  // Shovels
  shovel_wood: '/models/weapons/Shovel_Wood.glb',
  shovel_stone: '/models/weapons/Shovel_Stone.glb',
  shovel_gold: '/models/weapons/Shovel_Gold.glb',
  shovel_diamond: '/models/weapons/Shovel_Diamond.glb',

  // Axes (all tiers)
  axe_wood: '/models/weapons/Axe_Wood.glb',
  axe_stone: '/models/weapons/Axe_Stone.glb',
  axe_gold: '/models/weapons/Axe_Gold.glb',
  axe_diamond: '/models/weapons/Axe_Diamond.glb',

  // Legacy mappings
  'twin-daggers': '/models/weapons/Sword_Wood.glb',
  trident: '/models/weapons/Sword_Gold.glb',
  'short-bow': '/models/weapons/Axe_Wood.glb',
  crossbow: '/models/weapons/Axe_Stone.glb',
  'fire-staff': '/models/weapons/Pickaxe_Gold.glb',
  'ice-wand': '/models/weapons/Pickaxe_Diamond.glb',
  'lightning-rod': '/models/weapons/Shovel_Gold.glb',
  'crystal-sling': '/models/weapons/Shovel_Diamond.glb',
};

// =============================================================================
// CubeWorld Environment Models
// =============================================================================
export const ENVIRONMENT_MODELS = {
  // Trees
  tree1: '/models/environment/Tree_1.glb',
  tree2: '/models/environment/Tree_2.glb',
  tree3: '/models/environment/Tree_3.glb',
  deadTree1: '/models/environment/DeadTree_1.glb',
  deadTree2: '/models/environment/DeadTree_2.glb',
  deadTree3: '/models/environment/DeadTree_3.glb',

  // Chests
  chestClosed: '/models/environment/Chest_Closed.glb',
  chestOpen: '/models/environment/Chest_Open.glb',

  // Crystals
  crystalBig: '/models/environment/Crystal_Big.glb',
  crystalSmall: '/models/environment/Crystal_Small.glb',

  // Vegetation
  bush: '/models/environment/Bush.glb',
  flowers1: '/models/environment/Flowers_1.glb',
  flowers2: '/models/environment/Flowers_2.glb',
  grassBig: '/models/environment/Grass_Big.glb',
  grassSmall: '/models/environment/Grass_Small.glb',
  mushroom: '/models/environment/Mushroom.glb',
  plant2: '/models/environment/Plant_2.glb',
  plant3: '/models/environment/Plant_3.glb',

  // Bamboo
  bamboo: '/models/environment/Bamboo.glb',
  bambooMid: '/models/environment/Bamboo_Mid.glb',
  bambooSmall: '/models/environment/Bamboo_Small.glb',

  // Rocks
  rock1: '/models/environment/Rock1.glb',
  rock2: '/models/environment/Rock2.glb',
  stone: '/models/environment/Stone.glb',

  // Structures
  fenceCenter: '/models/environment/Fence_Center.glb',
  fenceCorner: '/models/environment/Fence_Corner.glb',
  fenceEnd: '/models/environment/Fence_End.glb',
  fenceT: '/models/environment/Fence_T.glb',
  doorClosed: '/models/environment/Door_Closed.glb',

  // Interactive
  key: '/models/environment/Key.glb',
  leverLeft: '/models/environment/Lever_Left.glb',
  leverRight: '/models/environment/Lever_Right.glb',
  button: '/models/environment/Button.glb',
  buttonPressed: '/models/environment/Button_Pressed.glb',
  cart: '/models/environment/Cart.glb',

  // Rails
  railStraight: '/models/environment/Rail_Straight.glb',
  railCorner: '/models/environment/Rail_Corner.glb',
  railIncline: '/models/environment/Rail_Incline.glb',
} as const;

// =============================================================================
// CubeWorld Animal Models (passive mobs, NPCs, hub decoration)
// =============================================================================
export const ANIMAL_MODELS = {
  cat: '/models/animals/Cat.glb',
  chick: '/models/animals/Chick.glb',
  chicken: '/models/animals/Chicken.glb',
  dog: '/models/animals/Dog.glb',
  horse: '/models/animals/Horse.glb',
  pig: '/models/animals/Pig.glb',
  raccoon: '/models/animals/Raccoon.glb',
  sheep: '/models/animals/Sheep.glb',
  wolf: '/models/animals/Wolf.glb',
} as const;

// =============================================================================
// CubeWorld Character Models (player/NPC)
// =============================================================================
export const CHARACTER_MODELS = {
  female1: '/models/characters/Character_Female_1.glb',
  female2: '/models/characters/Character_Female_2.glb',
  male1: '/models/characters/Character_Male_1.glb',
  male2: '/models/characters/Character_Male_2.glb',
} as const;

// =============================================================================
// CubeWorld Block Models (decorative 3D blocks)
// =============================================================================
export const BLOCK_MODELS = {
  grass: '/models/blocks/Block_Grass.glb',
  dirt: '/models/blocks/Block_Dirt.glb',
  stone: '/models/blocks/Block_Stone.glb',
  ice: '/models/blocks/Block_Ice.glb',
  snow: '/models/blocks/Block_Snow.glb',
  coal: '/models/blocks/Block_Coal.glb',
  diamond: '/models/blocks/Block_Diamond.glb',
  crystal: '/models/blocks/Block_Crystal.glb',
  metal: '/models/blocks/Block_Metal.glb',
  woodPlanks: '/models/blocks/Block_WoodPlanks.glb',
  brick: '/models/blocks/Block_Brick.glb',
  greyBricks: '/models/blocks/Block_GreyBricks.glb',
  crate: '/models/blocks/Block_Crate.glb',
  cheese: '/models/blocks/Block_Cheese.glb',
  blank: '/models/blocks/Block_Blank.glb',
} as const;

// Legacy alias
export const PROP_MODELS = ENVIRONMENT_MODELS;

/**
 * Load an enemy model, position it, and add to scene.
 * Falls back to a colored box if loading fails.
 */
/**
 * Load an enemy model, position it, and add to scene.
 * Throws if the model doesn't exist or fails to load — NO silent fallbacks.
 */
export async function spawnEnemyModel(
  scene: THREE.Scene,
  enemyType: string,
  position: { x: number; y: number; z: number },
  scale = 0.8,
): Promise<THREE.Object3D> {
  const modelPath = ENEMY_MODELS[enemyType];
  if (!modelPath) {
    throw new Error(`[Bok] No model mapping for enemy type "${enemyType}". Add it to ENEMY_MODELS in models.ts`);
  }

  const model = await loadModel(modelPath);
  model.scale.setScalar(scale);
  model.position.set(position.x, position.y, position.z);
  scene.add(model);
  return model;
}

/**
 * Load a weapon model for center-mount display.
 */
/**
 * Load a weapon model. Throws if not found — NO silent null returns.
 */
export async function loadWeaponModel(weaponId: string): Promise<THREE.Group> {
  const path = WEAPON_MODELS[weaponId];
  if (!path) {
    throw new Error(`[Bok] No model mapping for weapon "${weaponId}". Add it to WEAPON_MODELS in models.ts`);
  }
  return await loadModel(path);
}
