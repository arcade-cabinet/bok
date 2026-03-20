const PARCHMENT_BG = '#fdf6e3';
const INK_COLOR = '#2c1e16';
const BORDER_COLOR = '#8b5a2b';

export interface TomeWeaponDisplay {
  name: string;
  damage: number;
  type: string;
}

/**
 * Diegetic tome UI overlay. Shows current weapon info floating above
 * parchment-styled pages. Rendered as a DOM overlay to avoid 3D rendering
 * complexity — the 3D book model is handled by the scene.
 */
export class TomeOverlay {
  readonly #container: HTMLDivElement;
  readonly #weaponName: HTMLDivElement;
  readonly #weaponStats: HTMLDivElement;
  #visible = false;

  constructor(parent: HTMLElement) {
    this.#container = document.createElement('div');
    Object.assign(this.#container.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '400px',
      minHeight: '300px',
      background: PARCHMENT_BG,
      border: `3px solid ${BORDER_COLOR}`,
      borderRadius: '8px',
      padding: '32px',
      fontFamily: "'Cormorant Garamond', serif",
      color: INK_COLOR,
      zIndex: '30',
      display: 'none',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    });

    const title = document.createElement('h2');
    Object.assign(title.style, {
      textAlign: 'center',
      fontSize: '24px',
      marginBottom: '16px',
      borderBottom: `1px solid ${BORDER_COLOR}`,
      paddingBottom: '8px',
    });
    title.textContent = 'Tome of Knowledge';
    this.#container.appendChild(title);

    this.#weaponName = document.createElement('div');
    Object.assign(this.#weaponName.style, {
      textAlign: 'center',
      fontSize: '20px',
      fontWeight: '700',
      marginBottom: '8px',
    });
    this.#container.appendChild(this.#weaponName);

    this.#weaponStats = document.createElement('div');
    Object.assign(this.#weaponStats.style, {
      textAlign: 'center',
      fontSize: '14px',
      opacity: '0.7',
    });
    this.#container.appendChild(this.#weaponStats);

    parent.appendChild(this.#container);
  }

  show(weapon?: TomeWeaponDisplay): void {
    this.#visible = true;
    this.#container.style.display = 'block';
    if (weapon) {
      this.#weaponName.textContent = weapon.name;
      this.#weaponStats.textContent = `${weapon.type} — ${weapon.damage} damage`;
    } else {
      this.#weaponName.textContent = 'No weapon equipped';
      this.#weaponStats.textContent = '';
    }
  }

  hide(): void {
    this.#visible = false;
    this.#container.style.display = 'none';
  }

  toggle(weapon?: TomeWeaponDisplay): void {
    if (this.#visible) {
      this.hide();
    } else {
      this.show(weapon);
    }
  }

  get visible(): boolean {
    return this.#visible;
  }

  destroy(): void {
    this.#container.remove();
  }
}
