/**
 * @module engine/models
 * @role Load glTF models via JollyPixel ModelRenderer + AssetManager or raw GLTFLoader
 * @input JpWorld (preferred) or Three.js scene, model path
 * @output JollyPixel Actors with ModelRenderer, or loaded THREE.Group clones
 *
 * All models are from the CubeWorld pack — one cohesive art style.
 *
 * ## JollyPixel ModelRenderer integration
 *
 * When a `JpWorld` reference is available, models are loaded through JollyPixel's
 * `ModelRenderer` ActorComponent, which delegates to the global `Systems.Assets`
 * AssetManager singleton. This provides:
 * - Centralized asset deduplication and batching
 * - Lifecycle-aware loading (assets queued before `loadRuntime()` are batch-loaded)
 * - Built-in animation support via `ModelRenderer.animation`
 * - Proper cleanup via `actor.destroy()`
 *
 * ### Loading lifecycle constraint
 *
 * `ModelRenderer` enqueues assets via the global `Assets.load()` in its constructor.
 * The actual model data is not available until `loadRuntime()` calls
 * `Assets.loadAssets()` and then `runtime.start()` triggers `awake()` on all actors.
 * The actor's `object3D` (THREE.Group) is immediately available for positioning,
 * but the model mesh children are added during `awake()`.
 *
 * After `loadRuntime()`, autoload is enabled — new `ModelRenderer` instances will
 * have their assets loaded via a microtask (setTimeout) in `scheduleAutoload()`.
 *
 * ### Fallback
 *
 * The raw `loadModel()` function remains for contexts without a JpWorld reference
 * (e.g., hub view, isolated tests). It uses a standalone GLTFLoader with its own cache.
 */
import { ModelRenderer, Systems } from '@jolly-pixel/engine';
import type * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import type { JpWorld } from './types.ts';

// =============================================================================
// JollyPixel actor-based model loading (preferred)
// =============================================================================

/** Result from `spawnModelActor()` — the JollyPixel actor and its scene object. */
export interface ModelActorResult {
  /** JollyPixel Actor owning the ModelRenderer component. Call `actor.destroy()` to clean up. */
  actor: ReturnType<JpWorld['createActor']>;
  /** The actor's THREE.Group — immediately positionable; model children added after awake(). */
  object3D: THREE.Object3D;
  /** ModelRenderer component — access `.animation` for clip playback after awake(). */
  renderer: ModelRenderer;
}

/**
 * Create a JollyPixel actor with a ModelRenderer component.
 *
 * The model is enqueued for loading via the global AssetManager. The actor's
 * `object3D` is positioned immediately, but model geometry is added during the
 * `awake()` lifecycle phase (after `loadRuntime()` batch-loads assets).
 *
 * Use this for entities created during game setup (before `loadRuntime()`).
 * After `loadRuntime()`, autoload is enabled so new actors will have their
 * models loaded automatically via a microtask.
 *
 * @param jpWorld   JollyPixel World instance (creates the actor).
 * @param name      Actor name (for debugging / scene graph).
 * @param modelPath Path to glTF/GLB file (relative to public/).
 * @param position  World position for the actor.
 * @param scale     Uniform scale (default 1).
 */
export function spawnModelActor(
  jpWorld: JpWorld,
  name: string,
  modelPath: string,
  position: { x: number; y: number; z: number },
  scale = 1,
): ModelActorResult {
  const actor = jpWorld.createActor(name);
  const renderer = actor.addComponentAndGet(ModelRenderer, { path: modelPath });
  // Position via the underlying Three.js Group (Transform uses setLocalPosition)
  actor.object3D.position.set(position.x, position.y, position.z);
  actor.object3D.scale.setScalar(scale);
  return { actor, object3D: actor.object3D, renderer };
}

/**
 * Create a JollyPixel actor with a ModelRenderer, forcing an immediate asset load.
 *
 * The model is enqueued and then immediately batch-loaded via `Assets.loadAssets()`.
 * Use this for on-demand spawning after the game is running when you need the model
 * geometry available before the next frame.
 *
 * @param jpWorld   JollyPixel World instance.
 * @param name      Actor name.
 * @param modelPath Path to glTF/GLB file.
 * @param position  World position.
 * @param scale     Uniform scale (default 1).
 */
export async function spawnModelActorAsync(
  jpWorld: JpWorld,
  name: string,
  modelPath: string,
  position: { x: number; y: number; z: number },
  scale = 1,
): Promise<ModelActorResult> {
  const actor = jpWorld.createActor(name);
  const renderer = actor.addComponentAndGet(ModelRenderer, { path: modelPath });
  actor.object3D.position.set(position.x, position.y, position.z);
  actor.object3D.scale.setScalar(scale);

  // Force immediate load of any waiting assets (including the one we just enqueued)
  await Systems.Assets.loadAssets(Systems.Assets.context);

  return { actor, object3D: actor.object3D, renderer };
}

// =============================================================================
// Raw GLTFLoader fallback (no JpWorld required)
// =============================================================================

const loader = new GLTFLoader();
const cache = new Map<string, THREE.Group>();

/**
 * Load a glTF model from public/assets/models/. Caches by path.
 * Returns a clone of the loaded scene group.
 *
 * @deprecated Prefer `spawnModelActor()` or `spawnModelActorAsync()` when
 * a JpWorld reference is available. This fallback uses a standalone GLTFLoader
 * without AssetManager deduplication or lifecycle integration.
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

/**
 * Clear the raw GLTFLoader cache (useful for level transitions).
 * Does NOT affect the JollyPixel AssetManager cache.
 */
export function clearModelCache(): void {
  cache.clear();
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

  // --- Voxel-converted environment pieces ---
  voxGrass1: '/assets/models/Environment/grass1.gltf',
  voxGrass2: '/assets/models/Environment/grass2.gltf',
  voxGrass3: '/assets/models/Environment/grass3.gltf',
  voxGrassFlower1: '/assets/models/Environment/grassflower1.gltf',
  voxGrassFlower2: '/assets/models/Environment/grassflower2.gltf',
  voxGrassMushroom: '/assets/models/Environment/grassmushroom.gltf',
  voxTree: '/assets/models/Environment/tree.gltf',
  voxTree1: '/assets/models/Environment/tree1.gltf',
  voxTree2: '/assets/models/Environment/tree2.gltf',
  voxBox1: '/assets/models/Environment/box1.gltf',
  voxBox2: '/assets/models/Environment/box2.gltf',
  voxWalkTile: '/assets/models/Environment/walktile.gltf',
  voxNoGrass: '/assets/models/Environment/nograss.gltf',
} as const;

// =============================================================================
// CubeWorld Animal Models (passive mobs, NPCs, hub decoration)
// =============================================================================
export const ANIMAL_MODELS = {
  // --- CubeWorld core animals ---
  cat: '/assets/models/Animals/Cat.gltf',
  chick: '/assets/models/Animals/Chick.gltf',
  chicken: '/assets/models/Animals/Chicken.gltf',
  dog: '/assets/models/Animals/Dog.gltf',
  horse: '/assets/models/Animals/Horse.gltf',
  pig: '/assets/models/Animals/Pig.gltf',
  raccoon: '/assets/models/Animals/Raccoon.gltf',
  sheep: '/assets/models/Animals/Sheep.gltf',
  wolf: '/assets/models/Animals/Wolf.gltf',

  // --- Voxel-converted animals ---
  axolotl: '/assets/models/Animals/axolotl.gltf',
  bear: '/assets/models/Animals/bear.gltf',
  bunny: '/assets/models/Animals/bunny.gltf',
  cow: '/assets/models/Animals/cow.gltf',
  crocodile: '/assets/models/Animals/crocodile.gltf',
  elephant: '/assets/models/Animals/elephant.gltf',
  fox: '/assets/models/Animals/fox.gltf',
  frog: '/assets/models/Animals/frog.gltf',
  mole: '/assets/models/Animals/mole.gltf',
  monkey: '/assets/models/Animals/monkey.gltf',
  mouse: '/assets/models/Animals/mouse.gltf',
  panda: '/assets/models/Animals/panda.gltf',
  parrot: '/assets/models/Animals/parrot.gltf',
  penguin: '/assets/models/Animals/penguin.gltf',
  piglet: '/assets/models/Animals/piglet.gltf',
  turtle: '/assets/models/Animals/turtle.gltf',
  unicorn: '/assets/models/Animals/unicorn.gltf',
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

// =============================================================================
// Pixel Block Models (styled voxel block variants — different art style from CubeWorld Blocks)
// =============================================================================
export const PIXEL_BLOCK_MODELS = {
  pixelBlank: '/assets/models/Pixel Blocks/Block_Blank.gltf',
  pixelSquare: '/assets/models/Pixel Blocks/Block_Square.gltf',
  pixelBricksDark: '/assets/models/Pixel Blocks/Bricks_Dark.gltf',
  pixelBricksGrey: '/assets/models/Pixel Blocks/Bricks_Grey.gltf',
  pixelBricksRed: '/assets/models/Pixel Blocks/Bricks_Red.gltf',
  pixelBricksYellow: '/assets/models/Pixel Blocks/Bricks_Yellow.gltf',
  pixelCoal: '/assets/models/Pixel Blocks/Coal.gltf',
  pixelDiamond: '/assets/models/Pixel Blocks/Diamond.gltf',
  pixelDirt: '/assets/models/Pixel Blocks/Dirt.gltf',
  pixelExclamation: '/assets/models/Pixel Blocks/Exclamation.gltf',
  pixelGrass: '/assets/models/Pixel Blocks/Grass.gltf',
  pixelIce: '/assets/models/Pixel Blocks/Ice.gltf',
  pixelLeaves: '/assets/models/Pixel Blocks/Leaves.gltf',
  pixelQuestionMark: '/assets/models/Pixel Blocks/QuestionMark.gltf',
  pixelSnow: '/assets/models/Pixel Blocks/Snow.gltf',
  pixelStone: '/assets/models/Pixel Blocks/Stone.gltf',
  pixelWood: '/assets/models/Pixel Blocks/Wood.gltf',
  pixelWoodPlanks: '/assets/models/Pixel Blocks/WoodPlanks.gltf',
} as const;

// =============================================================================
// Voxel Object Models (from itch pack — barrels, torches, doors, etc.)
// =============================================================================
export const OBJECT_MODELS = {
  banner: '/assets/models/Objects/Banner.gltf',
  barrel: '/assets/models/Objects/Barrel.gltf',
  blacksmithSign: '/assets/models/Objects/Blacksmith_Sign.gltf',
  bookOpen: '/assets/models/Objects/book_open.gltf',
  corpse: '/assets/models/Objects/corpse_skeleton.gltf',
  crate: '/assets/models/Objects/Crate.gltf',
  cratesMultiple: '/assets/models/Objects/Crates_Multiple.gltf',
  door: '/assets/models/Objects/Door_Reg.gltf',
  drawGate: '/assets/models/Objects/Draw_Gate.gltf',
  fire: '/assets/models/Objects/Fire.gltf',
  fireBlue: '/assets/models/Objects/Fire_Blue.gltf',
  fishingStatue: '/assets/models/Objects/Fishing_Statue.gltf',
  fishingStatueRod: '/assets/models/Objects/Fishing_Statue_W_Rod.gltf',
  fishingStatueMossy: '/assets/models/Objects/Fishing_Statue_W_Rod_Mossy.gltf',
  flowerRed: '/assets/models/Objects/Flower_Red.gltf',
  gateOpen: '/assets/models/Objects/gate_opened.gltf',
  gateClosed: '/assets/models/Objects/gate_closed.gltf',
  gravestone1: '/assets/models/Objects/Gravestone_1.gltf',
  gravestone1W: '/assets/models/Objects/Gravestone_1Weathered.gltf',
  gravestone2: '/assets/models/Objects/Gravestone_2.gltf',
  gravestone2W: '/assets/models/Objects/Gravestone_2Weathered.gltf',
  gravestone3: '/assets/models/Objects/Gravestone_3.gltf',
  gravestone3W: '/assets/models/Objects/Gravestone_3Weathered.gltf',
  marketStall: '/assets/models/Objects/Market_Stall.gltf',
  marketStallL: '/assets/models/Objects/Market_Stall_2x_L.gltf',
  marketStallR: '/assets/models/Objects/Market_Stall_2x_R.gltf',
  swordRusty: '/assets/models/Objects/Sword_Rusty.gltf',
  torchLong: '/assets/models/Objects/Torch_Long.gltf',
  torchBlue: '/assets/models/Objects/Torch_Long_Blue.gltf',
  tree: '/assets/models/Objects/Tree.gltf',
  treeBig: '/assets/models/Objects/Tree_Big.gltf',
  treeBirch: '/assets/models/Objects/Tree_Birch.gltf',
  treePine: '/assets/models/Objects/Tree_Pine.gltf',
  treeTrunk: '/assets/models/Objects/Tree_trunk.gltf',
  rope: '/assets/models/Objects/rope_tied_wood_pole_thing.gltf',
} as const;

// =============================================================================
// Village Building Pieces (modular house construction)
// =============================================================================
export const VILLAGE_MODELS = {
  chimney: '/assets/models/Village/CHIMNEY.gltf',
  cornerL: '/assets/models/Village/VILL_H_CNR_L.gltf',
  cornerR: '/assets/models/Village/VILL_H_CNR_R.gltf',
  roofDoorL: '/assets/models/Village/VILL_H_RD_W_L.gltf',
  roofL2: '/assets/models/Village/VILL_H_RF_W_L2.gltf',
  roofR: '/assets/models/Village/VILL_H_RF_W_R.gltf',
  roofR2: '/assets/models/Village/VILL_H_RF_W_R2.gltf',
  wallInvLR: '/assets/models/Village/VILL_H_W_INV_LR.gltf',
  wallInv: '/assets/models/Village/VILL_H_W_INV.gltf',
  wallLR: '/assets/models/Village/VILL_H_W_LR.gltf',
  wallSBeam: '/assets/models/Village/VILL_H_W_SBEAM.gltf',
  wallV1: '/assets/models/Village/VILL_H_W_V1.gltf',
  wallV2: '/assets/models/Village/VILL_H_W_V2.gltf',
  wallV2Inv: '/assets/models/Village/VILL_H_W_V2_INV.gltf',
  wallV3: '/assets/models/Village/VILL_H_W_V3.gltf',
  wallV4: '/assets/models/Village/VILL_H_W_V4.gltf',
  wallV45: '/assets/models/Village/VILL_H_W_V4.5.gltf',
  wallPlain: '/assets/models/Village/VILL_H_W_PLN.gltf',
  wall: '/assets/models/Village/VILL_H_W.gltf',
} as const;

// =============================================================================
// Stone/Dungeon Building Pieces (walls, pillars, ground tiles)
// =============================================================================
export const STONE_MODELS = {
  // --- Stone corners ---
  corner: '/assets/models/Stone/STN_CNR.gltf',
  cornerDark: '/assets/models/Stone/STN_CNR_DARK.gltf',

  // --- Stone floors ---
  floor: '/assets/models/Stone/STN_FLR.gltf',
  floorDark: '/assets/models/Stone/STN_FLR_DRK.gltf',
  floorGrass: '/assets/models/Stone/STN_FLR_GRSS.gltf',

  // --- Moss variants ---
  moss: '/assets/models/Stone/Moss.gltf',
  moss2D: '/assets/models/Stone/STN_MOSS_2D.gltf',
  moss3D: '/assets/models/Stone/STN_MOSS_3D.gltf',
  moss3DTop: '/assets/models/Stone/STN_MOSS_3D_TOP.gltf',
  mossHalf: '/assets/models/Stone/STN_MOSS_HALF_3D.gltf',
  mossHalfTop: '/assets/models/Stone/STN_MOSS_HALF_3D_TOP.gltf',

  // --- Pillars ---
  pillar: '/assets/models/Stone/STN_PLR.gltf',
  pillarDark: '/assets/models/Stone/STN_PLR_DARK.gltf',
  pillarLonger: '/assets/models/Stone/STN_PLR_LNGER.gltf',
  pillarLong: '/assets/models/Stone/STN_PLR_LNGR_DARK.gltf',

  // --- Stone walls ---
  wall: '/assets/models/Stone/STN_WALL.gltf',
  wallInv: '/assets/models/Stone/Stone_Wall_INV.gltf',
  wallBroken: '/assets/models/Stone/STN_WALL_BRKN.gltf',
  wallBrokenInv: '/assets/models/Stone/STN_WALL_BRKN_INV.gltf',
  wallDarkBroken: '/assets/models/Stone/STN_WALL_DARK_BRKN.gltf',
  wallDarkSmallBroken: '/assets/models/Stone/STN_WALL_DARK_sBRKN.gltf',
  wallDarkMid: '/assets/models/Stone/STN_WALL_DARK_MID.gltf',
  wallDarkRubble: '/assets/models/Stone/STN_WALL_DARK_RBL.gltf',
  wallDarkTop: '/assets/models/Stone/STN_WALL_DRK_TOP.gltf',
  wallRubble: '/assets/models/Stone/STN_WALL_RBL.gltf',

  // --- Forest ground tiles ---
  forestGrass: '/assets/models/Stone/FRST_GRASS.gltf',
  forestGrassSand: '/assets/models/Stone/FRST_GRASS_SAND.gltf',
  forestGrassSandCorner: '/assets/models/Stone/FRST_GRASS_SAND_CNR.gltf',
  treeGround: '/assets/models/Stone/STN_TREE_GRND.gltf',

  // --- Floor/ground pieces (F_G series) ---
  floorG: '/assets/models/Stone/F_G.gltf',
  floorG2: '/assets/models/Stone/F_G2.gltf',
  floorG2_5: '/assets/models/Stone/F_G2.5.gltf',
  floorG3: '/assets/models/Stone/F_G3.gltf',
  floorG4: '/assets/models/Stone/F_G4.gltf',
  floorG5: '/assets/models/Stone/F_G5.gltf',
  floorG6: '/assets/models/Stone/F_G6.gltf',
  floorG7: '/assets/models/Stone/F_G7.gltf',
  floorG8: '/assets/models/Stone/F_G8.gltf',
  floorG9: '/assets/models/Stone/F_G9.gltf',
  floorG10: '/assets/models/Stone/F_G10.gltf',
  floorG11: '/assets/models/Stone/F_G11.gltf',
  floorG12: '/assets/models/Stone/F_G12.gltf',
} as const;

// =============================================================================
// Collectible Items (food, resources — loot drops, chest contents)
// =============================================================================
export const COLLECTIBLE_MODELS = {
  apple: '/assets/models/Collectibles/apple.gltf',
  bamboo: '/assets/models/Collectibles/bamboo.gltf',
  banana: '/assets/models/Collectibles/banana.gltf',
  candy: '/assets/models/Collectibles/candy.gltf',
  carrot: '/assets/models/Collectibles/carrot.gltf',
  cheese: '/assets/models/Collectibles/cheese.gltf',
  corn: '/assets/models/Collectibles/corn.gltf',
  fish: '/assets/models/Collectibles/fish.gltf',
  honey: '/assets/models/Collectibles/honey.gltf',
  melon: '/assets/models/Collectibles/melon.gltf',
  worm: '/assets/models/Collectibles/worm.gltf',
} as const;

/**
 * Spawn an enemy as a JollyPixel actor with ModelRenderer.
 * The actor's object3D is positioned immediately; model mesh loads during awake().
 * Returns the actor result for Yuka binding and cleanup.
 *
 * Falls back to raw `loadModel()` + scene.add() if no jpWorld is provided.
 */
export function spawnEnemyModelActor(
  jpWorld: JpWorld,
  enemyType: string,
  position: { x: number; y: number; z: number },
  scale = 0.8,
): ModelActorResult {
  const modelPath = ENEMY_MODELS[enemyType];
  if (!modelPath) {
    throw new Error(`[Bok] No model mapping for enemy type "${enemyType}". Add it to ENEMY_MODELS in models.ts`);
  }

  return spawnModelActor(jpWorld, `enemy-${enemyType}`, modelPath, position, scale);
}

/**
 * Load an enemy model, position it, and add to scene.
 * Throws if the model doesn't exist or fails to load — NO silent fallbacks.
 *
 * @deprecated Prefer `spawnEnemyModelActor()` when a JpWorld is available.
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
 * Spawn a weapon as a JollyPixel actor with ModelRenderer.
 * Returns the actor result for camera attachment.
 */
export function spawnWeaponModelActor(
  jpWorld: JpWorld,
  weaponId: string,
  position: { x: number; y: number; z: number },
  scale = 0.4,
): ModelActorResult {
  const path = WEAPON_MODELS[weaponId];
  if (!path) {
    throw new Error(`[Bok] No model mapping for weapon "${weaponId}". Add it to WEAPON_MODELS in models.ts`);
  }

  return spawnModelActor(jpWorld, `weapon-${weaponId}`, path, position, scale);
}

/**
 * Load a weapon model. Throws if not found — NO silent null returns.
 *
 * @deprecated Prefer `spawnWeaponModelActor()` when a JpWorld is available.
 */
export async function loadWeaponModel(weaponId: string): Promise<THREE.Group> {
  const path = WEAPON_MODELS[weaponId];
  if (!path) {
    throw new Error(`[Bok] No model mapping for weapon "${weaponId}". Add it to WEAPON_MODELS in models.ts`);
  }
  return await loadModel(path);
}
