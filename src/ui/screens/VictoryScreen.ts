import type { SceneDirector } from '../../scenes/SceneDirector.ts';

const PARCHMENT = '#fdf6e3';
const INK = '#2c1e16';
const BROWN = '#8b5a2b';
const GOLD = '#c9a227';
const FONT = '"Cormorant Garamond", Georgia, serif';

export interface VictoryStats {
  islandsVisited: number;
  enemiesDefeated: number;
  timeSurvived: number; // seconds
  tomePageUnlocked: string;
  abilityName: string;
}

/**
 * Victory screen — "A NEW PAGE IS WRITTEN" with unlocked tome page and stats.
 */
export class VictoryScreen {
  readonly #director: SceneDirector;
  #overlay: HTMLDivElement | null = null;
  #onContinueVoyage: (() => void) | null = null;

  constructor(director: SceneDirector) {
    this.#director = director;
  }

  onContinueVoyage(callback: () => void): void {
    this.#onContinueVoyage = callback;
  }

  show(stats: VictoryStats): void {
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
    title.textContent = 'A NEW PAGE IS WRITTEN';
    Object.assign(title.style, {
      fontSize: '2.8rem',
      letterSpacing: '0.15em',
      marginBottom: '1.5rem',
      color: GOLD,
      textShadow: `0 2px 4px rgba(0,0,0,0.1)`,
    });
    this.#overlay.appendChild(title);

    // Tome page unlock display
    const pageCard = document.createElement('div');
    Object.assign(pageCard.style, {
      background: '#fff',
      border: `3px solid ${GOLD}`,
      borderRadius: '8px',
      padding: '2rem 3rem',
      marginBottom: '2rem',
      textAlign: 'center',
      boxShadow: `0 4px 20px rgba(201, 162, 39, 0.3)`,
    });

    const pageLabel = document.createElement('div');
    pageLabel.textContent = 'TOME PAGE UNLOCKED';
    Object.assign(pageLabel.style, {
      fontSize: '0.9rem',
      letterSpacing: '0.15em',
      color: BROWN,
      marginBottom: '0.75rem',
    });
    pageCard.appendChild(pageLabel);

    const abilityName = document.createElement('div');
    abilityName.textContent = stats.abilityName.toUpperCase();
    Object.assign(abilityName.style, {
      fontSize: '2rem',
      fontWeight: '700',
      color: GOLD,
      marginBottom: '0.5rem',
    });
    pageCard.appendChild(abilityName);

    const pageId = document.createElement('div');
    pageId.textContent = stats.tomePageUnlocked;
    Object.assign(pageId.style, {
      fontSize: '0.85rem',
      fontStyle: 'italic',
      opacity: '0.6',
    });
    pageCard.appendChild(pageId);

    this.#overlay.appendChild(pageCard);

    // Stats
    const statsList = document.createElement('div');
    Object.assign(statsList.style, {
      display: 'flex',
      gap: '2rem',
      marginBottom: '2.5rem',
      fontSize: '1.1rem',
    });

    const minutes = Math.floor(stats.timeSurvived / 60);
    const seconds = Math.floor(stats.timeSurvived % 60);

    const addStat = (label: string, value: string) => {
      const col = document.createElement('div');
      col.style.textAlign = 'center';
      const val = document.createElement('div');
      val.textContent = value;
      val.style.fontSize = '1.8rem';
      val.style.fontWeight = '700';
      val.style.color = BROWN;
      col.appendChild(val);
      const lbl = document.createElement('div');
      lbl.textContent = label;
      lbl.style.fontSize = '0.85rem';
      lbl.style.letterSpacing = '0.05em';
      col.appendChild(lbl);
      statsList.appendChild(col);
    };

    addStat('ISLANDS', String(stats.islandsVisited));
    addStat('DEFEATED', String(stats.enemiesDefeated));
    addStat('TIME', `${minutes}:${String(seconds).padStart(2, '0')}`);

    this.#overlay.appendChild(statsList);

    // Buttons
    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, {
      display: 'flex',
      gap: '1rem',
    });

    const makeBtn = (text: string, primary: boolean, onClick: () => void) => {
      const btn = document.createElement('button');
      btn.textContent = text;
      Object.assign(btn.style, {
        padding: '0.9rem 2.5rem',
        fontFamily: FONT,
        fontSize: '1.2rem',
        letterSpacing: '0.08em',
        background: primary ? GOLD : 'none',
        color: primary ? '#fff' : INK,
        border: primary ? 'none' : `2px solid ${BROWN}`,
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'opacity 0.2s',
      });
      btn.addEventListener('mouseenter', () => { btn.style.opacity = '0.85'; });
      btn.addEventListener('mouseleave', () => { btn.style.opacity = '1'; });
      btn.addEventListener('click', onClick);
      return btn;
    };

    btnRow.appendChild(makeBtn('CONTINUE VOYAGE', true, () => {
      this.#onContinueVoyage?.();
      this.hide();
      this.#director.transition('islandSelect');
    }));

    btnRow.appendChild(makeBtn('RETURN TO HUB', false, () => {
      this.hide();
      this.#director.transition('hub');
    }));

    this.#overlay.appendChild(btnRow);

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
