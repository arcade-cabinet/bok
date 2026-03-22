/**
 * @module engine/models
 * @role Load glTF models from public/assets/models/ (CubeWorld asset pack)
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
 * Load a glTF model from public/assets/models/. Caches by path.
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
  skeleton: '/assets/models/Enemies/Skeleton.gltf',
  'skeleton-archer': '/assets/models/Enemies/Skeleton_Armor.gltf',
  goblin: '/assets/models/Enemies/Goblin.gltf',
  zombie: '/assets/models/Enemies/Zombie.gltf',
  demon: '/assets/models/Enemies/Demon.gltf',
  wizard: '/assets/models/Enemies/Wizard.gltf',
  yeti: '/assets/models/Enemies/Yeti.gltf',
  giant: '/assets/models/Enemies/Giant.gltf',
  hedgehog: '/assets/models/Enemies/Hedgehog.gltf',

  // --- Biome enemy mappings (CubeWorld best-fit) ---
  slime: '/assets/models/Enemies/Hedgehog.gltf',
  'sand-wraith': '/assets/models/Enemies/Wizard.gltf',
  scorpion: '/assets/models/Enemies/Hedgehog.gltf',
  'frost-wolf': '/assets/models/Animals/Wolf.gltf',
  'ice-golem': '/assets/models/Enemies/Giant.gltf',
  'fire-imp': '/assets/models/Enemies/Goblin.gltf',
  'lava-elemental': '/assets/models/Enemies/Demon.gltf',
  'swamp-lurker': '/assets/models/Enemies/Zombie.gltf',
  'bog-witch': '/assets/models/Enemies/Wizard.gltf',
  'crystal-sentinel': '/assets/models/Enemies/Skeleton_Armor.gltf',
  'gem-spider': '/assets/models/Enemies/Hedgehog.gltf',
  'sky-hawk': '/assets/models/Animals/Chicken.gltf',
  'wind-elemental': '/assets/models/Enemies/Wizard.gltf',
  'depth-crawler': '/assets/models/Enemies/Zombie.gltf',
  'angler-fish': '/assets/models/Enemies/Hedgehog.gltf',

  // --- Boss models ---
  'ancient-treant': '/assets/models/Enemies/Giant.gltf',
  'pharaoh-construct': '/assets/models/Enemies/Skeleton_Armor.gltf',
  'frost-wyrm': '/assets/models/Enemies/Yeti.gltf',
  'magma-king': '/assets/models/Enemies/Demon.gltf',
  'mire-hag': '/assets/models/Enemies/Wizard.gltf',
  'crystal-hydra': '/assets/models/Enemies/Giant.gltf',
  'storm-titan': '/assets/models/Enemies/Giant.gltf',
  'abyssal-leviathan': '/assets/models/Enemies/Demon.gltf',
};

// =============================================================================
// CubeWorld Weapon/Tool Models — 4 tiers (Wood → Stone → Gold → Diamond)
// =============================================================================
export const WEAPON_MODELS: Record<string, string> = {
  // Swords
  'wooden-sword': '/assets/models/Tools/Sword_Wood.gltf',
  'iron-sword': '/assets/models/Tools/Sword_Stone.gltf',
  'crystal-blade': '/assets/models/Tools/Sword_Diamond.gltf',
  'volcanic-edge': '/assets/models/Tools/Sword_Gold.gltf',
  'frost-cleaver': '/assets/models/Tools/Sword_Diamond.gltf',

  // Axes
  'battle-axe': '/assets/models/Tools/Axe_Wood.gltf',
  'war-hammer': '/assets/models/Tools/Pickaxe_Stone.gltf',

  // Pickaxes (mining tools — double as weapons)
  pickaxe_wood: '/assets/models/Tools/Pickaxe_Wood.gltf',
  pickaxe_stone: '/assets/models/Tools/Pickaxe_Stone.gltf',
  pickaxe_gold: '/assets/models/Tools/Pickaxe_Gold.gltf',
  pickaxe_diamond: '/assets/models/Tools/Pickaxe_Diamond.gltf',

  // Shovels
  shovel_wood: '/assets/models/Tools/Shovel_Wood.gltf',
  shovel_stone: '/assets/models/Tools/Shovel_Stone.gltf',
  shovel_gold: '/assets/models/Tools/Shovel_Gold.gltf',
  shovel_diamond: '/assets/models/Tools/Shovel_Diamond.gltf',

  // Axes (all tiers)
  axe_wood: '/assets/models/Tools/Axe_Wood.gltf',
  axe_stone: '/assets/models/Tools/Axe_Stone.gltf',
  axe_gold: '/assets/models/Tools/Axe_Gold.gltf',
  axe_diamond: '/assets/models/Tools/Axe_Diamond.gltf',

  // Legacy mappings
  'twin-daggers': '/assets/models/Tools/Sword_Wood.gltf',
  trident: '/assets/models/Tools/Sword_Gold.gltf',
  'short-bow': '/assets/models/Tools/Axe_Wood.gltf',
  crossbow: '/assets/models/Tools/Axe_Stone.gltf',
  'fire-staff': '/assets/models/Tools/Pickaxe_Gold.gltf',
  'ice-wand': '/assets/models/Tools/Pickaxe_Diamond.gltf',
  'lightning-rod': '/assets/models/Tools/Shovel_Gold.gltf',
  'crystal-sling': '/assets/models/Tools/Shovel_Diamond.gltf',
};

// =============================================================================
// CubeWorld Environment Models
// =============================================================================
export const ENVIRONMENT_MODELS = {
  // Trees
  tree1: '/assets/models/Environment/Tree_1.gltf',
  tree2: '/assets/models/Environment/Tree_2.gltf',
  tree3: '/assets/models/Environment/Tree_3.gltf',
  deadTree1: '/assets/models/Environment/DeadTree_1.gltf',
  deadTree2: '/assets/models/Environment/DeadTree_2.gltf',
  deadTree3: '/assets/models/Environment/DeadTree_3.gltf',

  // Chests
  chestClosed: '/assets/models/Environment/Chest_Closed.gltf',
  chestOpen: '/assets/models/Environment/Chest_Open.gltf',

  // Crystals
  crystalBig: '/assets/models/Environment/Crystal_Big.gltf',
  crystalSmall: '/assets/models/Environment/Crystal_Small.gltf',

  // Vegetation
  bush: '/assets/models/Environment/Bush.gltf',
  flowers1: '/assets/models/Environment/Flowers_1.gltf',
  flowers2: '/assets/models/Environment/Flowers_2.gltf',
  grassBig: '/assets/models/Environment/Grass_Big.gltf',
  grassSmall: '/assets/models/Environment/Grass_Small.gltf',
  mushroom: '/assets/models/Environment/Mushroom.gltf',
  plant2: '/assets/models/Environment/Plant_2.gltf',
  plant3: '/assets/models/Environment/Plant_3.gltf',

  // Bamboo
  bamboo: '/assets/models/Environment/Bamboo.gltf',
  bambooMid: '/assets/models/Environment/Bamboo_Mid.gltf',
  bambooSmall: '/assets/models/Environment/Bamboo_Small.gltf',

  // Rocks
  rock1: '/assets/models/Environment/Rock1.gltf',
  rock2: '/assets/models/Environment/Rock2.gltf',
  stone: '/assets/models/Environment/Rock1.gltf',

  // Structures
  fenceCenter: '/assets/models/Environment/Fence_Center.gltf',
  fenceCorner: '/assets/models/Environment/Fence_Corner.gltf',
  fenceEnd: '/assets/models/Environment/Fence_End.gltf',
  fenceT: '/assets/models/Environment/Fence_T.gltf',
  doorClosed: '/assets/models/Environment/Door_Closed.gltf',

  // Interactive
  key: '/assets/models/Environment/Key.gltf',
  leverLeft: '/assets/models/Environment/Lever_Left.gltf',
  leverRight: '/assets/models/Environment/Lever_Right.gltf',
  button: '/assets/models/Environment/Button.gltf',
  buttonPressed: '/assets/models/Environment/Button.gltf',
  cart: '/assets/models/Environment/Cart.gltf',

  // Rails
  railStraight: '/assets/models/Environment/Rail_Straight.gltf',
  railCorner: '/assets/models/Environment/Rail_Corner.gltf',
  railIncline: '/assets/models/Environment/Rail_Incline.gltf',
} as const;

// =============================================================================
// CubeWorld Animal Models (passive mobs, NPCs, hub decoration)
// =============================================================================
export const ANIMAL_MODELS = {
  cat: '/assets/models/Animals/Cat.gltf',
  chick: '/assets/models/Animals/Chick.gltf',
  chicken: '/assets/models/Animals/Chicken.gltf',
  dog: '/assets/models/Animals/Dog.gltf',
  horse: '/assets/models/Animals/Horse.gltf',
  pig: '/assets/models/Animals/Pig.gltf',
  raccoon: '/assets/models/Animals/Raccoon.gltf',
  sheep: '/assets/models/Animals/Sheep.gltf',
  wolf: '/assets/models/Animals/Wolf.gltf',
} as const;

// =============================================================================
// CubeWorld Character Models (player/NPC)
// =============================================================================
export const CHARACTER_MODELS = {
  female1: '/assets/models/Characters/Character_Female_1.gltf',
  female2: '/assets/models/Characters/Character_Female_2.gltf',
  male1: '/assets/models/Characters/Character_Male_1.gltf',
  male2: '/assets/models/Characters/Character_Male_2.gltf',
} as const;

// =============================================================================
// CubeWorld Block Models (decorative 3D blocks)
// =============================================================================
export const BLOCK_MODELS = {
  grass: '/assets/models/Blocks/Block_Grass.gltf',
  dirt: '/assets/models/Blocks/Block_Dirt.gltf',
  stone: '/assets/models/Blocks/Block_Stone.gltf',
  ice: '/assets/models/Blocks/Block_Ice.gltf',
  snow: '/assets/models/Blocks/Block_Snow.gltf',
  coal: '/assets/models/Blocks/Block_Coal.gltf',
  diamond: '/assets/models/Blocks/Block_Diamond.gltf',
  crystal: '/assets/models/Blocks/Block_Crystal.gltf',
  metal: '/assets/models/Blocks/Block_Metal.gltf',
  woodPlanks: '/assets/models/Blocks/Block_WoodPlanks.gltf',
  brick: '/assets/models/Blocks/Block_Brick.gltf',
  greyBricks: '/assets/models/Blocks/Block_GreyBricks.gltf',
  crate: '/assets/models/Blocks/Block_Crate.gltf',
  cheese: '/assets/models/Blocks/Block_Cheese.gltf',
  blank: '/assets/models/Blocks/Block_Blank.gltf',
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
