import { useState } from 'react';
import { MainMenuView } from '../views/menu/MainMenuView';
import { GameView } from '../views/game/GameView';
import { HubView } from '../views/hub/HubView';
import { useProgression } from '../hooks/useProgression';

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

  const handleHubNavigate = (target: 'menu' | 'game') => {
    setView(target);
  };

  return (
    <>
      {view === 'menu' && <MainMenuView onStartGame={handleStartGame} hasRunHistory={progression.runHistory.length > 0} />}
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
