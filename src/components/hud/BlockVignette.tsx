/**
 * @module components/hud/BlockVignette
 * @role Subtle blue vignette overlay when the player is actively blocking
 */

interface Props {
  /** Whether the player is currently holding block/defend */
  isBlocking: boolean;
}

/**
 * A subtle blue radial vignette that fades in when the player holds block.
 * Provides visual feedback that the defensive stance is active.
 */
export function BlockVignette({ isBlocking }: Props) {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-30"
      aria-hidden="true"
      style={{
        background: 'radial-gradient(circle, transparent 50%, rgba(100,150,255,0.15) 100%)',
        opacity: isBlocking ? 1 : 0,
        transition: 'opacity 0.1s ease-out',
      }}
    />
  );
}
