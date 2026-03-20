import { z } from 'zod';

export const EnemySpawnConfigSchema = z.object({
  enemyId: z.string(),
  weight: z.number().positive(),
  minDifficulty: z.number().int().min(1).default(1),
});

export const TerrainConfigSchema = z.object({
  noiseOctaves: z.number().int().min(1).max(8).default(3),
  noiseFrequency: z.number().positive().default(0.02),
  noiseAmplitude: z.number().positive().default(10),
  waterLevel: z.number().default(3),
  baseHeight: z.number().default(5),
  blocks: z.object({
    surface: z.number().int(),
    subsurface: z.number().int(),
    stone: z.number().int(),
    water: z.number().int().optional(),
    accent: z.number().int().optional(),
  }),
});

export const BiomeConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  terrain: TerrainConfigSchema,
  enemies: z.array(EnemySpawnConfigSchema).min(1),
  bossId: z.string(),
  music: z.string(),
  ambience: z.string(),
  skyColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fogColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fogDensity: z.number().positive().default(0.01),
});

export const ComboHitSchema = z.object({
  damageMultiplier: z.number().positive(),
  windowMs: z.number().positive(),
  animation: z.string(),
});

export const WeaponConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['melee', 'ranged']),
  baseDamage: z.number().positive(),
  attackSpeed: z.number().positive(),
  range: z.number().positive(),
  combo: z.array(ComboHitSchema).length(3),
  special: z.string().optional(),
  model: z.string().optional(),
});

export const AttackPatternSchema = z.object({
  name: z.string(),
  type: z.enum(['melee', 'ranged', 'aoe', 'summon']),
  damage: z.number(),
  cooldown: z.number().positive(),
  range: z.number().positive(),
  telegraph: z.number().nonnegative().default(0.5),
});

export const EnemyConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  health: z.number().positive(),
  speed: z.number().positive(),
  damage: z.number().positive(),
  attackPattern: z.string(),
  attacks: z.array(AttackPatternSchema).min(1),
  drops: z.array(z.object({
    itemId: z.string(),
    chance: z.number().min(0).max(1),
    minAmount: z.number().int().min(1).default(1),
    maxAmount: z.number().int().min(1).default(1),
  })),
  special: z.string().optional(),
  model: z.string().optional(),
});

export const BossPhaseSchema = z.object({
  healthThreshold: z.number().min(0).max(1),
  attacks: z.array(AttackPatternSchema).min(1),
  arenaChange: z.string().optional(),
  description: z.string(),
});

export const BossConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  biome: z.string(),
  health: z.number().positive(),
  phases: z.array(BossPhaseSchema).min(2),
  tomePageDrop: z.string(),
  model: z.string().optional(),
  arenaTemplate: z.string().optional(),
});

// Inferred types
export type BiomeConfig = z.infer<typeof BiomeConfigSchema>;
export type WeaponConfig = z.infer<typeof WeaponConfigSchema>;
export type EnemyConfig = z.infer<typeof EnemyConfigSchema>;
export type BossConfig = z.infer<typeof BossConfigSchema>;
export type EnemySpawnConfig = z.infer<typeof EnemySpawnConfigSchema>;
export type TerrainConfig = z.infer<typeof TerrainConfigSchema>;
export type AttackPattern = z.infer<typeof AttackPatternSchema>;
export type BossPhase = z.infer<typeof BossPhaseSchema>;
export type ComboHit = z.infer<typeof ComboHitSchema>;
