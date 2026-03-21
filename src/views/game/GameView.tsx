import { useRef, useEffect } from 'react';
import type { GameConfig } from '../../app/App';

interface Props {
  config: GameConfig;
  onReturnToMenu: () => void;
}

/**
 * GameView — wraps the JollyPixel canvas and initializes the 3D game engine.
 * The canvas is managed by JollyPixel Runtime, not React.
 * React owns the UI overlays (HUD, pause menu, etc.).
 */
export function GameView({ config, onReturnToMenu }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!canvasRef.current || initialized.current) return;
    initialized.current = true;

    // Dynamic import of game engine to keep it out of the React bundle
    import('../../engine/GameEngine').then(({ initGame }) => {
      initGame(canvasRef.current!, config, onReturnToMenu);
    });
  }, [config, onReturnToMenu]);

  return (
    <div className="fixed inset-0">
      <canvas
        ref={canvasRef}
        id="game-canvas"
        tabIndex={-1}
        className="w-full h-full block outline-none"
        style={{ touchAction: 'none' }}
      />
      {/* React HUD overlays will go here */}
    </div>
  );
}
