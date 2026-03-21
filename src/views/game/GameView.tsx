import { useCallback, useState } from 'react';
import type { GameConfig } from '../../app/App';
import { ContextIndicator } from '../../components/hud/ContextIndicator';
import { DamageIndicator } from '../../components/hud/DamageIndicator';
import { HealthBar } from '../../components/hud/HealthBar';
import { Hotbar, type SlotData } from '../../components/hud/Hotbar';
import { Minimap } from '../../components/hud/Minimap';
import { DeathScreen } from '../../components/modals/DeathScreen';
import { PauseMenu } from '../../components/modals/PauseMenu';
import { TomePageBrowser } from '../../components/modals/TomePageBrowser';
import { VictoryScreen } from '../../components/modals/VictoryScreen';
import { TouchControls } from '../../components/ui/TouchControls';
import { TOME_PAGE_CATALOG } from '../../content/tomePages';
import { useDeviceType } from '../../hooks/useDeviceType';
import { useGameEvents } from '../../hooks/useGameEvents';
import { useGameHUD } from '../../hooks/useGameHUD';
import { useGameLifecycle } from '../../hooks/useGameLifecycle';

interface Props {
  config: GameConfig;
  onReturnToMenu: () => void;
  onQuitToMenu: () => void;
  onBossDefeated?: (bossId: string, tomeAbility: string) => Promise<void>;
  onRunEnd?: (
    seed: string,
    biome: string,
    result: 'victory' | 'death' | 'abandoned',
    duration: number,
  ) => Promise<void>;
}

const hotbarSlots: SlotData[] = [{ label: 'Sword' }, { label: '' }, { label: '' }, { label: '' }, { label: '' }];

/**
 * GameView — mounts the JollyPixel canvas, initializes the engine,
 * and renders React HUD overlays on top.
 */
export function GameView({ config, onReturnToMenu, onQuitToMenu, onBossDefeated, onRunEnd }: Props) {
  const { isMobile, screenWidth, screenHeight } = useDeviceType();
  const [activeSlot, setActiveSlot] = useState(0);
  // Lifecycle: canvas, engine init/cleanup, keyboard, resize
  const { canvasRef, gameRef, showTome, setShowTome, handleResume, handleTouchOutput } = useGameLifecycle(
    config,
    (event) => events.handleEngineEvent(event),
    screenWidth,
    screenHeight,
  );
  // HUD polling: 10fps engine state bridge
  const [engineState, setEngineState] = useGameHUD(gameRef);
  // Event side-effects: damage flash, kill tracking, death/victory stats
  const events = useGameEvents(config, gameRef, setEngineState, { onBossDefeated, onRunEnd });

  const handleAbandonRun = useCallback(() => {
    const duration = Math.round((Date.now() - events.startTimeRef.current) / 1000);
    onRunEnd?.(config.seed, config.biome, 'abandoned', duration);
    onReturnToMenu();
  }, [config, onRunEnd, onReturnToMenu, events.startTimeRef]);

  return (
    <div className="fixed inset-0">
      <canvas
        ref={canvasRef}
        id="game-canvas"
        tabIndex={-1}
        className="w-full h-full block outline-none"
        style={{ touchAction: 'none' }}
      />
      <DamageIndicator ref={events.damageRef} canvasRef={canvasRef} />
      <TouchControls onOutput={handleTouchOutput} enabled={isMobile && engineState?.phase === 'playing'} />
      {engineState?.phase === 'playing' && <ContextIndicator context={engineState.context} />}
      {engineState?.phase === 'playing' && (
        <div
          className="fixed inset-0 pointer-events-none z-10"
          style={{
            padding:
              'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
          }}
        >
          <HealthBar current={engineState.playerHealth} max={engineState.maxHealth} />
          <Minimap playerX={engineState.playerX} playerZ={engineState.playerZ} markers={engineState.minimapMarkers} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_4px_rgba(0,0,0,0.5)]" />
          {engineState.threatLevel !== 'none' && (
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-500"
              style={{
                width: engineState.threatLevel === 'high' ? 20 : engineState.threatLevel === 'medium' ? 28 : 36,
                height: engineState.threatLevel === 'high' ? 20 : engineState.threatLevel === 'medium' ? 28 : 36,
                borderColor:
                  engineState.threatLevel === 'high'
                    ? 'rgba(220,38,38,0.7)'
                    : engineState.threatLevel === 'medium'
                      ? 'rgba(234,179,8,0.5)'
                      : 'rgba(255,255,255,0.2)',
                opacity: engineState.threatLevel === 'high' ? 1 : 0.6,
              }}
            />
          )}
          {!engineState.canDodge && (
            <div
              className="absolute top-1/2 left-1/2 mt-4 -translate-x-1/2 text-[9px] text-red-400/80"
              style={{ fontFamily: 'Georgia, serif', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
            >
              LOW STAMINA
            </div>
          )}
          {engineState.bossNearby && (
            <div className={`absolute ${isMobile ? 'bottom-24' : 'bottom-20'} left-1/2 -translate-x-1/2 text-center`}>
              <div
                className={`${isMobile ? 'text-xs' : 'text-sm'} mb-1`}
                style={{ fontFamily: 'Georgia, serif', color: '#fdf6e3', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
              >
                Ancient Treant (Phase {engineState.bossPhase})
              </div>
              <div
                className={`${isMobile ? 'w-52' : 'w-72'} h-2.5 bg-[#3a2a1a] rounded-sm overflow-hidden border border-[#8b5a2b]`}
              >
                <div
                  className="h-full bg-purple-700 transition-all duration-300"
                  style={{ width: `${engineState.bossHealthPct * 100}%` }}
                />
              </div>
            </div>
          )}
          <Hotbar slots={hotbarSlots} activeIndex={activeSlot} onSelect={setActiveSlot} />
        </div>
      )}
      {showTome && (
        <TomePageBrowser
          pages={events.unlockedAbilitiesRef.current.map((id, i) => {
            const meta = TOME_PAGE_CATALOG[id];
            return meta
              ? { id, name: meta.name, icon: meta.icon, description: meta.description, level: i + 1 }
              : { id, name: id, icon: '📜', description: 'An unknown ability inscribed in the tome.', level: i + 1 };
          })}
          onClose={() => setShowTome(false)}
        />
      )}
      {engineState?.phase === 'paused' && (
        <PauseMenu onResume={handleResume} onAbandonRun={handleAbandonRun} onQuitToMenu={onQuitToMenu} />
      )}
      {engineState?.phase === 'dead' && events.deathStats && (
        <DeathScreen stats={events.deathStats} onReturnToHub={onReturnToMenu} />
      )}
      {engineState?.phase === 'victory' && events.victoryStats && (
        <VictoryScreen stats={events.victoryStats} onContinueVoyage={onReturnToMenu} onReturnToHub={onReturnToMenu} />
      )}
    </div>
  );
}
