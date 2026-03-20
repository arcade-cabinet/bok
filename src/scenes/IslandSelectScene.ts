import type { World } from 'koota';
import { Scene } from './Scene.ts';
import type { SceneDirector } from './SceneDirector.ts';

/** Biome card data for the island select overlay. */
export interface BiomeCard {
  biomeId: string;
  name: string;
  description: string;
  difficulty: number;
  skyColor: string;
  unlocked: boolean;
}

/** Parchment theme colors. */
const PARCHMENT = '#fdf6e3';
const INK = '#2c1e16';
const BROWN = '#8b5a2b';
const LOCKED_BG = '#c0b8a0';

/**
 * Island Select scene — parchment-styled overlay with unlocked biome cards.
 * Available choices scale with Docks building level.
 */
export class IslandSelectScene extends Scene {
  readonly #director: SceneDirector;
  #overlay: HTMLDivElement | null = null;
  #biomeCards: BiomeCard[] = [];
  #selectedBiome: string | null = null;
  #docksLevel = 1;

  constructor(world: World, runtime: unknown, director: SceneDirector) {
    super('islandSelect', world, runtime);
    this.#director = director;
  }

  setBiomeCards(cards: BiomeCard[]): void {
    this.#biomeCards = cards;
  }

  setDocksLevel(level: number): void {
    this.#docksLevel = level;
  }

  getSelectedBiome(): string | null {
    return this.#selectedBiome;
  }

  enter(): void {
    this.#selectedBiome = null;
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
    title.textContent = 'CHOOSE YOUR VOYAGE';
    Object.assign(title.style, {
      fontSize: '2.5rem',
      marginBottom: '2rem',
      letterSpacing: '0.1em',
      borderBottom: `2px solid ${BROWN}`,
      paddingBottom: '0.5rem',
    });
    this.#overlay.appendChild(title);

    const grid = document.createElement('div');
    Object.assign(grid.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '1.5rem',
      maxWidth: '900px',
      width: '90%',
    });

    const maxChoices = this.#docksLevel;
    const unlocked = this.#biomeCards.filter((c) => c.unlocked);
    const available = unlocked.slice(0, maxChoices);
    const locked = this.#biomeCards.filter((c) => !c.unlocked);

    for (const card of [...available, ...locked]) {
      const el = document.createElement('div');
      const isAvailable = card.unlocked && available.includes(card);
      Object.assign(el.style, {
        background: isAvailable ? '#fff' : LOCKED_BG,
        border: `2px solid ${BROWN}`,
        borderRadius: '8px',
        padding: '1.5rem',
        cursor: isAvailable ? 'pointer' : 'default',
        opacity: isAvailable ? '1' : '0.5',
        transition: 'transform 0.2s',
      });

      const name = document.createElement('h2');
      name.textContent = isAvailable ? card.name : '???';
      name.style.fontSize = '1.4rem';
      name.style.marginBottom = '0.5rem';
      el.appendChild(name);

      if (isAvailable) {
        const desc = document.createElement('p');
        desc.textContent = card.description;
        desc.style.fontSize = '0.9rem';
        desc.style.marginBottom = '0.75rem';
        el.appendChild(desc);

        const stars = document.createElement('div');
        stars.textContent = '\u2605'.repeat(card.difficulty) + '\u2606'.repeat(5 - card.difficulty);
        stars.style.fontSize = '1.2rem';
        stars.style.color = BROWN;
        el.appendChild(stars);

        const swatch = document.createElement('div');
        Object.assign(swatch.style, {
          width: '100%',
          height: '4px',
          background: card.skyColor,
          borderRadius: '2px',
          marginTop: '0.75rem',
        });
        el.appendChild(swatch);

        el.addEventListener('click', () => {
          this.#selectedBiome = card.biomeId;
          this.#director.transition('sailing');
        });
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.03)'; });
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
      }

      grid.appendChild(el);
    }

    this.#overlay.appendChild(grid);

    const backBtn = document.createElement('button');
    backBtn.textContent = 'BACK TO HUB';
    Object.assign(backBtn.style, {
      marginTop: '2rem',
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
    backBtn.addEventListener('click', () => {
      this.#director.transition('hub');
    });
    this.#overlay.appendChild(backBtn);

    document.body.appendChild(this.#overlay);
  }

  update(_dt: number): void {}

  exit(): void {
    this.#overlay?.remove();
    this.#overlay = null;
  }
}
