/**
 * Global voxel accessor bridge.
 * The game engine sets these callbacks once the VoxelRenderer is ready.
 * ECS systems use getVoxelAt/isBlockSolid without importing Three.js.
 */

import { BLOCKS } from "./blocks.ts";

type VoxelGetter = (x: number, y: number, z: number) => number;
type VoxelSetter = (layerName: string, x: number, y: number, z: number, blockId: number) => void;

let _getVoxel: VoxelGetter = () => 0;
let _setVoxel: VoxelSetter = () => {};

export function registerVoxelAccessors(
  getter: VoxelGetter,
  setter: VoxelSetter
): void {
  _getVoxel = getter;
  _setVoxel = setter;
}

export function getVoxelAt(x: number, y: number, z: number): number {
  return _getVoxel(x, y, z);
}

export function setVoxelAt(
  layerName: string,
  x: number,
  y: number,
  z: number,
  blockId: number
): void {
  _setVoxel(layerName, x, y, z, blockId);
}

export function isBlockSolid(blockId: number): boolean {
  const block = BLOCKS[blockId];
  return block ? block.solid : false;
}
