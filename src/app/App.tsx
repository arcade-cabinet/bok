import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { SailingTransition } from '../components/transitions/SailingTransition';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import type { BuildingEffects } from '../hooks/useBuildingEffects';
import { useProgression } from '../hooks/useProgression';
import type { GameSave } from '../persistence/GameSave';
import { SaveManager } from '../persistence/SaveManager';
import { IslandSelectView } from '../views/island-select/IslandSelectView';
import { MainMenuView } from '../views/menu/MainMenuView';

const GameView = lazy(() => import('../views/game/GameView').then((m) => ({ default: m.GameView })));
const HubView = lazy(() => import('../views/hub/HubView').then((m) => ({ default: m.HubView })));

export type AppView = 'menu' | 'game' | 'hub' | 'sailing' | 'island-select';

export type GameMode = 'creative' | 'survival';

export interface GameConfig {
  /** Save ID — links to the persistent game save */
  saveId: number;
  /** Current island biome (set when sailing to an island, used by engine) */
  biome: string;
  seed: string;
  mode: GameMode;
}

export function App() {
  const [view, setView] = useState<AppView>('menu');
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    saveId: 0,
    biome: 'forest',
    seed: 'Brave Dark Fox',
    mode: 'survival',
  });
  const [buildingEffects, setBuildingEffects] = useState<BuildingEffects>({
    startingWeapon: null,
    maxIslandChoices: 1,
    tomePowerMultiplier: 1.0,
    shopTier: 0,
    maxCraftingTier: 0,
  });
  const [saves, setSaves] = useState<GameSave[]>([]);
  const progression = useProgression();
  const saveManagerRef = useRef<SaveManager | null>(null);

  // Initialize SaveManager and load existing saves
  useEffect(() => {
    let cancelled = false;
    SaveManager.createInMemory().then(async (mgr) => {
      if (cancelled) return;
      saveManagerRef.current = mgr;
      const games = await mgr.listGames();
      if (!cancelled) setSaves(games);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStartGame = async (seed: string, mode: GameMode) => {
    const mgr = saveManagerRef.current;
    if (!mgr) return;
    const save = await mgr.createGame(seed, mode);
    setSaves(await mgr.listGames());
    setGameConfig({ saveId: save.id, biome: 'forest', seed: save.seed, mode: save.mode });
    setView('hub');
  };

  const handleContinueGame = async (save: GameSave) => {
    const mgr = saveManagerRef.current;
    if (mgr) await mgr.touchGame(save.id);
    setGameConfig({ saveId: save.id, biome: 'forest', seed: save.seed, mode: save.mode });
    setView('hub');
  };

  const handleDeleteGame = async (id: number) => {
    const mgr = saveManagerRef.current;
    if (!mgr) return;
    await mgr.deleteGame(id);
    setSaves(await mgr.listGames());
  };

  const handleHubNavigate = (target: 'menu' | 'game') => {
    if (target === 'game') {
      setView('island-select');
    } else {
      setView(target);
    }
  };

  /** Called when the player sets sail from a specific dock on the hub island. */
  const handleSetSail = useCallback((biomeId: string) => {
    setGameConfig((prev) => ({ ...prev, biome: biomeId }));
    setView('sailing');
  }, []);

  const handleSelectBiome = (biomeId: string) => {
    setGameConfig((prev) => ({ ...prev, biome: biomeId }));
    setView('sailing');
  };

  const handleBuildingEffectsChange = useCallback((effects: BuildingEffects) => {
    setBuildingEffects(effects);
  }, []);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[#2c1e16] focus:text-[#fdf6e3] focus:rounded"
      >
        Skip to content
      </a>
      <main id="main-content">
        {view === 'menu' && (
          <MainMenuView
            onStartGame={handleStartGame}
            onContinueGame={handleContinueGame}
            onDeleteGame={handleDeleteGame}
            saves={saves}
            unlockedPages={progression.unlockedPages}
          />
        )}
        {view === 'hub' && (
          <Suspense fallback={<LoadingScreen />}>
            <HubView
              onNavigate={handleHubNavigate}
              onSetSail={handleSetSail}
              onBuildingEffectsChange={handleBuildingEffectsChange}
              unlockedBiomes={
                new Set(progression.runHistory.filter((r) => r.result === 'victory').flatMap((r) => r.biomes))
              }
              gameMode={gameConfig.mode}
            />
          </Suspense>
        )}
        {view === 'island-select' && (
          <IslandSelectView
            onSelectBiome={handleSelectBiome}
            onCancel={() => setView('hub')}
            maxChoices={buildingEffects.maxIslandChoices}
            unlockedBiomes={progression.runHistory.filter((r) => r.result === 'victory').flatMap((r) => r.biomes)}
          />
        )}
        {view === 'sailing' && <SailingTransition biomeName={gameConfig.biome} onComplete={() => setView('game')} />}
        {view === 'game' && (
          <Suspense fallback={<LoadingScreen />}>
            <GameView
              config={gameConfig}
              onReturnToMenu={() => setView('hub')}
              onContinueVoyage={() => setView('island-select')}
              onQuitToMenu={() => setView('menu')}
              onBossDefeated={progression.trackBossKill}
              onRunEnd={progression.recordRun}
            />
          </Suspense>
        )}
      </main>
    </>
  );
}
