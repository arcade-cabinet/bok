import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { DeathScreen, type DeathStats } from './DeathScreen';

function makeStats(overrides?: Partial<DeathStats>): DeathStats {
  return {
    enemiesDefeated: 5,
    timeSurvived: 120,
    biome: 'forest',
    lootCollected: 3,
    ...overrides,
  };
}

test('renders THE CHAPTER ENDS heading', async () => {
  await render(<DeathScreen stats={makeStats()} onReturnToHub={() => {}} onTryAgain={() => {}} />);

  await expect.element(page.getByRole('heading', { name: 'THE CHAPTER ENDS' })).toBeVisible();
});

test('shows run statistics', async () => {
  await render(<DeathScreen stats={makeStats()} onReturnToHub={() => {}} onTryAgain={() => {}} />);

  await expect.element(page.getByText('Enemies Defeated')).toBeInTheDocument();
  await expect.element(page.getByText('5')).toBeInTheDocument();
  await expect.element(page.getByText('2:00')).toBeInTheDocument(); // 120s = 2:00
  await expect.element(page.getByText('forest')).toBeInTheDocument();
  await expect.element(page.getByText('3')).toBeInTheDocument();
});

test('TRY AGAIN button calls onTryAgain', async () => {
  const onTryAgain = vi.fn();
  await render(<DeathScreen stats={makeStats()} onReturnToHub={() => {}} onTryAgain={onTryAgain} />);

  await page.getByRole('button', { name: /Try again/i }).click();

  expect(onTryAgain).toHaveBeenCalledOnce();
});

test('RETURN TO HUB button calls onReturnToHub', async () => {
  const onReturnToHub = vi.fn();
  await render(<DeathScreen stats={makeStats()} onReturnToHub={onReturnToHub} onTryAgain={() => {}} />);

  await page.getByRole('button', { name: /Return to hub/i }).click();

  expect(onReturnToHub).toHaveBeenCalledOnce();
});

test('displays a death message quote', async () => {
  const { container } = await render(
    <DeathScreen stats={makeStats()} onReturnToHub={() => {}} onTryAgain={() => {}} />,
  );

  // The death message is in an italic paragraph
  const italic = container.querySelector('p.italic');
  expect(italic).not.toBeNull();
  expect((italic as HTMLElement).textContent?.length).toBeGreaterThan(10);
});
