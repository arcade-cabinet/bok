import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameConfig } from '../../app/App';
import { ContextIndicator } from '../../components/hud/ContextIndicator';
import { DamageIndicator } from '../../components/hud/DamageIndicator';
import { DamageNumbers } from '../../components/hud/DamageNumbers';
import { GoalTracker } from '../../components/hud/GoalTracker';
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
import crystalCavesGoals from '../../content/goals/crystal-caves.json';
import deepOceanGoals from '../../content/goals/deep-ocean.json';
import desertGoals from '../../content/goals/desert.json';
import forestGoals from '../../content/goals/forest.json';
import skyRuinsGoals from '../../content/goals/sky-ruins.json';
import swampGoals from '../../content/goals/swamp.json';
import tundraGoals from '../../content/goals/tundra.json';
import volcanicGoals from '../../content/goals/volcanic.json';
import { TOME_PAGE_CATALOG } from '../../content/tomePages';
import { type BiomeGoals, createGoalSystem } from '../../engine/goalSystem';
import type { EngineEvent } from '../../engine/types';

/** Map biome IDs (both menu short names and content full names) to goal definitions */
const GOAL_FILES: Record<string, BiomeGoals> = {
  forest: forestGoals as BiomeGoals,
  desert: desertGoals as BiomeGoals,
  tundra: tundraGoals as BiomeGoals,
  volcanic: volcanicGoals as BiomeGoals,
  swamp: swampGoals as BiomeGoals,
  crystal: crystalCavesGoals as BiomeGoals,
  'crystal-caves': crystalCavesGoals as BiomeGoals,
  sky: skyRuinsGoals as BiomeGoals,
  'sky-ruins': skyRuinsGoals as BiomeGoals,
  ocean: deepOceanGoals as BiomeGoals,
  'deep-ocean': deepOceanGoals as BiomeGoals,
};

import { useDeviceType } from '../../hooks/useDeviceType';
import { useGameEvents } from '../../hooks/useGameEvents';
import { useGameHUD } from '../../hooks/useGameHUD';
import { useGameLifecycle } from '../../hooks/useGameLifecycle';
import type { SerializedGameState } from '../../persistence/GameStateSerializer';
import type { SaveManager } from '../../persistence/SaveManager';

interface Props {
  config: GameConfig;
  savedState?: SerializedGameState | null;
  saveManager?: SaveManager | null;
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

/** Build hotbar slots: slot 0 = weapon, slots 1-4 = block label from engine */
function buildHotbarSlots(selectedBlockLabel: string): SlotData[] {
  return [{ label: 'Sword' }, { label: selectedBlockLabel || 'Block' }, { label: '' }, { label: '' }, { label: '' }];
}

/**
 * GameView — mounts the JollyPixel canvas, initializes the engine,
 * and renders React HUD overlays on top.
 */
export function GameView({
  config,
  saveManager,
  onReturnToMenu,
  onContinueVoyage,
  onQuitToMenu,
  onBossDefeated,
  onRunEnd,
}: Props) {
  const { isMobile, isTouch, screenWidth, screenHeight } = useDeviceType();
  const [activeSlot, setActiveSlot] = useState(0);
  const [showTutorial, setShowTutorial] = useState(() => config.mode !== 'creative' && !isTutorialCompleted());
  const [tomeUnlock, setTomeUnlock] = useState<{ name: string; icon: string } | null>(null);
  const [newlyUnlockedTomeId, setNewlyUnlockedTomeId] = useState<string | null>(null);

  // --- Island persistence: load saved deltas + goal progress ---
  const [restoredDeltas, setRestoredDeltas] = useState<
    Array<{ x: number; y: number; z: number; blockId: number }> | undefined
  >(undefined);
  const [restoredGoalIds, setRestoredGoalIds] = useState<string[] | undefined>(undefined);
  const [persistenceReady, setPersistenceReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadIslandPersistence() {
      if (!saveManager || !config.saveId) {
        // No persistence — proceed immediately
        if (!cancelled) setPersistenceReady(true);
        return;
      }
      try {
        const [deltas, islandState] = await Promise.all([
          saveManager.loadChunkDeltas(config.saveId, config.biome),
          saveManager.getIslandState(config.saveId, config.biome),
        ]);
        if (!cancelled) {
          setRestoredDeltas(deltas.length > 0 ? deltas : undefined);
          setRestoredGoalIds(islandState?.goalsCompleted ?? undefined);
          setPersistenceReady(true);
        }
      } catch (err) {
        console.warn('[Bok] Failed to load island persistence:', err);
        if (!cancelled) setPersistenceReady(true);
      }
    }
    loadIslandPersistence();
    return () => {
      cancelled = true;
    };
  }, [saveManager, config.saveId, config.biome]);

  // Goal system — loaded from biome content, null in Creative mode
  // Restored goal IDs are passed to pre-fill completed goals
  const goalSystem = useMemo(() => {
    if (config.mode === 'creative') return createGoalSystem(null);
    return createGoalSystem(GOAL_FILES[config.biome] ?? null, restoredGoalIds);
  }, [config.biome, config.mode, restoredGoalIds]);
  const [goalState, setGoalState] = useState(goalSystem.state);

  // Sync goal state when the goal system is recreated (e.g. after persistence data loads)
  useEffect(() => {
    setGoalState({ ...goalSystem.state });
  }, [goalSystem]);

  // Screen reader event subscriber
  const srEventHandlerRef = useRef<((event: EngineEvent) => void) | null>(null);
  const handleSrSubscribe = useCallback((handler: (event: EngineEvent) => void) => {
    srEventHandlerRef.current = handler;
  }, []);

  // Build engine config with restored persistence data
  const engineConfig = useMemo(
    () => ({
      ...config,
      restoredDeltas,
      restoredGoalIds,
      persistenceReady,
    }),
    [config, restoredDeltas, restoredGoalIds, persistenceReady],
  );

  // Lifecycle: canvas, engine init/cleanup, keyboard, resize
  const { canvasRef, gameRef, showTome, setShowTome, handleResume, handleTouchOutput } = useGameLifecycle(
    engineConfig,
    (event) => {
      events.handleEngineEvent(event);
      srEventHandlerRef.current?.(event);

      // Advance goal progress
      if (event.type === 'enemyKilled') {
        goalSystem.onEnemyKilled();
        setGoalState({ ...goalSystem.state });
      }
      if (event.type === 'chestOpened') {
        goalSystem.onChestOpened();
        setGoalState({ ...goalSystem.state });
      }

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

  // --- Island persistence: save block deltas + goal progress on exit ---
  const saveIslandState = useCallback(async () => {
    if (!saveManager || !config.saveId) return;
    const game = gameRef.current;
    try {
      // Save block deltas
      if (game) {
        const deltas = game.getBlockDeltas();
        if (deltas.length > 0) {
          await saveManager.saveChunkDeltas(config.saveId, config.biome, [...deltas]);
          game.flushBlockDeltas();
        }
      }
      // Save goal progress + boss status
      const completedGoals = goalSystem.getCompletedGoalIds();
      const bossDefeated = goalSystem.state.bossUnlocked && goalSystem.state.allCompleted;
      await saveManager.updateIslandState({
        saveId: config.saveId,
        biomeId: config.biome,
        goalsCompleted: completedGoals,
        bossDefeated,
      });
    } catch (err) {
      console.warn('[Bok] Failed to save island state:', err);
    }
  }, [saveManager, config.saveId, config.biome, goalSystem, gameRef]);

  // Wrapped exit callbacks that save island state before navigating away
  const handleReturnToMenu = useCallback(async () => {
    await saveIslandState();
    onReturnToMenu();
  }, [onReturnToMenu, saveIslandState]);

  const handleContinueVoyage = useCallback(async () => {
    await saveIslandState();
    (onContinueVoyage ?? onReturnToMenu)();
  }, [onContinueVoyage, onReturnToMenu, saveIslandState]);

  const handleQuitToMenu = useCallback(async () => {
    await saveIslandState();
    onQuitToMenu();
  }, [onQuitToMenu, saveIslandState]);

  const handleAbandonRun = useCallback(async () => {
    await saveIslandState();
    const duration = Math.round((Date.now() - events.startTimeRef.current) / 1000);
    onRunEnd?.(config.seed, config.biome, 'abandoned', duration);
    onReturnToMenu();
  }, [config, onRunEnd, onReturnToMenu, events.startTimeRef, saveIslandState]);

  const handleAttack = useCallback(() => {
    gameRef.current?.setMobileInput({ moveX: 0, moveZ: 0, lookX: 0, lookY: 0, action: 'attack' });
  }, [gameRef]);

  const handleDodge = useCallback(() => {
    gameRef.current?.setMobileInput({ moveX: 0, moveZ: 0, lookX: 0, lookY: 0, action: 'dodge' });
  }, [gameRef]);

  const handleBlock = useCallback(() => {
    gameRef.current?.setMobileInput({ moveX: 0, moveZ: 0, lookX: 0, lookY: 0, action: 'defend' });
  }, [gameRef]);

  const handleBlockRelease = useCallback(() => {
    // Clear the defend action so block deactivates
    gameRef.current?.setMobileInput({ moveX: 0, moveZ: 0, lookX: 0, lookY: 0, action: null });
  }, [gameRef]);

  const handleInteract = useCallback(() => {
    gameRef.current?.setMobileInput({ moveX: 0, moveZ: 0, lookX: 0, lookY: 0, action: 'interact' });
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
        <ActionButtons
          onAttack={handleAttack}
          onDodge={handleDodge}
          onBlock={handleBlock}
          onBlockRelease={handleBlockRelease}
          onInteract={handleInteract}
        />
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
          {config.mode === 'creative' && (
            <div
              className="fixed top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-md text-xs font-bold tracking-widest uppercase z-20"
              style={{
                fontFamily: 'Cinzel, Georgia, serif',
                color: '#fdf6e3',
                background: 'rgba(39,100,57,0.8)',
                border: '1px solid rgba(74,156,96,0.6)',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              Creative
            </div>
          )}
          <GoalTracker
            goals={goalState.goals}
            bossUnlocked={goalState.bossUnlocked}
            completionMessage={goalState.completionMessage}
          />
          <Minimap playerX={engineState.playerX} playerZ={engineState.playerZ} markers={engineState.minimapMarkers} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_4px_rgba(0,0,0,0.5)]" />
          {engineState.breakingProgress > 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 mt-3 w-16 h-1 bg-black/50 rounded overflow-hidden">
              <div
                className="h-full bg-white rounded transition-[width] duration-75"
                style={{ width: `${engineState.breakingProgress * 100}%` }}
              />
            </div>
          )}
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
          <Hotbar
            slots={buildHotbarSlots(engineState.selectedBlockLabel ?? engineState.selectedBlockName ?? '')}
            activeIndex={activeSlot}
            onSelect={(idx) => {
              setActiveSlot(idx);
              // When switching away from slot 0 (weapon), cycle blocks for visual feedback
              if (idx > 0 && gameRef.current) {
                // Slot index maps to block cycling: each slot beyond 0 advances
              }
            }}
          />
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
        <PauseMenu onResume={handleResume} onAbandonRun={handleAbandonRun} onQuitToMenu={handleQuitToMenu} />
      )}
      {engineState?.phase === 'dead' && events.deathStats && (
        <DeathScreen stats={events.deathStats} onReturnToHub={handleReturnToMenu} onTryAgain={handleReturnToMenu} />
      )}
      {engineState?.phase === 'victory' && events.victoryStats && (
        <VictoryScreen
          stats={events.victoryStats}
          onContinueVoyage={handleContinueVoyage}
          onReturnToHub={handleReturnToMenu}
        />
      )}
    </div>
  );
}
