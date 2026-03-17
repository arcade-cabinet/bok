/**
 * VoxelStore — chunk-based voxel data storage.
 *
 * Stores voxel data as flat Uint16Array per chunk.
 * Index: localX + localZ * chunkSize + localY * chunkSize * chunkSize
 */

export interface VoxelSetEntry {
	position: { x: number; y: number; z: number };
	blockId: number;
}

/** Alias for compatibility with code that used JP's VoxelSetOptions type name. */
export type VoxelSetOptions = VoxelSetEntry;

export class VoxelStore {
	private chunks = new Map<string, Uint16Array>();
	readonly chunkSize: number;
	readonly worldHeight: number;

	constructor(chunkSize: number, worldHeight: number) {
		this.chunkSize = chunkSize;
		this.worldHeight = worldHeight;
	}

	private chunkKey(cx: number, cz: number): string {
		return `${cx},${cz}`;
	}

	private toChunkCoord(v: number): number {
		return Math.floor(v / this.chunkSize);
	}

	private toLocal(v: number): number {
		return ((v % this.chunkSize) + this.chunkSize) % this.chunkSize;
	}

	private localIndex(lx: number, ly: number, lz: number): number {
		return lx + lz * this.chunkSize + ly * this.chunkSize * this.chunkSize;
	}

	private ensureChunk(cx: number, cz: number): Uint16Array {
		const key = this.chunkKey(cx, cz);
		let data = this.chunks.get(key);
		if (!data) {
			data = new Uint16Array(this.chunkSize * this.worldHeight * this.chunkSize);
			this.chunks.set(key, data);
		}
		return data;
	}

	getVoxel(x: number, y: number, z: number): number {
		if (y < 0 || y >= this.worldHeight) return 0;
		const cx = this.toChunkCoord(x);
		const cz = this.toChunkCoord(z);
		const data = this.chunks.get(this.chunkKey(cx, cz));
		if (!data) return 0;
		return data[this.localIndex(this.toLocal(x), y, this.toLocal(z))];
	}

	setVoxel(x: number, y: number, z: number, blockId: number): void {
		if (y < 0 || y >= this.worldHeight) return;
		const cx = this.toChunkCoord(x);
		const cz = this.toChunkCoord(z);
		const data = this.ensureChunk(cx, cz);
		data[this.localIndex(this.toLocal(x), y, this.toLocal(z))] = blockId;
	}

	removeVoxel(x: number, y: number, z: number): void {
		this.setVoxel(x, y, z, 0);
	}

	setVoxelBulk(entries: VoxelSetEntry[]): void {
		for (const e of entries) {
			this.setVoxel(e.position.x, e.position.y, e.position.z, e.blockId);
		}
	}

	/** Returns the raw chunk data array, or null if chunk not populated. */
	getChunkData(cx: number, cz: number): Uint16Array | null {
		return this.chunks.get(this.chunkKey(cx, cz)) ?? null;
	}

	hasChunk(cx: number, cz: number): boolean {
		return this.chunks.has(this.chunkKey(cx, cz));
	}

	deleteChunk(cx: number, cz: number): void {
		this.chunks.delete(this.chunkKey(cx, cz));
	}

	clear(): void {
		this.chunks.clear();
	}
}
