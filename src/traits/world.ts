import { trait } from 'koota';

/** Frame timing (world singleton). */
export const Time = trait({ delta: 0, elapsed: 0 });

/** Current game phase (world singleton). */
export const GamePhase = trait({ phase: 'menu' as string });

/** Current island state (world singleton). */
export const IslandState = trait({
  biome: '',
  seed: '',
  difficulty: 1,
  bossDefeated: false,
  enemiesRemaining: 0,
});
