/**
 * @module ai/playerAI
 * @role Autonomous player AI controller for automated playtesting
 * @input GameInstance from engine, EngineState each frame
 * @output Player movement/combat actions via standard input mechanisms
 * @depends engine/GameEngine (GameInstance), engine/types (EngineState, MobileInput)
 * @tested playerAI.test.ts
 *
 * The AI does NOT bypass game systems. It drives the player through
 * the same input API a human uses: setMobileInput() and triggerAttack().
 */

import type { GameInstance } from '../engine/GameEngine';
import type { EngineEvent, EngineState } from '../engine/types';

/** Summary of what the AI accomplished during a run. */
export interface PlayerAIReport {
  framesRun: number;
  enemiesKilled: number;
  chestsOpened: number;
  landmarksDiscovered: number;
  bossDefeated: boolean;
  playerDeaths: number;
  screenshots: Array<{ frame: number; description: string; dataUrl?: string }>;
}

/** Behavioral mode the AI is currently executing. */
type AIMode = 'explore' | 'combat' | 'seek-shrine' | 'seek-boss';

/** How often (in frames) the AI picks a new wander direction. */
const WANDER_INTERVAL_FRAMES = 180; // ~3 seconds at 60 fps

/** Distance threshold to enter combat mode. */
const COMBAT_ENGAGE_RADIUS = 10;

/** Distance at which the AI attacks instead of seeking. */
const MELEE_RANGE = 2;

/**
 * Autonomous player AI that controls the game through the standard input system.
 * Does NOT cheat -- uses the same mechanisms as a human player.
 */
export class PlayerAI {
  readonly #game: GameInstance;
  readonly #report: PlayerAIReport;
  #mode: AIMode = 'explore';
  #wanderAngle = 0;

  constructor(game: GameInstance) {
    this.#game = game;
    this.#report = {
      framesRun: 0,
      enemiesKilled: 0,
      chestsOpened: 0,
      landmarksDiscovered: 0,
      bossDefeated: false,
      playerDeaths: 0,
      screenshots: [],
    };
  }

  /**
   * Run one frame of AI decision-making.
   * Called every game frame from the test loop.
   */
  update(state: EngineState): void {
    this.#report.framesRun++;
    this.#decideMode(state);

    switch (this.#mode) {
      case 'explore':
        this.#explore(state);
        break;
      case 'combat':
        this.#combat(state);
        break;
      case 'seek-shrine':
        this.#seekShrine(state);
        break;
      case 'seek-boss':
        this.#seekBoss(state);
        break;
    }
  }

  /** Return a copy of the current run report. */
  getReport(): PlayerAIReport {
    return { ...this.#report, screenshots: [...this.#report.screenshots] };
  }

  /** Track events from the game engine. Wire this to GameInstance.onEvent(). */
  handleEvent(event: EngineEvent): void {
    switch (event.type) {
      case 'enemyKilled':
        this.#report.enemiesKilled++;
        break;
      case 'chestOpened':
        this.#report.chestsOpened++;
        break;
      case 'landmarkDiscovered':
        this.#report.landmarksDiscovered++;
        break;
      case 'bossDefeated':
        this.#report.bossDefeated = true;
        break;
      case 'playerDied':
        this.#report.playerDeaths++;
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Mode selection
  // ---------------------------------------------------------------------------

  #decideMode(state: EngineState): void {
    // If enemies are nearby, fight
    if ((this.#findNearestEnemy(state)?.dist ?? Number.POSITIVE_INFINITY) < COMBAT_ENGAGE_RADIUS) {
      this.#mode = 'combat';
      return;
    }

    // If the boss is alive and all shrines discovered, seek boss
    if (state.bossPosition && !state.bossDefeated) {
      const undiscoveredShrines = state.minimapMarkers.filter((m) => m.type === 'shrine');
      if (undiscoveredShrines.length === 0) {
        this.#mode = 'seek-boss';
        return;
      }
    }

    // If there are undiscovered shrines, head toward the nearest one
    const shrine = this.#findNearestShrine(state);
    if (shrine) {
      this.#mode = 'seek-shrine';
      return;
    }

    // Default: wander
    this.#mode = 'explore';
  }

  // ---------------------------------------------------------------------------
  // Mode executors
  // ---------------------------------------------------------------------------

  #explore(_state: EngineState): void {
    // Pick a new wander angle periodically
    if (this.#report.framesRun % WANDER_INTERVAL_FRAMES === 0) {
      this.#wanderAngle += (Math.random() - 0.5) * Math.PI;
    }
    const moveX = Math.sin(this.#wanderAngle);
    const moveZ = -Math.cos(this.#wanderAngle);

    this.#game.setMobileInput({
      moveX: moveX * 0.8,
      moveZ: moveZ * 0.8,
      lookX: 0,
      lookY: 0,
      action: null,
    });
  }

  #combat(state: EngineState): void {
    const result = this.#findNearestEnemy(state);
    if (!result) {
      this.#mode = 'explore';
      return;
    }

    const { enemy: nearest, dist } = result;
    const dx = nearest.x - state.playerX;
    const dz = nearest.z - state.playerZ;

    if (dist > MELEE_RANGE) {
      // Seek toward enemy
      this.#game.setMobileInput({
        moveX: dx / dist,
        moveZ: dz / dist,
        lookX: 0,
        lookY: 0,
        action: null,
      });
    } else {
      // In range — attack
      this.#game.setMobileInput({
        moveX: 0,
        moveZ: 0,
        lookX: 0,
        lookY: 0,
        action: null,
      });
      this.#game.triggerAttack();
    }
  }

  #seekShrine(state: EngineState): void {
    const shrine = this.#findNearestShrine(state);
    if (!shrine) {
      this.#mode = 'explore';
      return;
    }

    const dx = shrine.x - state.playerX;
    const dz = shrine.z - state.playerZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.5) {
      this.#mode = 'explore';
      return;
    }

    this.#game.setMobileInput({
      moveX: dx / dist,
      moveZ: dz / dist,
      lookX: 0,
      lookY: 0,
      action: null,
    });
  }

  #seekBoss(state: EngineState): void {
    if (!state.bossPosition) {
      this.#mode = 'explore';
      return;
    }

    const dx = state.bossPosition.x - state.playerX;
    const dz = state.bossPosition.z - state.playerZ;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > MELEE_RANGE + 1) {
      this.#game.setMobileInput({
        moveX: dx / dist,
        moveZ: dz / dist,
        lookX: 0,
        lookY: 0,
        action: null,
      });
    } else {
      this.#game.setMobileInput({
        moveX: 0,
        moveZ: 0,
        lookX: 0,
        lookY: 0,
        action: null,
      });
      this.#game.triggerAttack();
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Find nearest enemy and its distance. Single pass — avoids duplicate iteration. */
  #findNearestEnemy(state: EngineState): { enemy: (typeof state.enemyPositions)[number]; dist: number } | null {
    let best: (typeof state.enemyPositions)[number] | null = null;
    let bestDistSq = Number.POSITIVE_INFINITY;

    for (const e of state.enemyPositions) {
      const dx = e.x - state.playerX;
      const dz = e.z - state.playerZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = e;
      }
    }
    if (!best) return null;
    return { enemy: best, dist: Math.sqrt(bestDistSq) };
  }

  /** Find nearest undiscovered shrine by squared distance. */
  #findNearestShrine(state: EngineState): { x: number; z: number } | null {
    let best: { x: number; z: number } | null = null;
    let bestDistSq = Number.POSITIVE_INFINITY;
    for (const m of state.minimapMarkers) {
      if (m.type !== 'shrine') continue;
      const dx = m.x - state.playerX;
      const dz = m.z - state.playerZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = m;
      }
    }
    return best;
  }
}
