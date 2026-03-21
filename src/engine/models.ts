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
};

/** Weapon model paths mapped to weapon ID */
export const WEAPON_MODELS: Record<string, string> = {
  'wooden-sword': '/models/weapons/Sword_Wood.glb',
  'iron-sword': '/models/weapons/Sword_Stone.glb',
  'crystal-blade': '/models/weapons/Sword_Diamond.glb',
  'volcanic-edge': '/models/weapons/Sword_Gold.glb',
  'battle-axe': '/models/weapons/Axe_Wood.glb',
  'war-hammer': '/models/weapons/Pickaxe_Diamond.glb',
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
