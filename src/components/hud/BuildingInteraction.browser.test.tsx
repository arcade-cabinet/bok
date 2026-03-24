import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { NearbyBuilding } from '../../hooks/useHubBuildings';
import { BuildingInteraction } from './BuildingInteraction';

const noop = () => {};

function makeNearby(overrides: Partial<NearbyBuilding> = {}): NearbyBuilding {
  return {
    building: {
      id: 'forge',
      name: 'Forge',
      description: 'Smelt ores into weapons.',
      maxLevel: 3,
      levels: [
        { level: 1, effect: '+10% damage', cost: { stone: 5 } },
        { level: 2, effect: '+20% damage', cost: { stone: 10, iron: 3 } },
        { level: 3, effect: '+30% damage', cost: { stone: 20, iron: 10 } },
      ],
      position: { x: 0, y: 0, z: 0 },
    },
    currentLevel: 1,
    currentEffect: '+10% damage',
    nextLevel: { level: 2, effect: '+20% damage', cost: { stone: 10, iron: 3 } },
    isMaxLevel: false,
    canAfford: true,
    ...overrides,
  };
}

test('shows building name and description', async () => {
  const nearby = makeNearby();

  await render(<BuildingInteraction nearby={nearby} resources={{ stone: 20, iron: 5 }} onUpgrade={noop} />);

  await expect.element(page.getByText('Forge')).toBeInTheDocument();
  await expect.element(page.getByText('Smelt ores into weapons.')).toBeInTheDocument();
});

test('renders level badge', async () => {
  const nearby = makeNearby();

  await render(<BuildingInteraction nearby={nearby} resources={{ stone: 20, iron: 5 }} onUpgrade={noop} />);

  await expect.element(page.getByText('Lv 1/3')).toBeInTheDocument();
});

test('renders upgrade button when can afford', async () => {
  const nearby = makeNearby({ canAfford: true });

  await render(<BuildingInteraction nearby={nearby} resources={{ stone: 20, iron: 5 }} onUpgrade={noop} />);

  const btn = page.getByRole('button', { name: /Upgrade Forge/ });
  await expect.element(btn).toBeInTheDocument();
  await expect.element(btn).not.toBeDisabled();
});

test('disables upgrade button when cannot afford', async () => {
  const nearby = makeNearby({ canAfford: false });

  await render(<BuildingInteraction nearby={nearby} resources={{ stone: 1 }} onUpgrade={noop} />);

  const btn = page.getByRole('button', { name: /Cannot upgrade Forge/ });
  await expect.element(btn).toBeInTheDocument();
  await expect.element(btn).toBeDisabled();
});

test('shows MAX LEVEL badge when at max level', async () => {
  const nearby = makeNearby({ isMaxLevel: true, nextLevel: null, currentLevel: 3 });

  await render(<BuildingInteraction nearby={nearby} resources={{}} onUpgrade={noop} />);

  await expect.element(page.getByText('MAX LEVEL')).toBeInTheDocument();
});
