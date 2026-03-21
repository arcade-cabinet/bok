import { useRef, useEffect, useState, useCallback } from 'react';
import { initGame, type GameInstance } from '../../engine/GameEngine';
import type { GameConfig } from '../../app/App';
import type { EngineState, EngineEvent } from '../../engine/types';

interface Props {
  config: GameConfig;
  onReturnToMenu: () => void;
}

/**
 * GameView — mounts the JollyPixel canvas, initializes the engine,
 * and renders React HUD overlays on top.
 */
export function GameView({ config, onReturnToMenu }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameInstance | null>(null);
  const [engineState, setEngineState] = useState<EngineState | null>(null);

  // Poll engine state at 10fps for React HUD updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameRef.current) {
        setEngineState(gameRef.current.getState());
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Initialize engine
  useEffect(() => {
    if (!canvasRef.current || gameRef.current) return;

    initGame(canvasRef.current, { biome: config.biome, seed: config.seed })
      .then((game) => {
        gameRef.current = game;

        // Listen for engine events
        game.onEvent((event: EngineEvent) => {
          if (event.type === 'playerDied' || event.type === 'bossDefeated') {
            setEngineState(game.getState());
          }
        });
      });

    return () => {
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, [config, onReturnToMenu]);

  // Escape key → pause
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Escape') gameRef.current?.togglePause();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleResume = useCallback(() => {
    gameRef.current?.togglePause();
  }, []);

  return (
    <div className="fixed inset-0">
      <canvas
        ref={canvasRef}
        id="game-canvas"
        tabIndex={-1}
        className="w-full h-full block outline-none"
        style={{ touchAction: 'none' }}
      />

      {/* HUD — only show while playing */}
      {engineState?.phase === 'playing' && (
        <div className="fixed inset-0 pointer-events-none z-10">
          {/* Health bar */}
          <div className="absolute top-4 left-4 bg-[#fdf6e3]/85 border-2 border-[#8b5a2b] rounded-md px-3 py-2" style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}>
            <div className="text-xs mb-1">Health</div>
            <div className="w-36 h-3 bg-[#3a2a1a] rounded-sm overflow-hidden">
              <div className="h-full bg-[#c0392b] transition-all duration-300" style={{ width: `${(engineState.playerHealth / engineState.maxHealth) * 100}%` }} />
            </div>
            <div className="text-[10px] mt-0.5">{engineState.playerHealth} / {engineState.maxHealth}</div>
          </div>

          {/* Enemy counter */}
          <div className="absolute top-4 right-4 bg-[#fdf6e3]/85 border-2 border-[#8b5a2b] rounded-md px-3 py-2 text-xs" style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}>
            <div>Enemies: {engineState.enemyCount}</div>
            <div>Biome: {engineState.biomeName}</div>
          </div>

          {/* Crosshair */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_4px_rgba(0,0,0,0.5)]" />

          {/* Boss health bar */}
          {engineState.bossNearby && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center">
              <div className="text-sm mb-1" style={{ fontFamily: 'Georgia, serif', color: '#fdf6e3', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                Ancient Treant (Phase {engineState.bossPhase})
              </div>
              <div className="w-72 h-2.5 bg-[#3a2a1a] rounded-sm overflow-hidden border border-[#8b5a2b]">
                <div className="h-full bg-purple-700 transition-all duration-300" style={{ width: `${engineState.bossHealthPct * 100}%` }} />
              </div>
            </div>
          )}

          {/* Hotbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`w-12 h-12 rounded border-2 flex items-center justify-center text-xs ${i === 1 ? 'border-[#fdf6e3] bg-[#fdf6e3]/90' : 'border-[#8b5a2b] bg-[#fdf6e3]/60'}`}
                   style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}>
                {i === 1 ? 'Sword' : ''}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pause overlay */}
      {engineState?.phase === 'paused' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#fdf6e3] border-3 border-[#8b5a2b] rounded-xl p-9 text-center">
            <h2 className="text-3xl mb-6" style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}>PAUSED</h2>
            <button onClick={handleResume} className="block w-full mb-2 py-2.5 rounded-md border-2 border-[#8b5a2b] bg-[#2c1e16] text-[#fdf6e3] cursor-pointer text-base" style={{ fontFamily: 'Georgia, serif' }}>
              Resume
            </button>
            <button onClick={onReturnToMenu} className="block w-full py-2.5 rounded-md border-2 border-[#8b5a2b] bg-[#fef9ef] text-[#2c1e16] cursor-pointer text-base" style={{ fontFamily: 'Georgia, serif' }}>
              Quit to Menu
            </button>
          </div>
        </div>
      )}

      {/* Death screen */}
      {engineState?.phase === 'dead' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="bg-[#fdf6e3] border-3 border-[#8b5a2b] rounded-xl p-12 text-center">
            <h1 className="text-4xl mb-2" style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}>THE CHAPTER ENDS</h1>
            <p className="text-sm italic mb-6" style={{ fontFamily: 'Georgia, serif', color: '#8b5a2b' }}>
              The ink fades, but the story can be rewritten.
            </p>
            <button onClick={onReturnToMenu} className="py-3 px-8 rounded-md border-2 border-[#8b5a2b] bg-[#2c1e16] text-[#fdf6e3] cursor-pointer text-lg" style={{ fontFamily: 'Georgia, serif' }}>
              TURN THE PAGE
            </button>
          </div>
        </div>
      )}

      {/* Victory screen */}
      {engineState?.phase === 'victory' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85">
          <div className="bg-[#fdf6e3] border-3 border-[#8b5a2b] rounded-xl p-12 text-center">
            <h1 className="text-3xl mb-2" style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}>A NEW PAGE IS WRITTEN</h1>
            <p className="text-lg italic mb-1" style={{ fontFamily: 'Georgia, serif', color: '#8b5a2b' }}>You have unlocked: Dash</p>
            <p className="text-sm mb-6" style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}>
              The Ancient Treant falls. A new ability inscribes itself into your Tome.
            </p>
            <button onClick={onReturnToMenu} className="py-3 px-8 rounded-md border-2 border-[#8b5a2b] bg-[#2c1e16] text-[#fdf6e3] cursor-pointer text-lg" style={{ fontFamily: 'Georgia, serif' }}>
              CONTINUE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
