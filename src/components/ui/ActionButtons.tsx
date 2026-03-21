/**
 * Floating action buttons for mobile/touch devices.
 *
 * Positioned in the bottom-right corner, above the hotbar,
 * sized and placed to avoid overlap with the right-side camera look area.
 * Only rendered when the device supports touch input.
 */

interface Props {
  onAttack: () => void;
  onDodge: () => void;
}

/**
 * ActionButtons -- attack and dodge buttons for touch-screen gameplay.
 * Uses daisyUI btn classes styled to match the parchment theme.
 */
export function ActionButtons({ onAttack, onDodge }: Props) {
  return (
    <div className="fixed bottom-28 right-4 z-20 flex flex-col gap-3 pointer-events-auto sm:bottom-32 sm:right-6">
      {/* Primary: Attack */}
      <button
        type="button"
        data-testid="attack-button"
        className="btn btn-circle btn-lg btn-primary shadow-lg active:scale-90 transition-transform w-16 h-16 text-2xl"
        onPointerDown={(e) => {
          e.preventDefault();
          onAttack();
        }}
      >
        <span role="img" aria-label="Attack">
          &#x2694;
        </span>
      </button>

      {/* Secondary: Dodge */}
      <button
        type="button"
        data-testid="dodge-button"
        className="btn btn-circle btn-md btn-secondary shadow-lg active:scale-90 transition-transform w-12 h-12 text-lg"
        onPointerDown={(e) => {
          e.preventDefault();
          onDodge();
        }}
      >
        <span role="img" aria-label="Dodge">
          &#x1F6E1;
        </span>
      </button>
    </div>
  );
}
