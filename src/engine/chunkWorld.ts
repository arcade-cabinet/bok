/**
 * @module engine/chunkWorld
 * @role Minecraft-style infinite procedural terrain with chunk-based loading
 * @input Seed, biome config, player position
 * @output VoxelRenderer with dynamically loaded/unloaded chunks
 *
 * Chunks are 16x16 columns generated on demand from seeded noise.
 * Loaded chunks within render distance, unloaded when far.
 * Block deltas (player modifications) can be stored/restored via SQLite.
 */
import type { VoxelRenderer } from '@jolly-pixel/voxel.renderer';

import type { BiomeConfig } from '../content/index';
import { PRNG, SimplexNoise } from '../generation/index';
import { getBiomeBlockDefs } from './biomeBlocks';

const CHUNK_SIZE = 16;
const RENDER_DISTANCE = 4; // chunks in each direction (4 = 64 blocks visible radius)
const UNLOAD_DISTANCE = 6; // chunks beyond this get unloaded
const MAX_HEIGHT = 32;

export interface ChunkCoord {
  cx: number;
  cz: number;
}

export interface ChunkDelta {
  x: number;
  y: number;
  z: number;
  blockId: number; // 0 = removed
}

export interface ChunkWorldConfig {
  seed: string;
  biome: BiomeConfig;
  renderDistance?: number;
}

/**
 * Manages an infinite procedural voxel world using chunk-based generation.
 * Chunks are generated deterministically from seed + position.
 * The world auto-loads/unloads chunks as the player moves.
 */
export class ChunkWorld {
  readonly #voxelMap: VoxelRenderer;
  readonly #seed: string;
  readonly #biome: BiomeConfig;
  readonly #noise: SimplexNoise;
  readonly #loadedChunks = new Set<string>();
  readonly #renderDistance: number;
  readonly #deltas = new Map<string, ChunkDelta[]>();

  // Terrain config from biome
  readonly #baseHeight: number;
  readonly #noiseAmp: number;
  readonly #noiseFreq: number;
  readonly #waterLevel: number;
  readonly #surfaceBlock: number;
  readonly #subsurfaceBlock: number;
  readonly #stoneBlock: number;
  readonly #waterBlock: number;
  readonly #accentBlock: number;

  // Surface height cache for physics/collision
  readonly #surfaceCache = new Map<string, number>();

  constructor(voxelMap: VoxelRenderer, config: ChunkWorldConfig) {
    this.#voxelMap = voxelMap;
    this.#seed = config.seed;
    this.#biome = config.biome;
    this.#renderDistance = config.renderDistance ?? RENDER_DISTANCE;

    const prng = new PRNG(config.seed);
    this.#noise = new SimplexNoise(prng);

    // Read biome terrain params
    const t = config.biome.terrain;
    this.#baseHeight = t.baseHeight;
    this.#noiseAmp = t.noiseAmplitude;
    this.#noiseFreq = t.noiseFrequency;
    this.#waterLevel = t.waterLevel;
    this.#surfaceBlock = t.blocks.surface ?? 1;
    this.#subsurfaceBlock = t.blocks.subsurface ?? 2;
    this.#stoneBlock = t.blocks.stone ?? 3;
    this.#waterBlock = t.blocks.water ?? 4;
    this.#accentBlock = t.blocks.accent ?? t.blocks.surface ?? 5;
  }

  /** Get the biome block definitions for VoxelRenderer registration. */
  getBlockDefs() {
    return getBiomeBlockDefs(this.#biome.id);
  }

  /** Key for a chunk coordinate. */
  static chunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  /**
   * Update which chunks are loaded based on player position.
   * Call this every frame or every few frames from the game loop.
   */
  updateAroundPlayer(playerX: number, playerZ: number): void {
    const pcx = Math.floor(playerX / CHUNK_SIZE);
    const pcz = Math.floor(playerZ / CHUNK_SIZE);

    // Load chunks within render distance
    for (let dx = -this.#renderDistance; dx <= this.#renderDistance; dx++) {
      for (let dz = -this.#renderDistance; dz <= this.#renderDistance; dz++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        const key = ChunkWorld.chunkKey(cx, cz);
        if (!this.#loadedChunks.has(key)) {
          this.#generateChunk(cx, cz);
          this.#loadedChunks.add(key);
        }
      }
    }

    // Unload chunks beyond unload distance
    for (const key of this.#loadedChunks) {
      const [cx, cz] = key.split(',').map(Number);
      if (Math.abs(cx - pcx) > UNLOAD_DISTANCE || Math.abs(cz - pcz) > UNLOAD_DISTANCE) {
        this.#unloadChunk(cx, cz);
        this.#loadedChunks.delete(key);
      }
    }
  }

  /**
   * Get surface height at a world position.
   * Uses cached values from generated chunks, or generates on demand.
   */
  getSurfaceY(worldX: number, worldZ: number): number {
    const rx = Math.round(worldX);
    const rz = Math.round(worldZ);
    const cached = this.#surfaceCache.get(`${rx},${rz}`);
    if (cached !== undefined) return cached;

    // Generate height on demand (for areas not yet in a loaded chunk)
    const height = this.#getTerrainHeight(rx, rz);
    return Math.max(height + 1, this.#waterLevel + 1);
  }

  /** Apply stored deltas to a chunk (for persistence). */
  applyDeltas(cx: number, cz: number, deltas: ChunkDelta[]): void {
    const key = ChunkWorld.chunkKey(cx, cz);
    this.#deltas.set(key, deltas);

    // If chunk is loaded, apply immediately
    if (this.#loadedChunks.has(key)) {
      for (const d of deltas) {
        if (d.blockId === 0) {
          this.#voxelMap.removeVoxel('Ground', {
            position: { x: d.x, y: d.y, z: d.z },
          });
        } else {
          this.#voxelMap.setVoxel('Ground', {
            position: { x: d.x, y: d.y, z: d.z },
            blockId: d.blockId,
          });
        }
      }
    }
  }

  /** Get the number of loaded chunks (for debugging/metrics). */
  get loadedChunkCount(): number {
    return this.#loadedChunks.size;
  }

  // --- Private ---

  /** Calculate terrain height at a world position using seeded noise. */
  #getTerrainHeight(wx: number, wz: number): number {
    // Multi-octave noise for natural terrain
    let noiseVal = 0;
    let amplitude = 1;
    let frequency = this.#noiseFreq;
    let maxAmp = 0;
    const octaves = this.#biome.terrain.noiseOctaves ?? 3;

    for (let o = 0; o < octaves; o++) {
      noiseVal += this.#noise.noise2D(wx * frequency, wz * frequency) * amplitude;
      maxAmp += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    noiseVal /= maxAmp; // Normalize to [-1, 1]

    return Math.max(0, Math.round(this.#baseHeight + noiseVal * this.#noiseAmp));
  }

  /** Generate all voxels for a chunk. */
  #generateChunk(cx: number, cz: number): void {
    const startX = cx * CHUNK_SIZE;
    const startZ = cz * CHUNK_SIZE;

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = startX + lx;
        const wz = startZ + lz;
        const height = this.#getTerrainHeight(wx, wz);

        // Place terrain column
        for (let y = 0; y <= Math.min(height, MAX_HEIGHT); y++) {
          let blockId: number;
          if (y === height) {
            blockId = height <= this.#waterLevel ? this.#accentBlock : this.#surfaceBlock;
          } else if (y >= height - 2) {
            blockId = this.#subsurfaceBlock;
          } else {
            blockId = this.#stoneBlock;
          }
          this.#voxelMap.setVoxel('Ground', { position: { x: wx, y, z: wz }, blockId });
        }

        // Water fill
        if (height < this.#waterLevel) {
          for (let y = height + 1; y <= this.#waterLevel; y++) {
            this.#voxelMap.setVoxel('Ground', { position: { x: wx, y, z: wz }, blockId: this.#waterBlock });
          }
        }

        // Cache surface height
        const surfaceY = Math.max(height, this.#waterLevel) + 1;
        this.#surfaceCache.set(`${wx},${wz}`, surfaceY);

        // Terrain edge decoration — place slabs at water edges, poles near cliffs
        if (height === this.#waterLevel + 1) {
          // Beach/shore: place a slab on top for transition
          this.#voxelMap.setVoxel('Ground', { position: { x: wx, y: height + 1, z: wz }, blockId: 102 }); // Sand Slab
        }

        // Biome-specific features (trees, cacti, crystals, etc.)
        this.#placeFeature(wx, wz, height);
      }
    }

    // Apply any stored deltas for this chunk
    const key = ChunkWorld.chunkKey(cx, cz);
    const deltas = this.#deltas.get(key);
    if (deltas) {
      for (const d of deltas) {
        if (d.blockId > 0) {
          this.#voxelMap.setVoxel('Ground', { position: { x: d.x, y: d.y, z: d.z }, blockId: d.blockId });
        }
      }
    }
  }

  /** Unload a chunk by removing its voxels. */
  #unloadChunk(cx: number, cz: number): void {
    // VoxelRenderer doesn't expose bulk chunk removal directly.
    // For now, we just remove surface cache entries.
    // The VoxelRenderer will handle mesh cleanup internally.
    const startX = cx * CHUNK_SIZE;
    const startZ = cz * CHUNK_SIZE;
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        this.#surfaceCache.delete(`${startX + lx},${startZ + lz}`);
      }
    }
  }

  /** Place biome-specific decorations at a world position. */
  #placeFeature(wx: number, wz: number, height: number): void {
    if (height <= this.#waterLevel) return;

    // Use deterministic hash for feature placement
    const featureRng = new PRNG(`${this.#seed}:feat:${wx}:${wz}`);
    const roll = featureRng.next();

    switch (this.#biome.id) {
      case 'forest':
        if (roll > 0.94 && height > this.#waterLevel + 1) {
          this.#placeTree(wx, height, wz, featureRng);
        }
        break;
      case 'desert':
        if (roll > 0.97) {
          this.#placeCactus(wx, height, wz, featureRng);
        }
        break;
      case 'tundra':
        if (roll > 0.96 && height <= this.#waterLevel + 2) {
          // Ice patch
          this.#voxelMap.setVoxel('Ground', { position: { x: wx, y: height, z: wz }, blockId: 22 }); // ICE
        }
        break;
      case 'volcanic':
        if (roll > 0.97 && height > this.#waterLevel + 3) {
          // Obsidian pillar
          const pillarH = 2 + Math.floor(featureRng.next() * 3);
          for (let py = 1; py <= pillarH; py++) {
            this.#voxelMap.setVoxel('Ground', { position: { x: wx, y: height + py, z: wz }, blockId: 30 }); // OBSIDIAN
          }
        }
        break;
      case 'crystal-caves':
        if (roll > 0.96) {
          // Crystal pillar
          const crystalH = 3 + Math.floor(featureRng.next() * 4);
          for (let cy = 1; cy <= crystalH; cy++) {
            this.#voxelMap.setVoxel('Ground', { position: { x: wx, y: height + cy, z: wz }, blockId: 52 }); // AMETHYST
          }
        }
        break;
      case 'swamp':
        if (roll > 0.95 && height > this.#waterLevel) {
          // Dead wood stump
          const stumpH = 1 + Math.floor(featureRng.next() * 2);
          for (let sy = 1; sy <= stumpH; sy++) {
            this.#voxelMap.setVoxel('Ground', { position: { x: wx, y: height + sy, z: wz }, blockId: 44 }); // DEAD_WOOD
          }
        }
        break;
      case 'deep-ocean':
        if (roll > 0.92 && height < this.#waterLevel) {
          // Kelp strand
          const kelpH = 1 + Math.floor(featureRng.next() * 3);
          for (let ky = 1; ky <= kelpH; ky++) {
            this.#voxelMap.setVoxel('Ground', { position: { x: wx, y: height + ky, z: wz }, blockId: 74 }); // KELP
          }
        }
        break;
    }
  }

  /** Place a tree (forest biome). */
  #placeTree(wx: number, height: number, wz: number, rng: PRNG): void {
    const trunkH = 3 + Math.floor(rng.next() * 3);
    // Trunk
    for (let ty = 1; ty <= trunkH; ty++) {
      this.#voxelMap.setVoxel('Ground', { position: { x: wx, y: height + ty, z: wz }, blockId: 6 }); // WOOD
    }
    // Canopy
    for (let lx = -2; lx <= 2; lx++) {
      for (let lz = -2; lz <= 2; lz++) {
        for (let ly = 0; ly <= 2; ly++) {
          if (Math.abs(lx) + Math.abs(lz) + ly <= 3 && (lx !== 0 || lz !== 0 || ly > 0)) {
            this.#voxelMap.setVoxel('Ground', {
              position: { x: wx + lx, y: height + trunkH + ly, z: wz + lz },
              blockId: 7, // LEAVES
            });
          }
        }
      }
    }
  }

  /** Place a cactus (desert biome). */
  #placeCactus(wx: number, height: number, wz: number, rng: PRNG): void {
    const cactusH = 2 + Math.floor(rng.next() * 3);
    for (let cy = 1; cy <= cactusH; cy++) {
      this.#voxelMap.setVoxel('Ground', { position: { x: wx, y: height + cy, z: wz }, blockId: 14 }); // CACTUS_GREEN
    }
    // Arms
    if (cactusH >= 3 && rng.next() > 0.5) {
      const armDir = rng.next() > 0.5 ? 1 : -1;
      this.#voxelMap.setVoxel('Ground', { position: { x: wx + armDir, y: height + cactusH - 1, z: wz }, blockId: 14 });
      this.#voxelMap.setVoxel('Ground', { position: { x: wx + armDir, y: height + cactusH, z: wz }, blockId: 14 });
    }
  }
}

/**
 * Pure function: get terrain height at any world coordinate.
 * Used for physics queries outside the chunk system.
 */
export function getTerrainHeightAt(seed: string, biome: BiomeConfig, wx: number, wz: number): number {
  const prng = new PRNG(seed);
  const noise = new SimplexNoise(prng);
  const t = biome.terrain;

  let noiseVal = 0;
  let amplitude = 1;
  let frequency = t.noiseFrequency;
  let maxAmp = 0;
  const octaves = t.noiseOctaves ?? 3;

  for (let o = 0; o < octaves; o++) {
    noiseVal += noise.noise2D(wx * frequency, wz * frequency) * amplitude;
    maxAmp += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  noiseVal /= maxAmp;

  return Math.max(0, Math.round(t.baseHeight + noiseVal * t.noiseAmplitude));
}
