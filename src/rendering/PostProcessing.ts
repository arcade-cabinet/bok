/**
 * Screen-space post-processing effects via a CSS overlay element.
 * Uses a single overlay <div> with CSS transitions for damage vignette,
 * underwater tint, and low-health pulse — avoids EffectComposer overhead.
 */
export class PostProcessing {
  readonly #overlay: HTMLDivElement;
  #lowHealthActive = false;
  #pulsePhase = 0;

  constructor() {
    this.#overlay = document.createElement('div');
    Object.assign(this.#overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '1000',
      transition: 'box-shadow 0.15s ease-out, background-color 0.3s ease-out',
      boxShadow: 'none',
      backgroundColor: 'transparent',
    });
    document.body.appendChild(this.#overlay);
  }

  /**
   * Flash a red vignette border on damage.
   * @param intensity - 0 (none) to 1 (full red border)
   */
  damageVignette(intensity: number): void {
    const clamped = Math.max(0, Math.min(1, intensity));
    if (clamped <= 0) {
      this.#overlay.style.boxShadow = 'none';
      return;
    }

    const spread = 40 + clamped * 80; // px inset spread
    const alpha = 0.3 + clamped * 0.5;
    this.#overlay.style.boxShadow = `inset 0 0 ${spread}px rgba(180, 0, 0, ${alpha})`;

    // Auto-fade after a short delay
    setTimeout(() => {
      this.#overlay.style.boxShadow = 'none';
    }, 200 + clamped * 300);
  }

  /**
   * Toggle underwater blue tint overlay.
   * @param active - Whether the player is underwater
   */
  underwaterOverlay(active: boolean): void {
    if (active) {
      this.#overlay.style.backgroundColor = 'rgba(20, 60, 120, 0.3)';
    } else {
      this.#overlay.style.backgroundColor = 'transparent';
    }
  }

  /**
   * Pulse red border when health is critically low.
   * Call each frame with current health percentage.
   * @param healthPercent - 0 to 100
   */
  lowHealthPulse(healthPercent: number): void {
    if (healthPercent > 20) {
      if (this.#lowHealthActive) {
        this.#lowHealthActive = false;
        this.#overlay.style.boxShadow = 'none';
      }
      return;
    }

    this.#lowHealthActive = true;
  }

  /**
   * Update pulse animations. Call each frame.
   * @param dt - Delta time in seconds
   */
  update(dt: number): void {
    if (!this.#lowHealthActive) return;

    this.#pulsePhase += dt * 3; // ~3 Hz pulse
    const alpha = 0.15 + Math.sin(this.#pulsePhase) * 0.15;
    const spread = 30 + Math.sin(this.#pulsePhase) * 15;
    this.#overlay.style.boxShadow = `inset 0 0 ${spread}px rgba(180, 0, 0, ${alpha})`;
  }

  /** Remove the overlay element from the DOM. */
  dispose(): void {
    this.#overlay.remove();
  }
}
