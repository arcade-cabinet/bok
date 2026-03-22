import { useEffect, useRef } from 'react';

/** Display metadata for a tome page ability. */
export interface TomePage {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number;
}

interface Props {
  pages: TomePage[];
  onClose: () => void;
}

/**
 * TomePageBrowser — full-screen modal overlay for browsing unlocked tome pages.
 * Ported from dead `src/ui/tome/PageBrowser.ts`.
 * Uses daisyUI modal, card, badge, and CSS Grid (auto-fill, minmax 180px).
 */
export function TomePageBrowser({ pages, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

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

  return (
    <div
      className="modal modal-open overlay-safe-area"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tome-browser-title"
    >
      <button
        type="button"
        className="modal-backdrop bg-black/85 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close tome pages"
      />
      <div className="modal-box card bg-base-100 border-2 border-secondary max-w-3xl w-[80%] max-h-[80vh] overflow-y-auto">
        <h2
          id="tome-browser-title"
          className="text-2xl sm:text-3xl text-center mb-5 pb-3 border-b-2 border-secondary text-base-content"
          style={{ fontFamily: 'Cinzel, Georgia, serif' }}
        >
          Tome Pages
        </h2>

        {pages.length === 0 ? (
          <p
            className="text-center text-base-content/60 italic py-8"
            style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
          >
            No pages unlocked yet. Defeat bosses to inscribe new abilities.
          </p>
        ) : (
          <ul
            className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 list-none p-0 m-0"
            aria-label="Unlocked tome pages"
          >
            {pages.map((page) => (
              <li key={page.id} className="card bg-base-200/60 border border-secondary/40 p-3 text-center">
                <div className="text-3xl mb-1" aria-hidden="true">
                  {page.icon}
                </div>
                <div
                  className="font-bold text-sm mb-1 text-base-content"
                  style={{ fontFamily: 'Cinzel, Georgia, serif' }}
                >
                  {page.name}
                </div>
                <div className="badge badge-sm badge-outline badge-secondary mb-2">Lv. {page.level}</div>
                <div
                  className="text-xs leading-relaxed text-base-content/70"
                  style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
                >
                  {page.description}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 text-center">
          <button
            ref={closeRef}
            type="button"
            className="btn btn-ghost btn-sm focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
            onClick={onClose}
            aria-label="Close tome pages"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
