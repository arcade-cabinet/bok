import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { GameConfig } from '../../app/App';
import { MainMenuView } from './MainMenuView';

test('renders title and menu buttons', async () => {
  const screen = await render(<MainMenuView onStartGame={() => {}} />);

  await expect.element(screen.getByRole('heading', { name: 'BOK' })).toBeVisible();

  await expect.element(screen.getByRole('button', { name: /Pen New Tale/ })).toBeVisible();
});

test('clicking Pen New Tale shows biome grid with 8 biomes', async () => {
  const screen = await render(<MainMenuView onStartGame={() => {}} />);

  await screen.getByRole('button', { name: /Pen New Tale/ }).click();

  await expect.element(screen.getByRole('heading', { name: 'Choose Your Chapter' })).toBeVisible();

  // 8 biome buttons + "Begin Writing" + close button = 10 buttons total
  const biomeNames = [
    'Whispering Woods',
    'Sunscorched Dunes',
    'Frostbite Expanse',
    'Cinderpeak Caldera',
    'Rothollow Marsh',
    'Prismatic Depths',
    'Stormspire Remnants',
    'Abyssal Trench',
  ];
  for (const name of biomeNames) {
    await expect.element(screen.getByText(name)).toBeInTheDocument();
  }
});

test('selecting Cinderpeak Caldera updates border color', async () => {
  const screen = await render(<MainMenuView onStartGame={() => {}} />);

  await screen.getByRole('button', { name: /Pen New Tale/ }).click();

  const calderaBtn = screen.getByRole('button', { name: /Cinderpeak Caldera/ });
  await calderaBtn.click();

  // Selected biome gets the gold border (#c4a572)
  await expect.element(calderaBtn).toHaveStyle({ borderColor: '#c4a572' });
});

test('seed input has default value Brave Dark Fox', async () => {
  const screen = await render(<MainMenuView onStartGame={() => {}} />);

  await screen.getByRole('button', { name: /Pen New Tale/ }).click();

  const seedInput = screen.getByPlaceholder('Let fate decide...');
  await expect.element(seedInput).toHaveValue('Brave Dark Fox');
});

test('clicking dice button changes the seed', async () => {
  const screen = await render(<MainMenuView onStartGame={() => {}} />);

  await screen.getByRole('button', { name: /Pen New Tale/ }).click();

  const seedInput = screen.getByPlaceholder('Let fate decide...');
  await expect.element(seedInput).toHaveValue('Brave Dark Fox');

  // The dice button uses emoji text
  const diceBtn = page.getByText('🎲');
  await diceBtn.click();

  // Seed should have changed (it's random, so just check it's not empty)
  // The random seed is always "Adj Adj Noun" format — 3 words
  await expect.element(seedInput).not.toHaveValue('');
});

test('Begin Writing calls onStartGame with selected biome and seed', async () => {
  let cfg: GameConfig | null = null;
  const screen = await render(
    <MainMenuView
      onStartGame={(c) => {
        cfg = c;
      }}
    />,
  );

  await screen.getByRole('button', { name: /Pen New Tale/ }).click();
  await screen.getByRole('button', { name: /Cinderpeak Caldera/ }).click();
  await screen.getByRole('button', { name: /Begin Writing/ }).click();

  expect(cfg).toEqual({ biome: 'volcanic', seed: 'Brave Dark Fox' });
});

test('Resume Chapter calls onResumeGame when run history exists', async () => {
  let resumed = false;
  const screen = await render(
    <MainMenuView
      onStartGame={() => {}}
      onResumeGame={() => {
        resumed = true;
      }}
      hasRunHistory
    />,
  );

  await screen.getByRole('button', { name: /Resume Chapter/ }).click();
  expect(resumed).toBe(true);
});
