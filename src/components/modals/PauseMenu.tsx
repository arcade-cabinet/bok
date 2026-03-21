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
  return (
    <div className="modal modal-open overlay-safe-area">
      <div className="modal-backdrop bg-black/70 backdrop-blur-sm" />
      <div className="modal-box card bg-base-100 border-2 border-secondary max-w-xs sm:max-w-sm text-center">
        <h2 className="text-2xl sm:text-3xl mb-6 text-base-content" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
          PAUSED
        </h2>

        <div className="flex flex-col gap-2">
          <button type="button" className="btn btn-neutral w-full" onClick={onResume}>
            Resume
          </button>

          <button type="button" className="btn btn-ghost btn-disabled w-full" tabIndex={-1}>
            Settings
          </button>

          <button type="button" className="btn btn-warning btn-outline w-full" onClick={onAbandonRun}>
            Abandon Run
          </button>

          <button type="button" className="btn btn-ghost w-full" onClick={onQuitToMenu}>
            Quit to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
