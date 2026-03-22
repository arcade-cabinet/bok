/**
 * Full-screen loading fallback for React.lazy Suspense boundaries.
 * Styled with parchment theme colors to match the game aesthetic.
 */
export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0a0a0a' }}>
      <div className="text-center">
        <div
          className="text-2xl animate-pulse"
          style={{
            fontFamily: 'Cinzel, Georgia, serif',
            color: '#c4a572',
            letterSpacing: '0.08em',
          }}
        >
          Loading
        </div>
        <div
          className="mt-3 text-sm"
          style={{
            fontFamily: 'Georgia, serif',
            color: '#8b5a2b',
          }}
        >
          Preparing the realm...
        </div>
      </div>
    </div>
  );
}
