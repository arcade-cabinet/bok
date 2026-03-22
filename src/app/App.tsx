import { lazy, Suspense, useCallback, useState } from 'react';
import { SailingTransition } from '../components/transitions/SailingTransition';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import type { BuildingEffects } from '../hooks/useBuildingEffects';
import { useProgression } from '../hooks/useProgression';
import { IslandSelectView } from '../views/island-select/IslandSelectView';
import { MainMenuView } from '../views/menu/MainMenuView';

const GameView = lazy(() => import('../views/game/GameView').then((m) => ({ default: m.GameView })));
const HubView = lazy(() => import('../views/hub/HubView').then((m) => ({ default: m.HubView })));

export type AppView = 'menu' | 'game' | 'hub' | 'sailing' | 'island-select';

export interface GameConfig {
  biome: string;
  seed: string;
}

export function App() {
  const [view, setView] = useState<AppView>('menu');
  const [gameConfig, setGameConfig] = useState<GameConfig>({ biome: 'forest', seed: 'Brave Dark Fox' });
  const [buildingEffects, setBuildingEffects] = useState<BuildingEffects>({
    startingWeapon: null,
    maxIslandChoices: 1,
    tomePowerMultiplier: 1.0,
    shopTier: 0,
    maxCraftingTier: 0,
  });
  const progression = useProgression();

  const handleStartGame = (config: GameConfig) => {
    setGameConfig(config);
    setView('hub');
  };

  const handleResumeGame = () => {
    const last = progression.runHistory[0];
    if (!last) return;
    const biome = last.biomes[0] ?? 'forest';
    setGameConfig({ biome, seed: last.seed });
    setView('hub');
  };

  const handleHubNavigate = (target: 'menu' | 'game') => {
    if (target === 'game') {
      setView('island-select');
    } else {
      setView(target);
    }
  };

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
            onResumeGame={handleResumeGame}
            hasRunHistory={progression.runHistory.length > 0}
            unlockedBiomes={progression.runHistory.filter((r) => r.result === 'victory').flatMap((r) => r.biomes)}
          />
        )}
        {view === 'hub' && (
          <Suspense fallback={<LoadingScreen />}>
            <HubView onNavigate={handleHubNavigate} onBuildingEffectsChange={handleBuildingEffectsChange} />
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
