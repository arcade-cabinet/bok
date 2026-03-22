import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { VictoryScreen, type VictoryStats } from './VictoryScreen';

function makeStats(overrides?: Partial<VictoryStats>): VictoryStats {
  return {
    biome: 'volcanic',
    enemiesDefeated: 12,
    timeSurvived: 300,
    lootCollected: 7,
    ...overrides,
  };
}

test('renders A NEW PAGE IS WRITTEN heading', async () => {
  await render(<VictoryScreen stats={makeStats()} onContinueVoyage={() => {}} onReturnToHub={() => {}} />);

  await expect.element(page.getByRole('heading', { name: 'A NEW PAGE IS WRITTEN' })).toBeVisible();
});

test('shows run statistics', async () => {
  await render(<VictoryScreen stats={makeStats()} onContinueVoyage={() => {}} onReturnToHub={() => {}} />);

  await expect.element(page.getByText('volcanic')).toBeInTheDocument();
  await expect.element(page.getByText('12')).toBeInTheDocument();
  await expect.element(page.getByText('5:00')).toBeInTheDocument(); // 300s = 5:00
  await expect.element(page.getByText('7')).toBeInTheDocument();
});

test('CONTINUE VOYAGE button calls onContinueVoyage', async () => {
  const onContinueVoyage = vi.fn();
  await render(<VictoryScreen stats={makeStats()} onContinueVoyage={onContinueVoyage} onReturnToHub={() => {}} />);

  await page.getByRole('button', { name: 'CONTINUE VOYAGE' }).click();

  expect(onContinueVoyage).toHaveBeenCalledOnce();
});

test('RETURN TO HUB button calls onReturnToHub', async () => {
  const onReturnToHub = vi.fn();
  await render(<VictoryScreen stats={makeStats()} onContinueVoyage={() => {}} onReturnToHub={onReturnToHub} />);

  await page.getByRole('button', { name: 'RETURN TO HUB' }).click();

  expect(onReturnToHub).toHaveBeenCalledOnce();
});

test('shows tome page unlock when ability is provided', async () => {
  const stats = makeStats({
    tomePageUnlocked: 'volcanic-fury',
    abilityName: 'Volcanic Fury',
    abilityDescription: 'Unleash a wave of molten fire.',
  });
  await render(<VictoryScreen stats={stats} onContinueVoyage={() => {}} onReturnToHub={() => {}} />);

  await expect.element(page.getByText('TOME PAGE UNLOCKED')).toBeInTheDocument();
  await expect.element(page.getByText('VOLCANIC FURY')).toBeInTheDocument();
});
