import type { SceneDirector } from '../../scenes/SceneDirector.ts';

const PARCHMENT = '#fdf6e3';
const INK = '#2c1e16';
const BROWN = '#8b5a2b';
const FONT = '"Cormorant Garamond", Georgia, serif';

/**
 * Semi-transparent pause overlay (Escape key).
 * Resume, Settings, Abandon Run, and Quit options.
 */
export class PauseMenu {
  readonly #director: SceneDirector;
  #overlay: HTMLDivElement | null = null;
  #onAbandon: (() => void) | null = null;
  #onQuit: (() => void) | null = null;

  constructor(director: SceneDirector) {
    this.#director = director;
  }

  onAbandon(callback: () => void): void {
    this.#onAbandon = callback;
  }

  onQuit(callback: () => void): void {
    this.#onQuit = callback;
  }

  show(): void {
    if (this.#overlay) return;
    this.#overlay = document.createElement('div');
    Object.assign(this.#overlay.style, {
      position: 'fixed',
      inset: '0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(44, 30, 22, 0.7)',
      fontFamily: FONT,
      color: PARCHMENT,
      zIndex: '3000',
      backdropFilter: 'blur(4px)',
    });

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      background: PARCHMENT,
      color: INK,
      borderRadius: '8px',
      padding: '2.5rem 3rem',
      border: `3px solid ${BROWN}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem',
      minWidth: '280px',
    });

    const title = document.createElement('h2');
    title.textContent = 'PAUSED';
    Object.assign(title.style, {
      fontSize: '2rem',
      letterSpacing: '0.1em',
      marginBottom: '1rem',
    });
    panel.appendChild(title);

    const makeBtn = (text: string, onClick: () => void, primary = false): HTMLButtonElement => {
      const btn = document.createElement('button');
      btn.textContent = text;
      Object.assign(btn.style, {
        width: '100%',
        padding: '0.75rem 2rem',
        fontFamily: FONT,
        fontSize: '1.1rem',
        letterSpacing: '0.05em',
        background: primary ? BROWN : 'none',
        color: primary ? PARCHMENT : INK,
        border: `2px solid ${BROWN}`,
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'opacity 0.2s',
      });
      btn.addEventListener('mouseenter', () => {
        btn.style.opacity = '0.8';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.opacity = '1';
      });
      btn.addEventListener('click', onClick);
      return btn;
    };

    panel.appendChild(makeBtn('RESUME', () => this.hide(), true));
    panel.appendChild(
      makeBtn('SETTINGS', () => {
        /* placeholder */
      }),
    );
    panel.appendChild(
      makeBtn('ABANDON RUN', () => {
        this.#onAbandon?.();
        this.hide();
        this.#director.transition('hub');
      }),
    );
    panel.appendChild(
      makeBtn('QUIT', () => {
        this.#onQuit?.();
        this.hide();
        this.#director.transition('mainMenu');
      }),
    );

    this.#overlay.appendChild(panel);
    document.body.appendChild(this.#overlay);
  }

  hide(): void {
    this.#overlay?.remove();
    this.#overlay = null;
  }

  toggle(): void {
    if (this.#overlay) {
      this.hide();
    } else {
      this.show();
    }
  }

  isVisible(): boolean {
    return this.#overlay !== null;
  }
}
