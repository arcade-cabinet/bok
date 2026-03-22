/**
 * @module audio/AudioResume
 * @role Resume audio context on first user gesture (mobile browser policy)
 * @input User gesture events (touch, mouse, key)
 * @output Tone.js audio context resumed
 *
 * Mobile browsers require a user gesture before audio can play.
 * This module listens for the first touch/mouse/key event and resumes
 * the Tone.js audio context, then removes the listeners.
 */

let installed = false;

/**
 * Install event listeners that resume the Tone.js audio context on the
 * first user gesture. Safe to call multiple times — only installs once.
 */
export function setupAudioResumeOnGesture(): void {
  if (installed) return;
  installed = true;

  const events = ['touchstart', 'mousedown', 'keydown'] as const;

  const resume = (): void => {
    import('tone').then(({ start, getContext }) => {
      if (getContext().state === 'suspended') {
        start();
      }
    });
    // Remove all listeners after first gesture
    for (const event of events) {
      document.removeEventListener(event, resume);
    }
  };

  for (const event of events) {
    document.addEventListener(event, resume, { passive: true });
  }
}

/**
 * Reset the installed flag (for testing purposes only).
 * @internal
 */
export function _resetAudioResume(): void {
  installed = false;
}
