import type { World } from 'koota';
import { Scene } from './Scene.ts';
import type { SceneDirector } from './SceneDirector.ts';

const SAIL_DURATION = 4.0; // seconds

/**
 * Brief transition scene — boat sailing across water to the next island.
 * After SAIL_DURATION, transitions to 'island'.
 */
export class SailingScene extends Scene {
  readonly #director: SceneDirector;
  #overlay: HTMLDivElement | null = null;
  #elapsed = 0;
  #biomeName = 'Unknown';

  constructor(world: World, runtime: unknown, director: SceneDirector) {
    super('sailing', world, runtime);
    this.#director = director;
  }

  setBiomeName(name: string): void {
    this.#biomeName = name;
  }

  enter(): void {
    this.#elapsed = 0;
    this.#overlay = document.createElement('div');
    Object.assign(this.#overlay.style, {
      position: 'fixed',
      inset: '0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #87CEEB 0%, #1a6fa0 40%, #0d3b66 100%)',
      fontFamily: '"Cormorant Garamond", Georgia, serif',
      color: '#fdf6e3',
      zIndex: '1000',
      overflow: 'hidden',
    });

    // Water waves
    const waves = document.createElement('div');
    Object.assign(waves.style, {
      position: 'absolute',
      bottom: '0',
      width: '100%',
      height: '40%',
      background: 'linear-gradient(180deg, #1a6fa0 0%, #0a2540 100%)',
    });
    this.#overlay.appendChild(waves);

    // Boat silhouette (sailboat emoji)
    const boat = document.createElement('div');
    boat.textContent = '\u26F5';
    Object.assign(boat.style, {
      position: 'absolute',
      bottom: '38%',
      left: '-10%',
      fontSize: '4rem',
      transition: `left ${SAIL_DURATION}s linear`,
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
    });
    this.#overlay.appendChild(boat);
    // Trigger animation
    requestAnimationFrame(() => {
      boat.style.left = '110%';
    });

    // Text
    const text = document.createElement('div');
    text.textContent = `Sailing to ${this.#biomeName}...`;
    Object.assign(text.style, {
      position: 'relative',
      fontSize: '2rem',
      letterSpacing: '0.1em',
      textShadow: '0 2px 8px rgba(0,0,0,0.5)',
      zIndex: '1',
    });
    this.#overlay.appendChild(text);

    document.body.appendChild(this.#overlay);
  }

  update(dt: number): void {
    this.#elapsed += dt;
    if (this.#elapsed >= SAIL_DURATION) {
      this.#director.transition('island');
    }
  }

  exit(): void {
    this.#overlay?.remove();
    this.#overlay = null;
  }
}
