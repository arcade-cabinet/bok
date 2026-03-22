import { useCallback, useMemo, useRef, useState } from 'react';
import type { GameConfig } from '../../app/App';
import { ContextIndicator } from '../../components/hud/ContextIndicator';
import { DamageIndicator } from '../../components/hud/DamageIndicator';
import { DamageNumbers } from '../../components/hud/DamageNumbers';
import { HealthBar } from '../../components/hud/HealthBar';
import { HintToast, type HintTrigger } from '../../components/hud/HintToast';
import { Hotbar, type SlotData } from '../../components/hud/Hotbar';
import { type Inscription, Inscriptions } from '../../components/hud/Inscriptions';
import { Minimap } from '../../components/hud/Minimap';
import { ScreenReaderAnnouncer } from '../../components/hud/ScreenReaderAnnouncer';
import { TomeUnlockBanner } from '../../components/hud/TomeUnlockBanner';
import { isTutorialCompleted, TutorialOverlay } from '../../components/hud/TutorialOverlay';
import { DeathScreen } from '../../components/modals/DeathScreen';
import { PauseMenu } from '../../components/modals/PauseMenu';
import { TomePageBrowser } from '../../components/modals/TomePageBrowser';
import { VictoryScreen } from '../../components/modals/VictoryScreen';
import { ActionButtons } from '../../components/ui/ActionButtons';
import { TouchControls } from '../../components/ui/TouchControls';
import { TOME_PAGE_CATALOG } from '../../content/tomePages';
import type { EngineEvent } from '../../engine/types';
import { useDeviceType } from '../../hooks/useDeviceType';
import { useGameEvents } from '../../hooks/useGameEvents';
import { useGameHUD } from '../../hooks/useGameHUD';
import { useGameLifecycle } from '../../hooks/useGameLifecycle';
import type { SerializedGameState } from '../../persistence/GameStateSerializer';

interface Props {
  config: GameConfig;
  savedState?: SerializedGameState | null;
  onReturnToMenu: () => void;
  onContinueVoyage?: () => void;
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
export function GameView({ config, onReturnToMenu, onContinueVoyage, onQuitToMenu, onBossDefeated, onRunEnd }: Props) {
  const { isMobile, isTouch, screenWidth, screenHeight } = useDeviceType();
  const [activeSlot, setActiveSlot] = useState(0);
  const [showTutorial, setShowTutorial] = useState(() => !isTutorialCompleted());
  const [tomeUnlock, setTomeUnlock] = useState<{ name: string; icon: string } | null>(null);
  const [newlyUnlockedTomeId, setNewlyUnlockedTomeId] = useState<string | null>(null);

  // Screen reader event subscriber
  const srEventHandlerRef = useRef<((event: EngineEvent) => void) | null>(null);
  const handleSrSubscribe = useCallback((handler: (event: EngineEvent) => void) => {
    srEventHandlerRef.current = handler;
  }, []);

  // Lifecycle: canvas, engine init/cleanup, keyboard, resize
  const { canvasRef, gameRef, showTome, setShowTome, handleResume, handleTouchOutput } = useGameLifecycle(
    config,
    (event) => {
      events.handleEngineEvent(event);
      srEventHandlerRef.current?.(event);

      // Show tome unlock banner on boss defeat
      if (event.type === 'bossDefeated') {
        const meta = TOME_PAGE_CATALOG[event.tomeAbility];
        if (meta) {
          setTomeUnlock({ name: meta.name, icon: meta.icon });
          setNewlyUnlockedTomeId(event.tomeAbility);
        }
      }
    },
    screenWidth,
    screenHeight,
  );

  // HUD polling: 10fps engine state bridge
  const [engineState, setEngineState] = useGameHUD(gameRef);

  // Event side-effects: damage flash, kill tracking, death/victory stats
  const events = useGameEvents(config, gameRef, setEngineState, { onBossDefeated, onRunEnd });

  // Derive hint triggers from engine state
  const hintTriggers = useMemo<HintTrigger[]>(() => {
    if (!engineState || engineState.phase !== 'playing') return [];
    const triggers: HintTrigger[] = [];
    if (engineState.enemyCount > 0 && engineState.threatLevel !== 'none') triggers.push('enemyNearby');
    if (engineState.bossNearby) triggers.push('bossNearby');
    if (engineState.playerHealth < engineState.maxHealth * 0.3) triggers.push('healthLow');
    return triggers;
  }, [engineState]);

  // Derive active inscriptions from engine state
  const pendingInscriptions = useMemo<Inscription[]>(() => {
    if (!engineState || engineState.phase !== 'playing') return [];
    const inscriptions: Inscription[] = [];
    // Biome discovery inscription
    if (engineState.biomeName) {
      inscriptions.push({
        id: `biome-${config.biome}`,
        title: engineState.biomeName,
        text: `You have arrived at ${engineState.biomeName}. Explore carefully.`,
        icon: '🏝️',
      });
    }
    return inscriptions;
  }, [engineState, config.biome]);

  // Extend hint triggers with damage events
  const extendedHintTriggers = useMemo<HintTrigger[]>(() => {
    if (events.damageRef.current && events.killCountRef.current === 0) {
      return [...hintTriggers, 'takeDamage' as HintTrigger];
    }
    return hintTriggers;
  }, [hintTriggers, events.damageRef, events.killCountRef]);

  const handleAbandonRun = useCallback(() => {
    const duration = Math.round((Date.now() - events.startTimeRef.current) / 1000);
    onRunEnd?.(config.seed, config.biome, 'abandoned', duration);
    onReturnToMenu();
  }, [config, onRunEnd, onReturnToMenu, events.startTimeRef]);

  const handleAttack = useCallback(() => {
    gameRef.current?.setMobileInput({ moveX: 0, moveZ: 0, lookX: 0, lookY: 0, action: 'attack' });
  }, [gameRef]);

  const handleDodge = useCallback(() => {
    gameRef.current?.setMobileInput({ moveX: 0, moveZ: 0, lookX: 0, lookY: 0, action: 'defend' });
  }, [gameRef]);

  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
  }, []);

  return (
    <div className="fixed inset-0" role="application" aria-label="Game canvas - use keyboard or touch controls to play">
      <canvas
        ref={canvasRef}
        id="game-canvas"
        tabIndex={-1}
        className="w-full h-full block outline-none"
        style={{ touchAction: 'none' }}
        aria-label="3D game world"
      />

      {/* First-run tutorial overlay — pauses game while active */}
      {showTutorial && <TutorialOverlay onComplete={handleTutorialComplete} />}

      <ScreenReaderAnnouncer engineState={engineState} onSubscribe={handleSrSubscribe} />
      <DamageIndicator ref={events.damageRef} canvasRef={canvasRef} />
      <DamageNumbers numbers={events.damageNumbers} />
      <TouchControls onOutput={handleTouchOutput} enabled={isMobile && engineState?.phase === 'playing'} />
      {(isMobile || isTouch) && engineState?.phase === 'playing' && (
        <ActionButtons onAttack={handleAttack} onDodge={handleDodge} />
      )}
      {engineState?.phase === 'playing' && <ContextIndicator context={engineState.context} />}

      {/* Contextual hint toasts */}
      {engineState?.phase === 'playing' && !showTutorial && <HintToast activeTriggers={extendedHintTriggers} />}

      {/* Discovery inscriptions */}
      {engineState?.phase === 'playing' && !showTutorial && <Inscriptions pending={pendingInscriptions} />}

      {/* Tome unlock banner */}
      <TomeUnlockBanner
        abilityName={tomeUnlock?.name ?? null}
        abilityIcon={tomeUnlock?.icon ?? null}
        onDismiss={() => setTomeUnlock(null)}
      />

      {engineState?.phase === 'playing' && (
        <div
          className="fixed inset-0 pointer-events-none z-10"
          style={{
            padding:
              'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
          }}
        >
          <HealthBar
            current={engineState.playerHealth}
            max={engineState.maxHealth}
            stamina={engineState.stamina}
            maxStamina={engineState.maxStamina}
          />
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
          newlyUnlockedId={newlyUnlockedTomeId}
        />
      )}
      {engineState?.phase === 'paused' && (
        <PauseMenu onResume={handleResume} onAbandonRun={handleAbandonRun} onQuitToMenu={onQuitToMenu} />
      )}
      {engineState?.phase === 'dead' && events.deathStats && (
        <DeathScreen stats={events.deathStats} onReturnToHub={onReturnToMenu} onTryAgain={onReturnToMenu} />
      )}
      {engineState?.phase === 'victory' && events.victoryStats && (
        <VictoryScreen
          stats={events.victoryStats}
          onContinueVoyage={onContinueVoyage ?? onReturnToMenu}
          onReturnToHub={onReturnToMenu}
        />
      )}
    </div>
  );
}
