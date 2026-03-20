const PARCHMENT_BG = '#fdf6e3';
const INK_COLOR = '#2c1e16';
const BORDER_COLOR = '#8b5a2b';
const ACTIVE_BG = '#e8d5b7';
const SLOT_COUNT = 5;

export class Hotbar {
  readonly #container: HTMLDivElement;
  readonly #slots: HTMLDivElement[] = [];
  #activeIndex = 0;

  constructor(parent: HTMLElement) {
    this.#container = document.createElement('div');
    Object.assign(this.#container.style, {
      position: 'absolute',
      bottom: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '4px',
      zIndex: '10',
    });

    for (let i = 0; i < SLOT_COUNT; i++) {
      const slot = document.createElement('div');
      Object.assign(slot.style, {
        width: '56px',
        height: '56px',
        background: PARCHMENT_BG,
        border: `2px solid ${BORDER_COLOR}`,
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: '11px',
        color: INK_COLOR,
        cursor: 'pointer',
        transition: 'background 0.15s',
        position: 'relative',
      });

      const keyHint = document.createElement('span');
      Object.assign(keyHint.style, {
        position: 'absolute',
        top: '2px',
        right: '4px',
        fontSize: '9px',
        opacity: '0.5',
      });
      keyHint.textContent = `${i + 1}`;
      slot.appendChild(keyHint);

      const label = document.createElement('span');
      label.dataset.label = 'true';
      label.textContent = '---';
      slot.appendChild(label);

      this.#slots.push(slot);
      this.#container.appendChild(slot);
    }

    this.#updateHighlight();

    document.addEventListener('keydown', this.#onKeyDown);
    document.addEventListener('wheel', this.#onWheel, { passive: true });

    parent.appendChild(this.#container);
  }

  get activeIndex(): number {
    return this.#activeIndex;
  }

  setSlotLabel(index: number, name: string): void {
    if (index < 0 || index >= SLOT_COUNT) return;
    const label = this.#slots[index].querySelector('[data-label]');
    if (label) label.textContent = name || '---';
  }

  setActive(index: number): void {
    if (index < 0 || index >= SLOT_COUNT) return;
    this.#activeIndex = index;
    this.#updateHighlight();
  }

  #updateHighlight(): void {
    for (let i = 0; i < this.#slots.length; i++) {
      this.#slots[i].style.background = i === this.#activeIndex ? ACTIVE_BG : PARCHMENT_BG;
      this.#slots[i].style.borderWidth = i === this.#activeIndex ? '3px' : '2px';
    }
  }

  readonly #onKeyDown = (e: KeyboardEvent): void => {
    const digit = parseInt(e.key, 10);
    if (digit >= 1 && digit <= SLOT_COUNT) {
      this.setActive(digit - 1);
    }
  };

  readonly #onWheel = (e: WheelEvent): void => {
    const direction = e.deltaY > 0 ? 1 : -1;
    this.setActive((this.#activeIndex + direction + SLOT_COUNT) % SLOT_COUNT);
  };

  destroy(): void {
    document.removeEventListener('keydown', this.#onKeyDown);
    document.removeEventListener('wheel', this.#onWheel);
    this.#container.remove();
  }
}
