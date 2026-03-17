/**
 * Voxel type definitions — local replacements for @jolly-pixel/voxel.renderer types.
 * Provides VoxelSetOptions, BlockDefinition, Face, and VoxelRenderer interface.
 */

/** Face direction enum for block face textures. */
export const Face = {
	PosX: 0,
	NegX: 1,
	PosY: 2,
	NegY: 3,
	PosZ: 4,
	NegZ: 5,
} as const;

export type FaceId = (typeof Face)[keyof typeof Face];

/** Tileset reference for a single block face. */
export interface TileRef {
	tilesetId: string;
	col: number;
	row: number;
}

/** Block definition for the voxel renderer. */
export interface BlockDefinition {
	id: number;
	name: string;
	shapeId: string;
	collidable: boolean;
	faceTextures: Partial<Record<FaceId, TileRef>>;
	defaultTexture: TileRef;
}

/** Options for setting a single voxel. */
export interface VoxelSetOptions {
	position: { x: number; y: number; z: number };
	blockId: number;
}

/** Tileset descriptor for loading texture atlases. */
export interface TilesetDescriptor {
	id: string;
	src: string;
	tileSize: number;
	cols: number;
	rows: number;
}

/** VoxelRenderer configuration. */
export interface VoxelRendererConfig {
	chunkSize: number;
	layers: string[];
	blocks: BlockDefinition[];
	material: string;
	alphaTest: number;
}

/** Voxel entry returned by getVoxel. */
export interface VoxelEntry {
	blockId: number;
}

/** VoxelRenderer interface — the contract all voxel renderers must satisfy. */
export interface VoxelRenderer {
	getVoxel(pos: { x: number; y: number; z: number }): VoxelEntry | null;
	setVoxel(layerName: string, opts: VoxelSetOptions): void;
	removeVoxel(layerName: string, opts: { position: { x: number; y: number; z: number } }): void;
	setVoxelBulk(layerName: string, entries: VoxelSetOptions[]): void;
	loadTileset(descriptor: TilesetDescriptor): Promise<void>;
	dispose(): void;
}
