import type { SceneDirector } from '../../scenes/SceneDirector.ts';

const PARCHMENT = '#fdf6e3';
const INK = '#2c1e16';
const BROWN = '#8b5a2b';
const FONT = '"Cormorant Garamond", Georgia, serif';

export interface DeathStats {
  islandsVisited: number;
  enemiesDefeated: number;
  timeSurvived: number; // seconds
}

/**
 * Death screen — "THE CHAPTER ENDS" with run stats.
 */
export class DeathScreen {
  readonly #director: SceneDirector;
  #overlay: HTMLDivElement | null = null;

  constructor(director: SceneDirector) {
    this.#director = director;
  }

  show(stats: DeathStats): void {
    this.#overlay = document.createElement('div');
    Object.assign(this.#overlay.style, {
      position: 'fixed',
      inset: '0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: PARCHMENT,
      fontFamily: FONT,
      color: INK,
      zIndex: '2000',
    });

    const title = document.createElement('h1');
    title.textContent = 'THE CHAPTER ENDS';
    Object.assign(title.style, {
      fontSize: '3rem',
      letterSpacing: '0.15em',
      marginBottom: '2rem',
      borderBottom: `2px solid ${BROWN}`,
      paddingBottom: '0.5rem',
    });
    this.#overlay.appendChild(title);

    const statsList = document.createElement('div');
    Object.assign(statsList.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      marginBottom: '2.5rem',
      fontSize: '1.2rem',
      textAlign: 'center',
    });

    const minutes = Math.floor(stats.timeSurvived / 60);
    const seconds = Math.floor(stats.timeSurvived % 60);

    const addStat = (label: string, value: string) => {
      const row = document.createElement('div');
      const lbl = document.createElement('span');
      lbl.textContent = `${label}: `;
      lbl.style.color = BROWN;
      const val = document.createElement('span');
      val.textContent = value;
      val.style.fontWeight = '700';
      row.appendChild(lbl);
      row.appendChild(val);
      statsList.appendChild(row);
    };

    addStat('Islands Visited', String(stats.islandsVisited));
    addStat('Enemies Defeated', String(stats.enemiesDefeated));
    addStat('Time Survived', `${minutes}m ${seconds}s`);

    this.#overlay.appendChild(statsList);

    const continueBtn = document.createElement('button');
    continueBtn.textContent = 'TURN THE PAGE';
    Object.assign(continueBtn.style, {
      padding: '1rem 3rem',
      fontFamily: FONT,
      fontSize: '1.3rem',
      letterSpacing: '0.1em',
      background: BROWN,
      color: PARCHMENT,
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'opacity 0.2s',
    });
    continueBtn.addEventListener('mouseenter', () => {
      continueBtn.style.opacity = '0.85';
    });
    continueBtn.addEventListener('mouseleave', () => {
      continueBtn.style.opacity = '1';
    });
    continueBtn.addEventListener('click', () => {
      this.hide();
      this.#director.transition('hub');
    });
    this.#overlay.appendChild(continueBtn);

    document.body.appendChild(this.#overlay);
  }

  hide(): void {
    this.#overlay?.remove();
    this.#overlay = null;
  }

  isVisible(): boolean {
    return this.#overlay !== null;
  }
}
