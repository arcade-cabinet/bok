/**
 * @module world
 * @role Single Koota world instance — source of truth for all game state
 *
 * World-level traits store global state (time, input, game mode).
 * All game entities live here — enemies, animals, tools, props.
 */
import { createWorld } from 'koota';
import { EnemySpawner, GameModeState, GoalState, Keyboard, Time } from './traits';

export const world = createWorld(Time, Keyboard, GameModeState, GoalState, EnemySpawner);
