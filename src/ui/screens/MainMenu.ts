import type { SceneDirector } from '../../scenes/SceneDirector.ts';

const PARCHMENT = '#fdf6e3';
const INK = '#2c1e16';
const BROWN = '#8b5a2b';
const FONT = '"Cormorant Garamond", Georgia, serif';

const ADJECTIVES = [
  'Brave', 'Silent', 'Ancient', 'Crimson', 'Frozen', 'Golden', 'Hollow',
  'Iron', 'Jade', 'Lost', 'Mystic', 'Noble', 'Obsidian', 'Pale',
  'Raging', 'Shadow', 'Thorned', 'Veiled', 'Wicked', 'Zealous',
];

const NOUNS = [
  'Archipelago', 'Basin', 'Cove', 'Depths', 'Expanse', 'Fjord',
  'Gulf', 'Harbor', 'Isles', 'Journey', 'Kingdom', 'Lagoon',
  'Maelstrom', 'Narrows', 'Odyssey', 'Passage', 'Reef', 'Strait',
  'Tideland', 'Voyage', 'Waters',
];

function randomSeedPhrase(): string {
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  return `${pick(ADJECTIVES)} ${pick(ADJECTIVES)} ${pick(NOUNS)}`;
}

/**
 * Full-screen main menu with title, seed input, and start button.
 * Parchment-styled with Cormorant Garamond typography.
 */
export class MainMenu {
  readonly #director: SceneDirector;
  #overlay: HTMLDivElement | null = null;
  #seedValue = '';
  #onStart: ((seed: string) => void) | null = null;

  constructor(director: SceneDirector) {
    this.#director = director;
  }

  onStart(callback: (seed: string) => void): void {
    this.#onStart = callback;
  }

  show(): void {
    this.#seedValue = randomSeedPhrase();
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

    // Title
    const title = document.createElement('h1');
    title.textContent = 'BOK: THE BUILDER\'S TOME';
    Object.assign(title.style, {
      fontSize: '3rem',
      letterSpacing: '0.15em',
      marginBottom: '0.5rem',
      textAlign: 'center',
    });
    this.#overlay.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'A roguelite voyage of construction and combat';
    Object.assign(subtitle.style, {
      fontSize: '1.1rem',
      marginBottom: '3rem',
      opacity: '0.7',
      fontStyle: 'italic',
    });
    this.#overlay.appendChild(subtitle);

    // Seed section
    const seedLabel = document.createElement('label');
    seedLabel.textContent = 'VOYAGE SEED';
    Object.assign(seedLabel.style, {
      fontSize: '0.9rem',
      letterSpacing: '0.1em',
      marginBottom: '0.5rem',
      color: BROWN,
    });
    this.#overlay.appendChild(seedLabel);

    const seedRow = document.createElement('div');
    Object.assign(seedRow.style, {
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '2rem',
    });

    const seedInput = document.createElement('input');
    seedInput.type = 'text';
    seedInput.value = this.#seedValue;
    Object.assign(seedInput.style, {
      width: '280px',
      padding: '0.6rem 1rem',
      fontFamily: FONT,
      fontSize: '1.1rem',
      color: INK,
      background: '#fff',
      border: `2px solid ${BROWN}`,
      borderRadius: '4px',
      textAlign: 'center',
    });
    seedInput.addEventListener('input', () => {
      this.#seedValue = seedInput.value;
    });
    seedRow.appendChild(seedInput);

    const rerollBtn = document.createElement('button');
    rerollBtn.textContent = '\u21BB';
    rerollBtn.title = 'Random seed';
    Object.assign(rerollBtn.style, {
      padding: '0.6rem 0.9rem',
      fontFamily: FONT,
      fontSize: '1.3rem',
      background: 'none',
      border: `2px solid ${BROWN}`,
      borderRadius: '4px',
      color: BROWN,
      cursor: 'pointer',
    });
    rerollBtn.addEventListener('click', () => {
      this.#seedValue = randomSeedPhrase();
      seedInput.value = this.#seedValue;
    });
    seedRow.appendChild(rerollBtn);
    this.#overlay.appendChild(seedRow);

    // Start button
    const startBtn = document.createElement('button');
    startBtn.textContent = 'OPEN THE BOOK';
    Object.assign(startBtn.style, {
      padding: '1rem 3rem',
      fontFamily: FONT,
      fontSize: '1.4rem',
      letterSpacing: '0.1em',
      background: BROWN,
      color: PARCHMENT,
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginBottom: '1.5rem',
      transition: 'opacity 0.2s',
    });
    startBtn.addEventListener('mouseenter', () => { startBtn.style.opacity = '0.85'; });
    startBtn.addEventListener('mouseleave', () => { startBtn.style.opacity = '1'; });
    startBtn.addEventListener('click', () => {
      this.#onStart?.(this.#seedValue);
      this.hide();
      this.#director.transition('hub');
    });
    this.#overlay.appendChild(startBtn);

    // Settings placeholder
    const settingsBtn = document.createElement('button');
    settingsBtn.textContent = 'SETTINGS';
    Object.assign(settingsBtn.style, {
      padding: '0.5rem 1.5rem',
      fontFamily: FONT,
      fontSize: '1rem',
      letterSpacing: '0.05em',
      background: 'none',
      border: `1px solid ${BROWN}`,
      borderRadius: '4px',
      color: INK,
      cursor: 'pointer',
      opacity: '0.7',
    });
    this.#overlay.appendChild(settingsBtn);

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
