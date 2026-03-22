import type { ComboHit } from '../../content/index';

/** Tracks 3-hit combo state with timing windows from WeaponConfig JSON. */
export class WeaponComboTracker {
  readonly #combo: ComboHit[];
  #step = 0;
  #lastAttackTime = -Infinity;

  constructor(combo: ComboHit[]) {
    this.#combo = combo;
  }

  /** Current combo step (0-based). */
  get currentStep(): number {
    return this.#step;
  }

  /** The damage multiplier for the next hit in the combo. */
  get currentMultiplier(): number {
    return this.#combo[this.#step].damageMultiplier;
  }

  /**
   * Register an attack at the given timestamp (ms).
   * Returns the ComboHit for this attack.
   * Advances combo if within timing window, resets on timeout.
   */
  attack(timestampMs: number): ComboHit {
    // Check if we're within the timing window of the previous hit
    if (this.#step > 0) {
      const prevWindow = this.#combo[this.#step - 1].windowMs;
      const elapsed = timestampMs - this.#lastAttackTime;
      if (elapsed > prevWindow) {
        // Timed out — reset to first hit
        this.#step = 0;
      }
    }

    const hit = this.#combo[this.#step];
    this.#lastAttackTime = timestampMs;
    this.#step += 1;

    // Wrap around after completing the full combo
    if (this.#step >= this.#combo.length) {
      this.#step = 0;
    }

    return hit;
  }

  /** Reset combo to step 0. */
  reset(): void {
    this.#step = 0;
    this.#lastAttackTime = -Infinity;
  }
}
