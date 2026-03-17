/**
 * Custom VoxelRenderer — drop-in replacement for @jolly-pixel/voxel.renderer.
 * Stores voxel data in a flat array per chunk, generates face-culled meshes.
 * Each chunk becomes a single Three.js mesh with UV-mapped tileset textures.
 */

import * as THREE from "three";
import type {
	BlockDefinition,
	TilesetDescriptor,
	VoxelEntry,
	VoxelRenderer,
	VoxelRendererConfig,
	VoxelSetOptions,
} from "./voxel-types.ts";

interface ChunkMesh {
	mesh: THREE.Mesh;
	dirty: boolean;
}

/** Voxel key for the flat data map. */
function voxelKey(x: number, y: number, z: number): string {
	return `${x},${y},${z}`;
}

/** Chunk key from world coordinates. */
function chunkKeyFromWorld(x: number, z: number, chunkSize: number): string {
	return `${Math.floor(x / chunkSize)},${Math.floor(z / chunkSize)}`;
}

// Face normals: +X, -X, +Y, -Y, +Z, -Z
const FACE_NORMALS: [number, number, number][] = [
	[1, 0, 0],
	[-1, 0, 0],
	[0, 1, 0],
	[0, -1, 0],
	[0, 0, 1],
	[0, 0, -1],
];

// Face vertex offsets (4 corners per face, CCW winding)
const FACE_VERTICES: [number, number, number][][] = [
	// +X
	[
		[1, 0, 0],
		[1, 1, 0],
		[1, 1, 1],
		[1, 0, 1],
	],
	// -X
	[
		[0, 0, 1],
		[0, 1, 1],
		[0, 1, 0],
		[0, 0, 0],
	],
	// +Y
	[
		[0, 1, 0],
		[0, 1, 1],
		[1, 1, 1],
		[1, 1, 0],
	],
	// -Y
	[
		[0, 0, 1],
		[0, 0, 0],
		[1, 0, 0],
		[1, 0, 1],
	],
	// +Z
	[
		[1, 0, 1],
		[1, 1, 1],
		[0, 1, 1],
		[0, 0, 1],
	],
	// -Z
	[
		[0, 0, 0],
		[0, 1, 0],
		[1, 1, 0],
		[1, 0, 0],
	],
];

export class SimpleVoxelRenderer implements VoxelRenderer {
	private scene: THREE.Scene;
	private config: VoxelRendererConfig;
	private voxels = new Map<string, number>();
	private chunks = new Map<string, ChunkMesh>();
	private blockMap = new Map<number, BlockDefinition>();
	private tilesetTexture: THREE.Texture | null = null;
	private tilesetCols = 1;
	private tilesetRows = 1;
	private rebuildQueued = new Set<string>();
	private material: THREE.Material | null = null;

	constructor(scene: THREE.Scene, config: VoxelRendererConfig) {
		this.scene = scene;
		this.config = config;
		for (const block of config.blocks) {
			this.blockMap.set(block.id, block);
		}
	}

	async loadTileset(descriptor: TilesetDescriptor): Promise<void> {
		this.tilesetCols = descriptor.cols;
		this.tilesetRows = descriptor.rows;
		return new Promise((resolve) => {
			const loader = new THREE.TextureLoader();
			loader.load(descriptor.src, (tex) => {
				tex.magFilter = THREE.NearestFilter;
				tex.minFilter = THREE.NearestFilter;
				tex.colorSpace = THREE.SRGBColorSpace;
				this.tilesetTexture = tex;
				this.material = new THREE.MeshLambertMaterial({
					map: tex,
					alphaTest: this.config.alphaTest,
					side: THREE.FrontSide,
				});
				resolve();
			});
		});
	}

	getVoxel(pos: { x: number; y: number; z: number }): VoxelEntry | null {
		const id = this.voxels.get(voxelKey(pos.x, pos.y, pos.z));
		return id !== undefined ? { blockId: id } : null;
	}

	setVoxel(_layerName: string, opts: VoxelSetOptions): void {
		const { x, y, z } = opts.position;
		this.voxels.set(voxelKey(x, y, z), opts.blockId);
		this.markDirty(x, y, z);
	}

	removeVoxel(_layerName: string, opts: { position: { x: number; y: number; z: number } }): void {
		const { x, y, z } = opts.position;
		this.voxels.delete(voxelKey(x, y, z));
		this.markDirty(x, y, z);
	}

	setVoxelBulk(_layerName: string, entries: VoxelSetOptions[]): void {
		const dirtyChunks = new Set<string>();
		for (const e of entries) {
			const { x, y, z } = e.position;
			this.voxels.set(voxelKey(x, y, z), e.blockId);
			dirtyChunks.add(chunkKeyFromWorld(x, z, this.config.chunkSize));
		}
		for (const ck of dirtyChunks) this.rebuildQueued.add(ck);
		this.flushRebuilds();
	}

	dispose(): void {
		for (const [, chunk] of this.chunks) {
			this.scene.remove(chunk.mesh);
			chunk.mesh.geometry.dispose();
		}
		this.chunks.clear();
		this.voxels.clear();
		if (this.material) (this.material as THREE.MeshLambertMaterial).dispose();
		if (this.tilesetTexture) this.tilesetTexture.dispose();
	}

	// ─── Internal ───

	private markDirty(x: number, _y: number, z: number) {
		const ck = chunkKeyFromWorld(x, z, this.config.chunkSize);
		this.rebuildQueued.add(ck);
		this.flushRebuilds();
	}

	private flushRebuilds() {
		for (const ck of this.rebuildQueued) {
			this.rebuildChunk(ck);
		}
		this.rebuildQueued.clear();
	}

	private rebuildChunk(ck: string) {
		const [cxStr, czStr] = ck.split(",");
		const cx = parseInt(cxStr, 10);
		const cz = parseInt(czStr, 10);
		const cs = this.config.chunkSize;

		const positions: number[] = [];
		const normals: number[] = [];
		const uvs: number[] = [];
		const indices: number[] = [];

		for (let lx = 0; lx < cs; lx++) {
			for (let lz = 0; lz < cs; lz++) {
				const gx = cx * cs + lx;
				const gz = cz * cs + lz;
				for (let y = 0; y < 256; y++) {
					const blockId = this.voxels.get(voxelKey(gx, y, gz));
					if (!blockId) continue;
					const blockDef = this.blockMap.get(blockId);
					if (!blockDef) continue;

					for (let face = 0; face < 6; face++) {
						const [nx, ny, nz] = FACE_NORMALS[face];
						const neighborId = this.voxels.get(voxelKey(gx + nx, y + ny, gz + nz));
						// Skip face if neighbor is solid
						if (neighborId) {
							const neighborDef = this.blockMap.get(neighborId);
							if (neighborDef?.collidable) continue;
						}

						const tile = blockDef.faceTextures[face as 0 | 1 | 2 | 3 | 4 | 5] ?? blockDef.defaultTexture;
						const uMin = tile.col / this.tilesetCols;
						const uMax = (tile.col + 1) / this.tilesetCols;
						const vMin = 1 - (tile.row + 1) / this.tilesetRows;
						const vMax = 1 - tile.row / this.tilesetRows;

						const baseIdx = positions.length / 3;
						const verts = FACE_VERTICES[face];
						for (const [vx, vy, vz] of verts) {
							positions.push(gx + vx, y + vy, gz + vz);
							normals.push(nx, ny, nz);
						}
						uvs.push(uMin, vMin, uMin, vMax, uMax, vMax, uMax, vMin);
						indices.push(baseIdx, baseIdx + 1, baseIdx + 2, baseIdx, baseIdx + 2, baseIdx + 3);
					}
				}
			}
		}

		// Remove old mesh
		const existing = this.chunks.get(ck);
		if (existing) {
			this.scene.remove(existing.mesh);
			existing.mesh.geometry.dispose();
		}

		if (positions.length === 0) {
			this.chunks.delete(ck);
			return;
		}

		const geo = new THREE.BufferGeometry();
		geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
		geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
		geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
		geo.setIndex(indices);

		const mat = this.material ?? new THREE.MeshLambertMaterial({ color: 0xffffff });
		const mesh = new THREE.Mesh(geo, mat);
		mesh.receiveShadow = true;
		mesh.castShadow = true;
		this.scene.add(mesh);
		this.chunks.set(ck, { mesh, dirty: false });
	}
}
