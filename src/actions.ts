/**
 * @module actions
 * @role Entity spawn/destroy actions using Koota createActions
 *
 * Follows Koota convention: centralized action factory.
 * Each action creates entities with the right trait composition.
 */
import { createActions } from 'koota';
import { Vector3 } from 'three';
import {
  AIState,
  ChestState,
  ContactDamage,
  ContentId,
  Health,
  Interactable,
  IsAnimal,
  IsBoss,
  IsChest,
  IsEnemy,
  IsNPC,
  IsPlayer,
  IsProp,
  IsTool,
  ModelPath,
  Movement,
  Ref,
  Stamina,
  Transform,
  WeaponStats,
  YukaRef,
} from './traits';

/** Asset base path for CubeWorld models. */
const MODELS = '/assets/models';

export const actions = createActions((world) => ({
  // --- Player ---
  spawnPlayer: (x = 0, z = 0) => {
    return world.spawn(
      IsPlayer,
      Transform({ position: new Vector3(x, 0, z) }),
      Movement({ maxSpeed: 6, damping: 0.95 }),
      Health({ current: 100, max: 100 }),
      Stamina,
      WeaponStats,
    );
  },

  // --- Enemies ---
  spawnEnemy: (options: {
    type: string;
    x: number;
    y: number;
    z: number;
    health: number;
    damage: number;
    speed: number;
    modelName: string;
  }) => {
    return world.spawn(
      IsEnemy,
      ContentId({ id: options.type, category: 'enemy' }),
      Transform({ position: new Vector3(options.x, options.y, options.z) }),
      Movement({ maxSpeed: options.speed, damping: 0.95 }),
      Health({ current: options.health, max: options.health }),
      ContactDamage({ damage: options.damage, cooldown: 1.5, timer: 0 }),
      AIState({ state: 'patrol' }),
      YukaRef,
      ModelPath({ path: `${MODELS}/Enemies/${options.modelName}.gltf` }),
      Ref,
    );
  },

  // --- Boss ---
  spawnBoss: (options: { type: string; x: number; y: number; z: number; health: number; modelName: string }) => {
    return world.spawn(
      IsEnemy,
      IsBoss,
      ContentId({ id: options.type, category: 'boss' }),
      Transform({ position: new Vector3(options.x, options.y, options.z) }),
      Movement({ maxSpeed: 2, damping: 0.9 }),
      Health({ current: options.health, max: options.health }),
      ContactDamage({ damage: 20, cooldown: 2, timer: 0 }),
      AIState({ state: 'idle' }),
      YukaRef,
      ModelPath({ path: `${MODELS}/Enemies/${options.modelName}.gltf` }),
      Ref,
    );
  },

  // --- Animals ---
  spawnAnimal: (options: { type: string; x: number; y: number; z: number }) => {
    const modelNames: Record<string, string> = {
      cat: 'Cat',
      dog: 'Dog',
      horse: 'Horse',
      pig: 'Pig',
      sheep: 'Sheep',
      wolf: 'Wolf',
      chicken: 'Chicken',
      chick: 'Chick',
      raccoon: 'Raccoon',
    };
    return world.spawn(
      IsAnimal,
      ContentId({ id: options.type, category: 'animal' }),
      Transform({ position: new Vector3(options.x, options.y, options.z) }),
      Movement({ maxSpeed: 2, damping: 0.9 }),
      AIState({ state: 'wander' }),
      ModelPath({ path: `${MODELS}/Animals/${modelNames[options.type] ?? 'Sheep'}.gltf` }),
      Ref,
    );
  },

  // --- Chests ---
  spawnChest: (options: { x: number; y: number; z: number; tier: 'wooden' | 'iron' | 'crystal' }) => {
    return world.spawn(
      IsChest,
      Transform({ position: new Vector3(options.x, options.y, options.z) }),
      ChestState({ opened: false, tier: options.tier }),
      Interactable({ range: 1.5, type: 'chest' }),
      ModelPath({ path: `${MODELS}/Environment/Chest_Closed.gltf` }),
      Ref,
    );
  },

  // --- Environment Props ---
  spawnProp: (options: { type: string; x: number; y: number; z: number; modelFile: string }) => {
    return world.spawn(
      IsProp,
      ContentId({ id: options.type, category: 'prop' }),
      Transform({ position: new Vector3(options.x, options.y, options.z) }),
      ModelPath({ path: `${MODELS}/Environment/${options.modelFile}.gltf` }),
      Ref,
    );
  },

  // --- Tools/Weapons ---
  spawnTool: (options: { weaponId: string; modelFile: string; damage: number; speed: number; range: number }) => {
    return world.spawn(
      IsTool,
      ContentId({ id: options.weaponId, category: 'weapon' }),
      WeaponStats({
        baseDamage: options.damage,
        attackSpeed: options.speed,
        range: options.range,
        weaponId: options.weaponId,
      }),
      ModelPath({ path: `${MODELS}/Tools/${options.modelFile}.gltf` }),
      Ref,
    );
  },

  // --- NPCs ---
  spawnNPC: (options: { id: string; x: number; y: number; z: number; modelFile: string }) => {
    return world.spawn(
      IsNPC,
      ContentId({ id: options.id, category: 'prop' }),
      Transform({ position: new Vector3(options.x, options.y, options.z) }),
      Interactable({ range: 3, type: 'npc' }),
      ModelPath({ path: `${MODELS}/Characters/${options.modelFile}.gltf` }),
      Ref,
    );
  },

  // --- Cleanup ---
  destroyAllEnemies: () => {
    for (const enemy of world.query(IsEnemy)) {
      enemy.destroy();
    }
  },
}));
