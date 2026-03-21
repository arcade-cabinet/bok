import { useRef, useEffect, useState, useCallback } from 'react';
import { initGame, type GameInstance } from '../../engine/GameEngine';
import type { GameConfig } from '../../app/App';
import type { EngineState, EngineEvent } from '../../engine/types';
import { ContextIndicator } from '../../components/hud/ContextIndicator';
import { useDeviceType } from '../../hooks/useDeviceType';

interface Props {
  config: GameConfig;
  onReturnToMenu: () => void;
  onBossDefeated?: (bossId: string, tomeAbility: string) => Promise<void>;
  onRunEnd?: (seed: string, biome: string, result: 'victory' | 'death' | 'abandoned', duration: number) => Promise<void>;
}

/**
 * GameView — mounts the JollyPixel canvas, initializes the engine,
 * and renders React HUD overlays on top.
 */
export function GameView({ config, onReturnToMenu, onBossDefeated, onRunEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameInstance | null>(null);
  const startTimeRef = useRef(Date.now());
  const [engineState, setEngineState] = useState<EngineState | null>(null);
  const { isMobile, screenWidth, screenHeight } = useDeviceType();

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
          if (event.type === 'bossDefeated') {
            const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
            onBossDefeated?.(event.bossId, event.tomeAbility);
            onRunEnd?.(config.seed, config.biome, 'victory', duration);
          }
          if (event.type === 'playerDied') {
            const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
            onRunEnd?.(config.seed, config.biome, 'death', duration);
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

  // Resize canvas on orientation/screen change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = screenWidth * devicePixelRatio;
    canvas.height = screenHeight * devicePixelRatio;
  }, [screenWidth, screenHeight]);

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

      {/* Diegetic context indicator */}
      {engineState?.phase === 'playing' && (
        <ContextIndicator context={engineState.context} />
      )}

      {/* HUD — only show while playing */}
      {engineState?.phase === 'playing' && (
        <div className="fixed inset-0 pointer-events-none z-10" style={{ padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)' }}>
          {/* Health bar */}
          <div className={`absolute top-4 left-4 bg-[#fdf6e3]/85 border-2 border-[#8b5a2b] rounded-md ${isMobile ? 'px-2 py-1' : 'px-3 py-2'}`} style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}>
            <div className={`${isMobile ? 'text-[9px]' : 'text-xs'} mb-1`}>Health</div>
            <div className={`${isMobile ? 'w-24 h-2' : 'w-36 h-3'} bg-[#3a2a1a] rounded-sm overflow-hidden`}>
              <div className="h-full bg-[#c0392b] transition-all duration-300" style={{ width: `${(engineState.playerHealth / engineState.maxHealth) * 100}%` }} />
            </div>
            <div className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} mt-0.5`}>{engineState.playerHealth} / {engineState.maxHealth}</div>
          </div>

          {/* Enemy counter */}
          <div className={`absolute top-4 right-4 bg-[#fdf6e3]/85 border-2 border-[#8b5a2b] rounded-md ${isMobile ? 'px-2 py-1 text-[9px]' : 'px-3 py-2 text-xs'}`} style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}>
            <div>Enemies: {engineState.enemyCount}</div>
            <div>Biome: {engineState.biomeName}</div>
          </div>

          {/* Crosshair */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_4px_rgba(0,0,0,0.5)]" />

          {/* Threat indicator — ring around crosshair that tightens with proximity */}
          {engineState.threatLevel !== 'none' && (
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-500"
              style={{
                width: engineState.threatLevel === 'high' ? 20 : engineState.threatLevel === 'medium' ? 28 : 36,
                height: engineState.threatLevel === 'high' ? 20 : engineState.threatLevel === 'medium' ? 28 : 36,
                borderColor: engineState.threatLevel === 'high' ? 'rgba(220,38,38,0.7)' : engineState.threatLevel === 'medium' ? 'rgba(234,179,8,0.5)' : 'rgba(255,255,255,0.2)',
                opacity: engineState.threatLevel === 'high' ? 1 : 0.6,
              }}
            />
          )}

          {/* Stamina warning — dodge unavailable */}
          {!engineState.canDodge && (
            <div className="absolute top-1/2 left-1/2 mt-4 -translate-x-1/2 text-[9px] text-red-400/80" style={{ fontFamily: 'Georgia, serif', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              LOW STAMINA
            </div>
          )}

          {/* Boss health bar */}
          {engineState.bossNearby && (
            <div className={`absolute ${isMobile ? 'bottom-24' : 'bottom-20'} left-1/2 -translate-x-1/2 text-center`}>
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} mb-1`} style={{ fontFamily: 'Georgia, serif', color: '#fdf6e3', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                Ancient Treant (Phase {engineState.bossPhase})
              </div>
              <div className={`${isMobile ? 'w-52' : 'w-72'} h-2.5 bg-[#3a2a1a] rounded-sm overflow-hidden border border-[#8b5a2b]`}>
                <div className="h-full bg-purple-700 transition-all duration-300" style={{ width: `${engineState.bossHealthPct * 100}%` }} />
              </div>
            </div>
          )}

          {/* Hotbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`${isMobile ? 'w-9 h-9 text-[9px]' : 'w-12 h-12 text-xs'} rounded border-2 flex items-center justify-center ${i === 1 ? 'border-[#fdf6e3] bg-[#fdf6e3]/90' : 'border-[#8b5a2b] bg-[#fdf6e3]/60'}`}
                   style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}>
                {i === 1 ? 'Sword' : ''}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pause overlay */}
      {engineState?.phase === 'paused' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 overlay-safe-area">
          <div className={`bg-[#fdf6e3] border-3 border-[#8b5a2b] rounded-xl ${isMobile ? 'p-6' : 'p-9'} text-center`}>
            <h2 className={`${isMobile ? 'text-2xl mb-4' : 'text-3xl mb-6'}`} style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}>PAUSED</h2>
            <button onClick={handleResume} className={`block w-full mb-2 py-2.5 rounded-md border-2 border-[#8b5a2b] bg-[#2c1e16] text-[#fdf6e3] cursor-pointer ${isMobile ? 'text-sm' : 'text-base'}`} style={{ fontFamily: 'Georgia, serif' }}>
              Resume
            </button>
            <button onClick={onReturnToMenu} className={`block w-full py-2.5 rounded-md border-2 border-[#8b5a2b] bg-[#fef9ef] text-[#2c1e16] cursor-pointer ${isMobile ? 'text-sm' : 'text-base'}`} style={{ fontFamily: 'Georgia, serif' }}>
              Quit to Menu
            </button>
          </div>
        </div>
      )}

      {/* Death screen */}
      {engineState?.phase === 'dead' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 overlay-safe-area">
          <div className={`bg-[#fdf6e3] border-3 border-[#8b5a2b] rounded-xl ${isMobile ? 'p-7 mx-4' : 'p-12'} text-center`}>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} mb-2`} style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}>THE CHAPTER ENDS</h1>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} italic mb-6`} style={{ fontFamily: 'Georgia, serif', color: '#8b5a2b' }}>
              The ink fades, but the story can be rewritten.
            </p>
            <button onClick={onReturnToMenu} className={`${isMobile ? 'py-2.5 px-6 text-base' : 'py-3 px-8 text-lg'} rounded-md border-2 border-[#8b5a2b] bg-[#2c1e16] text-[#fdf6e3] cursor-pointer`} style={{ fontFamily: 'Georgia, serif' }}>
              TURN THE PAGE
            </button>
          </div>
        </div>
      )}

      {/* Victory screen */}
      {engineState?.phase === 'victory' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 overlay-safe-area">
          <div className={`bg-[#fdf6e3] border-3 border-[#8b5a2b] rounded-xl ${isMobile ? 'p-7 mx-4' : 'p-12'} text-center`}>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} mb-2`} style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}>A NEW PAGE IS WRITTEN</h1>
            <p className={`${isMobile ? 'text-base' : 'text-lg'} italic mb-1`} style={{ fontFamily: 'Georgia, serif', color: '#8b5a2b' }}>You have unlocked: Dash</p>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} mb-6`} style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}>
              The Ancient Treant falls. A new ability inscribes itself into your Tome.
            </p>
            <button onClick={onReturnToMenu} className={`${isMobile ? 'py-2.5 px-6 text-base' : 'py-3 px-8 text-lg'} rounded-md border-2 border-[#8b5a2b] bg-[#2c1e16] text-[#fdf6e3] cursor-pointer`} style={{ fontFamily: 'Georgia, serif' }}>
              CONTINUE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
