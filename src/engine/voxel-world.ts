/**
 * VoxelWorld — drop-in replacement for JP's VoxelRenderer.
 *
 * Combines VoxelStore (data), greedy mesher (geometry), and
 * chunk mesh builder (Three.js) into a single API surface.
 *
 * API matches what terrain-generator, world-utils, and chunk-streaming expect:
 *   getVoxel, setVoxel, removeVoxel, setVoxelBulk, loadTileset
 */

import * as THREE from "three";
import { buildBlockFaceAtlas, resetBlockFaceAtlas } from "./block-face-atlas.ts";
import { buildChunkGeometry } from "./chunk-mesh-builder.ts";
import { type ChunkAccessor, greedyMesh } from "./greedy-mesher.ts";
import { type VoxelSetEntry, VoxelStore } from "./voxel-store.ts";

export type { VoxelSetEntry };

export class VoxelWorld {
	readonly store: VoxelStore;
	private scene: THREE.Scene;
	private meshes = new Map<string, THREE.Mesh>();
	private material: THREE.Material | null = null;
	private tilesetCols = 8;
	private tilesetRows = 6;
	private chunkSize: number;
	private worldHeight: number;
	private dirtyChunks = new Set<string>();

	constructor(
		scene: THREE.Scene,
		opts: {
			chunkSize: number;
			worldHeight: number;
			blockDefs: Array<{
				id: number;
				shapeId: string;
				defaultTexture?: { col: number; row: number };
				faceTextures?: Partial<Record<number, { col: number; row: number }>>;
			}>;
		},
	) {
		this.scene = scene;
		this.chunkSize = opts.chunkSize;
		this.worldHeight = opts.worldHeight;
		this.store = new VoxelStore(opts.chunkSize, opts.worldHeight);
		buildBlockFaceAtlas(opts.blockDefs);
	}

	/** Load tileset texture (matches JP VoxelRenderer.loadTileset API). */
	async loadTileset(opts: { id: string; src: string; tileSize: number; cols: number; rows: number }): Promise<void> {
		this.tilesetCols = opts.cols;
		this.tilesetRows = opts.rows;
		const texture = new THREE.TextureLoader().load(opts.src);
		texture.magFilter = THREE.NearestFilter;
		texture.minFilter = THREE.NearestFilter;
		texture.colorSpace = THREE.SRGBColorSpace;
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		this.material = new THREE.MeshLambertMaterial({
			map: texture,
			alphaTest: 0.1,
			side: THREE.FrontSide,
		});
	}

	// ─── JP-compatible API ───

	getVoxel(pos: { x: number; y: number; z: number }): { blockId: number } | null {
		const id = this.store.getVoxel(pos.x, pos.y, pos.z);
		return id !== 0 ? { blockId: id } : null;
	}

	setVoxel(_layerName: string, opts: { position: { x: number; y: number; z: number }; blockId: number }): void {
		this.store.setVoxel(opts.position.x, opts.position.y, opts.position.z, opts.blockId);
		this.markDirty(opts.position.x, opts.position.z);
	}

	removeVoxel(_layerName: string, opts: { position: { x: number; y: number; z: number } }): void {
		this.store.removeVoxel(opts.position.x, opts.position.y, opts.position.z);
		this.markDirty(opts.position.x, opts.position.z);
	}

	setVoxelBulk(_layerName: string, entries: VoxelSetEntry[]): void {
		this.store.setVoxelBulk(entries);
		for (const e of entries) this.markDirty(e.position.x, e.position.z);
	}

	// ─── Mesh Management ───

	/** Rebuild meshes for all dirty chunks. Call after terrain generation. */
	flushDirtyChunks(): void {
		for (const key of this.dirtyChunks) {
			const [cx, cz] = key.split(",").map(Number);
			this.rebuildChunkMesh(cx, cz);
		}
		this.dirtyChunks.clear();
	}

	/** Build/rebuild the mesh for a single chunk. */
	rebuildChunkMesh(cx: number, cz: number): void {
		const key = `${cx},${cz}`;
		const old = this.meshes.get(key);
		if (old) {
			this.scene.remove(old);
			old.geometry.dispose();
		}

		const chunkData = this.store.getChunkData(cx, cz);
		if (!chunkData) {
			this.meshes.delete(key);
			return;
		}

		const accessor: ChunkAccessor = (x, y, z) => {
			if (y < 0 || y >= this.worldHeight) return 0;
			return this.store.getVoxel(cx * this.chunkSize + x, y, cz * this.chunkSize + z);
		};

		const quads = greedyMesh(chunkData, this.chunkSize, this.worldHeight, accessor);
		if (quads.length === 0) {
			this.meshes.delete(key);
			return;
		}

		const geom = buildChunkGeometry(
			quads,
			cx * this.chunkSize,
			cz * this.chunkSize,
			this.tilesetCols,
			this.tilesetRows,
		);

		const mesh = new THREE.Mesh(geom, this.material ?? undefined);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		this.scene.add(mesh);
		this.meshes.set(key, mesh);
	}

	/** Remove a chunk's mesh from the scene. */
	removeChunkMesh(cx: number, cz: number): void {
		const key = `${cx},${cz}`;
		const mesh = this.meshes.get(key);
		if (mesh) {
			this.scene.remove(mesh);
			mesh.geometry.dispose();
			this.meshes.delete(key);
		}
		this.store.deleteChunk(cx, cz);
	}

	/** Dispose all resources. */
	dispose(): void {
		for (const mesh of this.meshes.values()) {
			this.scene.remove(mesh);
			mesh.geometry.dispose();
		}
		this.meshes.clear();
		this.material?.dispose();
		this.material = null;
		this.store.clear();
		this.dirtyChunks.clear();
		resetBlockFaceAtlas();
	}

	private markDirty(wx: number, wz: number): void {
		const cx = Math.floor(wx / this.chunkSize);
		const cz = Math.floor(wz / this.chunkSize);
		this.dirtyChunks.add(`${cx},${cz}`);
	}
}
