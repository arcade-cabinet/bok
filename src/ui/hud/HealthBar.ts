import type { Entity } from 'koota';
import { Health } from '../../traits/index.ts';

const PARCHMENT_BG = '#fdf6e3';
const INK_COLOR = '#2c1e16';
const BORDER_COLOR = '#8b5a2b';
const BAR_COLOR = '#8b1a1a';
const LOW_HEALTH_THRESHOLD = 0.2;

export class HealthBar {
  readonly #container: HTMLDivElement;
  readonly #fill: HTMLDivElement;
  readonly #label: HTMLSpanElement;
  #pulseAnimation: Animation | null = null;

  constructor(parent: HTMLElement) {
    this.#container = document.createElement('div');
    Object.assign(this.#container.style, {
      position: 'absolute',
      top: '16px',
      left: '16px',
      width: '220px',
      height: '28px',
      background: PARCHMENT_BG,
      border: `2px solid ${BORDER_COLOR}`,
      borderRadius: '4px',
      overflow: 'hidden',
      fontFamily: "'Cormorant Garamond', serif",
      zIndex: '10',
    });

    this.#fill = document.createElement('div');
    Object.assign(this.#fill.style, {
      width: '100%',
      height: '100%',
      background: BAR_COLOR,
      transition: 'width 0.2s ease-out',
    });
    this.#container.appendChild(this.#fill);

    this.#label = document.createElement('span');
    Object.assign(this.#label.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: INK_COLOR,
      fontSize: '14px',
      fontWeight: '700',
      pointerEvents: 'none',
    });
    this.#container.appendChild(this.#label);

    parent.appendChild(this.#container);
  }

  update(entity: Entity): void {
    const health = entity.get(Health);
    if (!health) return;

    const ratio = health.current / health.max;
    this.#fill.style.width = `${Math.max(0, ratio * 100)}%`;
    this.#label.textContent = `${Math.ceil(health.current)} / ${health.max}`;

    if (ratio < LOW_HEALTH_THRESHOLD && !this.#pulseAnimation) {
      this.#pulseAnimation = this.#container.animate(
        [{ opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }],
        { duration: 600, iterations: Infinity },
      );
    } else if (ratio >= LOW_HEALTH_THRESHOLD && this.#pulseAnimation) {
      this.#pulseAnimation.cancel();
      this.#pulseAnimation = null;
      this.#container.style.opacity = '1';
    }
  }

  destroy(): void {
    this.#pulseAnimation?.cancel();
    this.#container.remove();
  }
}
