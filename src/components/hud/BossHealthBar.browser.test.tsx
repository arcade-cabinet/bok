import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { BossHealthBar } from './BossHealthBar';

test('renders boss name and health bar', async () => {
  const { container } = await render(
    <BossHealthBar bossName="Ancient Treant" healthPct={0.75} phase={1} visible={true} />,
  );

  await expect.element(page.getByText('Ancient Treant')).toBeInTheDocument();

  // Health bar fill should exist with correct width
  const bar = container.querySelector('[style*="width"]');
  expect(bar).not.toBeNull();
  expect(bar?.getAttribute('style')).toContain('width: 75%');
});

test('shows phase indicator when phase > 1', async () => {
  await render(<BossHealthBar bossName="Ancient Treant" healthPct={0.5} phase={3} visible={true} />);

  await expect.element(page.getByText('Phase III')).toBeInTheDocument();
});

test('does not show phase indicator for phase 1', async () => {
  const { container } = await render(
    <BossHealthBar bossName="Ancient Treant" healthPct={0.5} phase={1} visible={true} />,
  );

  // No "Phase" text should appear
  const text = container.textContent ?? '';
  expect(text).not.toContain('Phase');
});

test('returns null when not visible', async () => {
  const { container } = await render(
    <BossHealthBar bossName="Ancient Treant" healthPct={0.5} phase={1} visible={false} />,
  );

  expect(container.innerHTML).toBe('');
});

test('returns null when healthPct is 0', async () => {
  const { container } = await render(
    <BossHealthBar bossName="Ancient Treant" healthPct={0} phase={1} visible={true} />,
  );

  expect(container.innerHTML).toBe('');
});
