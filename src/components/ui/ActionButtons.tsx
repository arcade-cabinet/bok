/**
 * Floating action buttons for mobile/touch devices.
 *
 * Two columns on the right side:
 * - Left column: Jump, Crouch, Interact
 * - Right column: Attack (large), Dodge, Block (hold)
 *
 * Plus a Place Block button on the left side near the joystick.
 */

interface Props {
  onAttack: () => void;
  onDodge: () => void;
  onBlock?: () => void;
  onBlockRelease?: () => void;
  onInteract?: () => void;
  onJump?: () => void;
  onPlaceBlock?: () => void;
  onBreakBlock?: () => void;
}

export function ActionButtons({
  onAttack,
  onDodge,
  onBlock,
  onBlockRelease,
  onInteract,
  onJump,
  onPlaceBlock,
  onBreakBlock,
}: Props) {
  return (
    <>
      {/* Right side — combat actions */}
      <div
        className="fixed bottom-20 right-2 z-20 grid grid-cols-2 gap-2 pointer-events-auto"
        style={{
          paddingRight: 'env(safe-area-inset-right)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Jump */}
        <button
          type="button"
          data-testid="jump-button"
          aria-label="Jump"
          className="btn btn-circle btn-sm btn-ghost border border-white/30 shadow-md active:scale-90 w-11 h-11 text-base"
          onPointerDown={(e) => {
            e.preventDefault();
            onJump?.();
          }}
        >
          <span aria-hidden="true">⬆</span>
        </button>

        {/* Attack — primary, larger */}
        <button
          type="button"
          data-testid="attack-button"
          aria-label="Attack"
          className="btn btn-circle btn-primary shadow-lg active:scale-90 w-14 h-14 text-xl row-span-2"
          onPointerDown={(e) => {
            e.preventDefault();
            onAttack();
          }}
        >
          <span aria-hidden="true">⚔</span>
        </button>

        {/* Interact */}
        <button
          type="button"
          data-testid="interact-button"
          aria-label="Interact"
          className="btn btn-circle btn-sm btn-info shadow-md active:scale-90 w-11 h-11 text-base"
          onPointerDown={(e) => {
            e.preventDefault();
            onInteract?.();
          }}
        >
          <span aria-hidden="true">✋</span>
        </button>

        {/* Dodge */}
        <button
          type="button"
          data-testid="dodge-button"
          aria-label="Dodge"
          className="btn btn-circle btn-sm btn-secondary shadow-md active:scale-90 w-11 h-11 text-base"
          onPointerDown={(e) => {
            e.preventDefault();
            onDodge();
          }}
        >
          <span aria-hidden="true">💨</span>
        </button>

        {/* Block (hold) */}
        <button
          type="button"
          data-testid="block-button"
          aria-label="Block"
          className="btn btn-circle btn-sm btn-accent shadow-md active:scale-90 w-11 h-11 text-base"
          onPointerDown={(e) => {
            e.preventDefault();
            onBlock?.();
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            onBlockRelease?.();
          }}
          onPointerLeave={(e) => {
            e.preventDefault();
            onBlockRelease?.();
          }}
        >
          <span aria-hidden="true">🛡</span>
        </button>
      </div>

      {/* Left side — building actions (near joystick) */}
      <div
        className="fixed bottom-20 left-24 z-20 flex gap-2 pointer-events-auto"
        style={{ paddingLeft: 'env(safe-area-inset-left)' }}
      >
        <button
          type="button"
          data-testid="place-block-button"
          aria-label="Place Block"
          className="btn btn-circle btn-sm btn-warning shadow-md active:scale-90 w-11 h-11 text-base"
          onPointerDown={(e) => {
            e.preventDefault();
            onPlaceBlock?.();
          }}
        >
          <span aria-hidden="true">🧱</span>
        </button>

        <button
          type="button"
          data-testid="break-block-button"
          aria-label="Break Block"
          className="btn btn-circle btn-sm btn-error shadow-md active:scale-90 w-11 h-11 text-base"
          onPointerDown={(e) => {
            e.preventDefault();
            onBreakBlock?.();
          }}
        >
          <span aria-hidden="true">⛏</span>
        </button>
      </div>
    </>
  );
}
