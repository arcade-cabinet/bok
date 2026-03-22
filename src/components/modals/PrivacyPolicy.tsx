import { useEffect, useRef } from 'react';

interface Props {
  onClose: () => void;
}

/**
 * PrivacyPolicy -- modal overlay displaying the game's privacy policy.
 * Styled with the parchment theme. Close button at the bottom.
 */
export function PrivacyPolicy({ onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus the close button on mount
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Escape key to close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

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

  const sectionClass = 'mb-4';
  const headingClass = 'text-lg font-semibold text-base-content mb-1';
  const textClass = 'text-sm text-base-content/80 leading-relaxed';

  return (
    <div
      className="modal modal-open overlay-safe-area"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-policy-title"
      ref={modalRef}
    >
      <button
        type="button"
        className="modal-backdrop bg-black/70 backdrop-blur-sm border-none cursor-default"
        tabIndex={-1}
        onClick={onClose}
        aria-label="Close privacy policy"
      />
      <div className="modal-box card bg-base-100 border-2 border-secondary max-w-md sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <h2
          id="privacy-policy-title"
          className="text-2xl sm:text-3xl mb-6 text-base-content text-center"
          style={{ fontFamily: 'Cinzel, Georgia, serif' }}
        >
          PRIVACY POLICY
        </h2>

        <p
          className="text-sm italic mb-6 text-secondary text-center"
          style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
        >
          Bok: The Builder's Tome
        </p>

        <div className={sectionClass}>
          <h3 className={headingClass} style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
            Data Collection
          </h3>
          <ul className={`${textClass} list-disc list-inside space-y-1`}>
            <li>Game progress is stored locally on your device</li>
            <li>No personal data is transmitted to external servers</li>
            <li>No analytics are collected unless you opt in</li>
          </ul>
        </div>

        <div className={sectionClass}>
          <h3 className={headingClass} style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
            Local Storage
          </h3>
          <ul className={`${textClass} list-disc list-inside space-y-1`}>
            <li>Save data (game progress, settings, tutorial completion)</li>
            <li>Quality preferences</li>
            <li>Analytics opt-in preference</li>
          </ul>
        </div>

        <div className={sectionClass}>
          <h3 className={headingClass} style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
            Analytics (Optional)
          </h3>
          <ul className={`${textClass} list-disc list-inside space-y-1`}>
            <li>If opted in, anonymous usage data may be collected</li>
            <li>This includes: session length, biomes visited, bosses defeated</li>
            <li>No personally identifiable information is collected</li>
            <li>You can opt out at any time in Settings</li>
          </ul>
        </div>

        <div className={sectionClass}>
          <h3 className={headingClass} style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
            Contact
          </h3>
          <p className={textClass}>For questions about privacy, contact: privacy@bokgame.dev</p>
        </div>

        <p className="text-xs text-base-content/50 mb-6 text-center">Last updated: 2026-03-21</p>

        <div className="modal-action justify-center">
          <button
            ref={closeRef}
            type="button"
            className="btn btn-neutral w-full focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
