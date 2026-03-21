import { useState } from 'react';
import { useProgression } from '../hooks/useProgression';
import { GameView } from '../views/game/GameView';
import { HubView } from '../views/hub/HubView';
import { MainMenuView } from '../views/menu/MainMenuView';

export type AppView = 'menu' | 'game' | 'hub';

export interface GameConfig {
  biome: string;
  seed: string;
}

export function App() {
  const [view, setView] = useState<AppView>('menu');
  const [gameConfig, setGameConfig] = useState<GameConfig>({ biome: 'forest', seed: 'Brave Dark Fox' });
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
    setView(target);
  };

  return (
    <>
      {view === 'menu' && (
        <MainMenuView
          onStartGame={handleStartGame}
          onResumeGame={handleResumeGame}
          hasRunHistory={progression.runHistory.length > 0}
        />
      )}
      {view === 'hub' && <HubView onNavigate={handleHubNavigate} />}
      {view === 'game' && (
        <GameView
          config={gameConfig}
          onReturnToMenu={() => setView('hub')}
          onBossDefeated={progression.trackBossKill}
          onRunEnd={progression.recordRun}
        />
      )}
    </>
  );
}
