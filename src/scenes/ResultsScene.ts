import type { World } from 'koota';
import { IslandState } from '../traits/index.ts';
import { Scene } from './Scene.ts';
import type { SceneDirector } from './SceneDirector.ts';

const PARCHMENT = '#fdf6e3';
const INK = '#2c1e16';
const BROWN = '#8b5a2b';

/** Stats displayed on the results screen. */
export interface RunStats {
  biome: string;
  enemiesDefeated: number;
  bossDefeated: boolean;
  seed: string;
  elapsedMs: number;
}

/**
 * Results scene — shown after a run completes (boss defeated or death).
 * Displays run stats and a button to return to the hub.
 */
export class ResultsScene extends Scene {
  readonly #director: SceneDirector;
  #overlay: HTMLDivElement | null = null;
  #stats: RunStats = { biome: '', enemiesDefeated: 0, bossDefeated: false, seed: '', elapsedMs: 0 };

  constructor(world: World, runtime: unknown, director: SceneDirector) {
    super('results', world, runtime);
    this.#director = director;
  }

  setStats(stats: RunStats): void {
    this.#stats = stats;
  }

  enter(): void {
    // Pull latest stats from world if not set explicitly
    const islandState = this.world.get(IslandState);
    if (islandState && !this.#stats.biome) {
      this.#stats.biome = islandState.biome;
      this.#stats.bossDefeated = islandState.bossDefeated;
      this.#stats.seed = islandState.seed;
    }

    this.#overlay = document.createElement('div');
    Object.assign(this.#overlay.style, {
      position: 'fixed',
      inset: '0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: PARCHMENT,
      fontFamily: '"Cormorant Garamond", Georgia, serif',
      color: INK,
      zIndex: '1000',
    });

    const title = document.createElement('h1');
    title.textContent = this.#stats.bossDefeated ? 'VICTORY' : 'RUN COMPLETE';
    Object.assign(title.style, {
      fontSize: '3rem',
      marginBottom: '1.5rem',
      letterSpacing: '0.1em',
      borderBottom: `2px solid ${BROWN}`,
      paddingBottom: '0.5rem',
    });
    this.#overlay.appendChild(title);

    const statsContainer = document.createElement('div');
    Object.assign(statsContainer.style, {
      fontSize: '1.2rem',
      lineHeight: '2',
      textAlign: 'center',
      marginBottom: '2rem',
    });

    const elapsed = Math.round(this.#stats.elapsedMs / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    const lines = [
      `Biome: ${this.#stats.biome || 'Unknown'}`,
      `Enemies Defeated: ${this.#stats.enemiesDefeated}`,
      `Boss Defeated: ${this.#stats.bossDefeated ? 'Yes' : 'No'}`,
      `Time: ${minutes}m ${seconds}s`,
      `Seed: ${this.#stats.seed || 'N/A'}`,
    ];

    for (const line of lines) {
      const p = document.createElement('p');
      p.textContent = line;
      p.style.margin = '0.25rem 0';
      statsContainer.appendChild(p);
    }

    this.#overlay.appendChild(statsContainer);

    const returnBtn = document.createElement('button');
    returnBtn.textContent = 'RETURN TO HUB';
    Object.assign(returnBtn.style, {
      padding: '0.75rem 2rem',
      background: 'none',
      border: `2px solid ${BROWN}`,
      borderRadius: '4px',
      color: INK,
      fontFamily: '"Cormorant Garamond", Georgia, serif',
      fontSize: '1.1rem',
      cursor: 'pointer',
      letterSpacing: '0.05em',
    });
    returnBtn.addEventListener('click', () => {
      this.#director.transition('hub');
    });
    this.#overlay.appendChild(returnBtn);

    document.body.appendChild(this.#overlay);
  }

  update(_dt: number): void {
    // Static screen — no per-frame updates needed
  }

  exit(): void {
    this.#overlay?.remove();
    this.#overlay = null;
    // Reset stats for next run
    this.#stats = { biome: '', enemiesDefeated: 0, bossDefeated: false, seed: '', elapsedMs: 0 };
  }
}
