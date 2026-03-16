/**
 * Global voxel accessor bridge.
 * The game engine sets these callbacks once the VoxelRenderer is ready.
 * ECS systems use getVoxelAt/isBlockSolid without importing Three.js.
 */

import { BLOCKS } from "./blocks.ts";

type VoxelGetter = (x: number, y: number, z: number) => number;
type VoxelSetter = (layerName: string, x: number, y: number, z: number, blockId: number) => void;

let _registered = false;

let _getVoxel: VoxelGetter = () => {
	if (!_registered) console.warn("getVoxelAt called before registerVoxelAccessors");
	return 0;
};
let _setVoxel: VoxelSetter = () => {
	if (!_registered) console.warn("setVoxelAt called before registerVoxelAccessors");
};

export function registerVoxelAccessors(getter: VoxelGetter, setter: VoxelSetter): void {
	_getVoxel = getter;
	_setVoxel = setter;
	_registered = true;
}

export function getVoxelAt(x: number, y: number, z: number): number {
	return _getVoxel(x, y, z);
}

type VoxelDeltaListener = (x: number, y: number, z: number, blockId: number) => void;
let _deltaListener: VoxelDeltaListener | null = null;

export function setVoxelDeltaListener(listener: VoxelDeltaListener | null): void {
	_deltaListener = listener;
}

export function setVoxelAt(layerName: string, x: number, y: number, z: number, blockId: number): void {
	_setVoxel(layerName, x, y, z, blockId);
	_deltaListener?.(x, y, z, blockId);
}

export function isBlockSolid(blockId: number): boolean {
	const block = BLOCKS[blockId];
	return block ? block.solid : false;
}
