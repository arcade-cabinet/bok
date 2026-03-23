import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import type { GameSave } from '../../persistence/GameSave';
import { MainMenuView } from './MainMenuView';

const noop = () => {};

function makeSave(overrides: Partial<GameSave> = {}): GameSave {
  return {
    id: 1,
    seed: 'Brave Dark Fox',
    mode: 'survival',
    createdAt: Date.now() - 60_000,
    lastPlayedAt: Date.now(),
    ...overrides,
  };
}

test('renders title and menu buttons', async () => {
  const screen = await render(<MainMenuView onStartGame={noop} onContinueGame={noop} onDeleteGame={noop} saves={[]} />);

  await expect.element(screen.getByRole('heading', { name: 'BOK' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: /New Game/ })).toBeVisible();
});

test('Continue button appears when saves exist', async () => {
  const screen = await render(
    <MainMenuView onStartGame={noop} onContinueGame={noop} onDeleteGame={noop} saves={[makeSave()]} />,
  );

  await expect.element(screen.getByRole('button', { name: /Continue/ })).toBeVisible();
});

test('Continue button is hidden when no saves exist', async () => {
  const screen = await render(<MainMenuView onStartGame={noop} onContinueGame={noop} onDeleteGame={noop} saves={[]} />);

  expect(screen.getByRole('button', { name: /Continue/ }).elements()).toHaveLength(0);
});

test('clicking New Game shows seed and mode prompt without biome selection', async () => {
  const screen = await render(<MainMenuView onStartGame={noop} onContinueGame={noop} onDeleteGame={noop} saves={[]} />);

  await screen.getByRole('button', { name: /New Game/ }).click();
  await expect.element(screen.getByRole('heading', { name: 'Begin a New Tale' })).toBeVisible();

  // Should have seed input and mode buttons
  await expect.element(screen.getByPlaceholder('Let fate decide...')).toBeVisible();
  await expect.element(screen.getByRole('button', { name: /Survival/ })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: /Creative/ })).toBeVisible();

  // Should NOT have any biome selection
  expect(screen.getByText('Choose Your Chapter').elements()).toHaveLength(0);
});

test('seed input has default value Brave Dark Fox', async () => {
  const screen = await render(<MainMenuView onStartGame={noop} onContinueGame={noop} onDeleteGame={noop} saves={[]} />);

  await screen.getByRole('button', { name: /New Game/ }).click();
  const seedInput = screen.getByPlaceholder('Let fate decide...');
  await expect.element(seedInput).toHaveValue('Brave Dark Fox');
});

test('Begin calls onStartGame with seed and mode', async () => {
  let calledSeed = '';
  let calledMode = '';
  const screen = await render(
    <MainMenuView
      onStartGame={(seed, mode) => {
        calledSeed = seed;
        calledMode = mode;
      }}
      onContinueGame={noop}
      onDeleteGame={noop}
      saves={[]}
    />,
  );

  await screen.getByRole('button', { name: /New Game/ }).click();
  await screen.getByRole('button', { name: /Begin/ }).click();

  expect(calledSeed).toBe('Brave Dark Fox');
  expect(calledMode).toBe('survival');
});

test('Continue with single save calls onContinueGame directly', async () => {
  const save = makeSave();
  let continued: GameSave | null = null;
  const screen = await render(
    <MainMenuView
      onStartGame={noop}
      onContinueGame={(s) => {
        continued = s;
      }}
      onDeleteGame={noop}
      saves={[save]}
    />,
  );

  await screen.getByRole('button', { name: /Continue/ }).click();
  expect((continued as GameSave | null)?.id).toBe(save.id);
});

test('Continue with multiple saves shows save list', async () => {
  const saves = [makeSave({ id: 1, seed: 'Alpha' }), makeSave({ id: 2, seed: 'Beta' })];
  const screen = await render(
    <MainMenuView onStartGame={noop} onContinueGame={noop} onDeleteGame={noop} saves={saves} />,
  );

  await screen.getByRole('button', { name: /Continue/ }).click();
  await expect.element(screen.getByRole('heading', { name: 'Your Tales' })).toBeVisible();
  await expect.element(screen.getByText('Alpha')).toBeVisible();
  await expect.element(screen.getByText('Beta')).toBeVisible();
});
