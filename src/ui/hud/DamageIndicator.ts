const VIGNETTE_COLOR = 'rgba(139, 26, 26, 0.4)';
const FADE_DURATION = 300;
const SHAKE_INTENSITY = 6;
const SHAKE_DURATION = 150;

export class DamageIndicator {
  readonly #overlay: HTMLDivElement;
  readonly #canvas: HTMLCanvasElement;
  #fadeTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(parent: HTMLElement, canvas: HTMLCanvasElement) {
    this.#canvas = canvas;

    this.#overlay = document.createElement('div');
    Object.assign(this.#overlay.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '20',
      opacity: '0',
      transition: `opacity ${FADE_DURATION}ms ease-out`,
      background: `radial-gradient(ellipse at center, transparent 50%, ${VIGNETTE_COLOR} 100%)`,
    });

    parent.appendChild(this.#overlay);
  }

  flash(): void {
    // Red vignette
    if (this.#fadeTimeout) clearTimeout(this.#fadeTimeout);
    this.#overlay.style.transition = 'none';
    this.#overlay.style.opacity = '1';

    // Force reflow then fade
    void this.#overlay.offsetHeight;
    this.#overlay.style.transition = `opacity ${FADE_DURATION}ms ease-out`;
    this.#fadeTimeout = setTimeout(() => {
      this.#overlay.style.opacity = '0';
      this.#fadeTimeout = null;
    }, 50);

    // Screen shake
    this.#shake();
  }

  #shake(): void {
    const start = performance.now();
    const originalTransform = this.#canvas.style.transform;

    const step = (now: number) => {
      const elapsed = now - start;
      if (elapsed > SHAKE_DURATION) {
        this.#canvas.style.transform = originalTransform;
        return;
      }

      const decay = 1 - elapsed / SHAKE_DURATION;
      const dx = (Math.random() * 2 - 1) * SHAKE_INTENSITY * decay;
      const dy = (Math.random() * 2 - 1) * SHAKE_INTENSITY * decay;
      this.#canvas.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  destroy(): void {
    if (this.#fadeTimeout) clearTimeout(this.#fadeTimeout);
    this.#overlay.remove();
  }
}
