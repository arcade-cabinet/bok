/**
 * @module engine/models
 * @role Load GLB models from public/models/ and instantiate in scene
 * @input Three.js scene, model path
 * @output Loaded THREE.Group clones positioned in scene
 */
import * as THREE from 'three';
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

/** Enemy model paths mapped to enemy type */
export const ENEMY_MODELS: Record<string, string> = {
  slime: '/models/enemies/Hedgehog.glb',
  skeleton: '/models/enemies/Skeleton.glb',
  'skeleton-archer': '/models/enemies/Skeleton_Armor.glb',
  goblin: '/models/enemies/Goblin.glb',
  zombie: '/models/enemies/Zombie.glb',
  wolf: '/models/enemies/Wolf.glb',
  demon: '/models/enemies/Demon.glb',
  wizard: '/models/enemies/Wizard.glb',
  yeti: '/models/enemies/Yeti.glb',
  giant: '/models/enemies/Giant.glb',
  'frost-wolf': '/models/enemies/Wolf.glb',
  scorpion: '/models/enemies/Crab.glb',
  'ice-golem': '/models/enemies/Cyclops.glb',
  'fire-imp': '/models/enemies/GreenDemon.glb',
  'lava-elemental': '/models/enemies/Dragon.glb',
  'swamp-lurker': '/models/enemies/Frog.glb',
  'bog-witch': '/models/enemies/Witch.glb',
  'crystal-sentinel': '/models/enemies/Goleling.glb',
  'gem-spider': '/models/enemies/Spider.glb',
  'sky-hawk': '/models/enemies/Armabee.glb',
  'wind-elemental': '/models/enemies/Hywirl.glb',
  'depth-crawler': '/models/enemies/Squidle.glb',
  'angler-fish': '/models/enemies/Anglerfish.glb',
  'sand-wraith': '/models/enemies/Wraith.glb',
  // Boss models — mapped to thematically fitting GLBs
  'ancient-treant': '/models/enemies/Giant.glb',
  'pharaoh-construct': '/models/enemies/Cyclops.glb',
  'frost-wyrm': '/models/enemies/Dragon.glb',
  'magma-king': '/models/enemies/Demon.glb',
  'mire-hag': '/models/enemies/Witch.glb',
  'crystal-hydra': '/models/enemies/Dragon.glb',
  'storm-titan': '/models/enemies/Giant.glb',
  'abyssal-leviathan': '/models/enemies/Squidle.glb',
};

/** Weapon model paths mapped to weapon ID */
export const WEAPON_MODELS: Record<string, string> = {
  'wooden-sword': '/models/weapons/Sword_Wood.glb',
  'iron-sword': '/models/weapons/Sword_Stone.glb',
  'crystal-blade': '/models/weapons/Sword_Diamond.glb',
  'volcanic-edge': '/models/weapons/Sword_Gold.glb',
  'battle-axe': '/models/weapons/Axe_Wood.glb',
  'war-hammer': '/models/weapons/Hammer_Double.glb',
  'twin-daggers': '/models/weapons/Dagger.glb',
  trident: '/models/weapons/Spear.glb',
  'short-bow': '/models/weapons/Bow.glb',
  crossbow: '/models/weapons/Crossbow.glb',
  'fire-staff': '/models/weapons/Staff.glb',
  'ice-wand': '/models/weapons/Wand.glb',
  'lightning-rod': '/models/weapons/IceStaff.glb',
  'frost-cleaver': '/models/weapons/psx-cleaver.glb',
  // TODO: crystal-sling needs a dedicated model — no suitable sling/slingshot found in asset library
  'psx-sword': '/models/weapons/psx-sword.glb',
  'psx-axe': '/models/weapons/psx-axe.glb',
  'psx-katana': '/models/weapons/psx-katana.glb',
  'psx-axe-heavy': '/models/weapons/psx-axe-heavy.glb',
  'psx-hammer': '/models/weapons/psx-hammer.glb',
  'psx-machete': '/models/weapons/psx-machete.glb',
  'psx-pickaxe': '/models/weapons/psx-pickaxe.glb',
  'psx-sickle': '/models/weapons/psx-sickle.glb',
  'psx-shovel': '/models/weapons/psx-shovel.glb',
};

/** Prop model paths */
export const PROP_MODELS = {
  chestClosed: '/models/props/Chest_Closed.glb',
  chestOpen: '/models/props/Chest_Open.glb',
  crystal: '/models/props/Crystal_Big.glb',
  mushroom: '/models/props/Mushroom.glb',
  key: '/models/props/Key.glb',
};

/**
 * Load an enemy model, position it, and add to scene.
 * Falls back to a colored box if loading fails.
 */
export async function spawnEnemyModel(
  scene: THREE.Scene,
  enemyType: string,
  position: { x: number; y: number; z: number },
  scale = 0.8,
): Promise<THREE.Object3D> {
  const modelPath = ENEMY_MODELS[enemyType];
  if (!modelPath) {
    // Fallback: red box
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.4, 0.7),
      new THREE.MeshLambertMaterial({ color: 0xcc2222 }),
    );
    mesh.position.set(position.x, position.y, position.z);
    scene.add(mesh);
    return mesh;
  }

  try {
    const model = await loadModel(modelPath);
    model.scale.setScalar(scale);
    model.position.set(position.x, position.y, position.z);
    scene.add(model);
    return model;
  } catch {
    // Fallback on load error
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.4, 0.7),
      new THREE.MeshLambertMaterial({ color: 0xcc2222 }),
    );
    mesh.position.set(position.x, position.y, position.z);
    scene.add(mesh);
    return mesh;
  }
}

/**
 * Load a weapon model for center-mount display.
 */
export async function loadWeaponModel(weaponId: string): Promise<THREE.Group | null> {
  const path = WEAPON_MODELS[weaponId];
  if (!path) return null;
  try {
    return await loadModel(path);
  } catch {
    return null;
  }
}
