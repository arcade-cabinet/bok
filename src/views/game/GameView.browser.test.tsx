import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { EngineState } from '../../engine/types';

const playingState: EngineState = {
  playerHealth: 80,
  maxHealth: 100,
  enemyCount: 5,
  biomeName: 'Whispering Woods',
  bossNearby: false,
  bossHealthPct: 0,
  bossPhase: 0,
  paused: false,
  phase: 'playing',
  context: 'explore',
  suggestedTargetPos: null,
  threatLevel: 'none',
  canDodge: true,
  stamina: 100,
  maxStamina: 100,
  comboStep: 0,
  isBlocking: false,
  playerX: 50,
  playerZ: 50,
  minimapMarkers: [
    { x: 55, z: 48, type: 'enemy' },
    { x: 42, z: 60, type: 'chest' },
  ],
  selectedBlockName: 'Grass',
  selectedShapeName: 'Cube',
  selectedBlockLabel: 'Grass',
  lookingAtBlock: false,
  placementPreview: null,
  breakingProgress: 0,
  bossPosition: null,
  bossDefeated: false,
  playerYaw: 0,
  enemyPositions: [],
  bossName: 'Ancient Treant',
  targetBlockPosition: null,
  equippedWeaponId: 'wooden-sword',
  equippedToolTier: 'hand',
};

vi.mock('../../engine/GameEngine', () => ({
  initGame: vi.fn(() =>
    Promise.resolve({
      getState: () => playingState,
      onEvent: vi.fn(),
      triggerAttack: vi.fn(),
      togglePause: vi.fn(),
      destroy: vi.fn(),
    }),
  ),
}));

test('renders canvas and HUD elements', async () => {
  const { GameView } = await import('./GameView');

  const { container } = await render(
    <GameView
      config={{ saveId: 1, biome: 'forest', seed: 'test', mode: 'survival' }}
      onReturnToMenu={() => {}}
      onQuitToMenu={() => {}}
    />,
  );

  // Canvas should mount with id="game-canvas"
  const canvas = container.querySelector('#game-canvas');
  expect(canvas).not.toBeNull();
  expect(canvas?.tagName).toBe('CANVAS');

  // Wait for engine state polling (100ms interval) to populate HUD
  await expect.element(page.getByText('Health')).toBeVisible();

  // Minimap canvas should be present (140x140)
  const minimapCanvas = container.querySelector('canvas:not(#game-canvas)');
  expect(minimapCanvas).not.toBeNull();
  expect(minimapCanvas?.getAttribute('width')).toBe('140');
});
