const PARCHMENT_BG = '#fdf6e3';
const INK_COLOR = '#2c1e16';
const BORDER_COLOR = '#8b5a2b';
const CARD_BG = '#f5ead0';

export interface TomePage {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number;
}

/**
 * Full-screen overlay for browsing unlocked Tome pages/abilities.
 * Opened via Tab key. Grid layout of page cards with parchment aesthetic.
 */
export class PageBrowser {
  readonly #overlay: HTMLDivElement;
  readonly #grid: HTMLDivElement;
  #visible = false;

  constructor(parent: HTMLElement) {
    this.#overlay = document.createElement('div');
    Object.assign(this.#overlay.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(10, 10, 10, 0.85)',
      zIndex: '40',
      display: 'none',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: "'Cormorant Garamond', serif",
      color: INK_COLOR,
    });

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      width: '80%',
      maxWidth: '800px',
      maxHeight: '80vh',
      background: PARCHMENT_BG,
      border: `3px solid ${BORDER_COLOR}`,
      borderRadius: '8px',
      padding: '24px',
      overflowY: 'auto',
    });

    const title = document.createElement('h2');
    Object.assign(title.style, {
      textAlign: 'center',
      fontSize: '28px',
      marginBottom: '20px',
      borderBottom: `2px solid ${BORDER_COLOR}`,
      paddingBottom: '12px',
    });
    title.textContent = 'Tome Pages';
    panel.appendChild(title);

    this.#grid = document.createElement('div');
    Object.assign(this.#grid.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: '12px',
    });
    panel.appendChild(this.#grid);

    this.#overlay.appendChild(panel);
    parent.appendChild(this.#overlay);
  }

  setPages(pages: TomePage[]): void {
    while (this.#grid.firstChild) {
      this.#grid.removeChild(this.#grid.firstChild);
    }

    for (const page of pages) {
      const card = document.createElement('div');
      Object.assign(card.style, {
        background: CARD_BG,
        border: `1px solid ${BORDER_COLOR}`,
        borderRadius: '6px',
        padding: '12px',
        textAlign: 'center',
      });

      const icon = document.createElement('div');
      icon.style.fontSize = '32px';
      icon.style.marginBottom = '6px';
      icon.textContent = page.icon;
      card.appendChild(icon);

      const name = document.createElement('div');
      Object.assign(name.style, {
        fontSize: '16px',
        fontWeight: '700',
        marginBottom: '4px',
      });
      name.textContent = page.name;
      card.appendChild(name);

      const level = document.createElement('div');
      Object.assign(level.style, {
        fontSize: '11px',
        opacity: '0.6',
        marginBottom: '6px',
      });
      level.textContent = `Level ${page.level}`;
      card.appendChild(level);

      const desc = document.createElement('div');
      Object.assign(desc.style, {
        fontSize: '12px',
        lineHeight: '1.4',
      });
      desc.textContent = page.description;
      card.appendChild(desc);

      this.#grid.appendChild(card);
    }
  }

  show(): void {
    this.#visible = true;
    this.#overlay.style.display = 'flex';
  }

  hide(): void {
    this.#visible = false;
    this.#overlay.style.display = 'none';
  }

  toggle(): void {
    if (this.#visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  get visible(): boolean {
    return this.#visible;
  }

  destroy(): void {
    this.#overlay.remove();
  }
}
