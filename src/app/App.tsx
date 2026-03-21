import { useState } from 'react';
import { MainMenuView } from '../views/menu/MainMenuView';
import { GameView } from '../views/game/GameView';

export type AppView = 'menu' | 'game' | 'hub';

export interface GameConfig {
  biome: string;
  seed: string;
}

export function App() {
  const [view, setView] = useState<AppView>('menu');
  const [gameConfig, setGameConfig] = useState<GameConfig>({ biome: 'forest', seed: 'Brave Dark Fox' });

  const handleStartGame = (config: GameConfig) => {
    setGameConfig(config);
    setView('game');
  };

  return (
    <>
      {view === 'menu' && <MainMenuView onStartGame={handleStartGame} />}
      {view === 'game' && (
        <GameView
          config={gameConfig}
          onReturnToMenu={() => setView('menu')}
        />
      )}
    </>
  );
}
