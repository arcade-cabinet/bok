import { useEffect, useRef, useState } from 'react';
import { SettingsModal } from './SettingsModal';

interface Props {
  onResume: () => void;
  onAbandonRun: () => void;
  onQuitToMenu: () => void;
}

/**
 * PauseMenu — modal overlay shown when the game is paused.
 * Provides Resume, Settings (placeholder), Abandon Run, and Quit to Menu actions.
 * Uses daisyUI modal, card, and btn components with the parchment theme.
 */
export function PauseMenu({ onResume, onAbandonRun, onQuitToMenu }: Props) {
  const resumeRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Focus the Resume button on mount
  useEffect(() => {
    resumeRef.current?.focus();
  }, []);

  // Escape key to resume
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onResume();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onResume]);

  // Focus trap within modal
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = modal.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  if (showSettings) {
    return <SettingsModal onClose={() => setShowSettings(false)} />;
  }

  return (
    <div
      className="modal modal-open overlay-safe-area"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-menu-title"
      ref={modalRef}
    >
      <div className="modal-backdrop bg-black/70 backdrop-blur-sm" />
      <div className="modal-box card bg-base-100 border-2 border-secondary max-w-xs sm:max-w-sm text-center">
        <h2
          id="pause-menu-title"
          className="text-2xl sm:text-3xl mb-6 text-base-content"
          style={{ fontFamily: 'Cinzel, Georgia, serif' }}
        >
          PAUSED
        </h2>

        <nav aria-label="Pause menu actions" className="flex flex-col gap-2">
          <button
            ref={resumeRef}
            type="button"
            className="btn btn-neutral w-full focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
            onClick={onResume}
          >
            Resume
          </button>

          <button
            type="button"
            className="btn btn-ghost w-full focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
            onClick={() => setShowSettings(true)}
          >
            Settings
          </button>

          <button
            type="button"
            className="btn btn-warning btn-outline w-full focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
            onClick={onAbandonRun}
          >
            Abandon Run
          </button>

          <button
            type="button"
            className="btn btn-ghost w-full focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
            onClick={onQuitToMenu}
          >
            Quit to Menu
          </button>
        </nav>
      </div>
    </div>
  );
}
