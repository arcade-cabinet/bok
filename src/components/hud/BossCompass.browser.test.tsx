import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { BossCompass } from './BossCompass';

test('renders distance text in meters', async () => {
  await render(<BossCompass playerX={0} playerZ={0} playerYaw={0} bossPosition={{ x: 30, y: 0, z: 40 }} />);

  // distance = sqrt(30^2 + 40^2) = 50
  await expect.element(page.getByText('50m')).toBeInTheDocument();
});

test('shows Boss label', async () => {
  await render(<BossCompass playerX={0} playerZ={0} playerYaw={0} bossPosition={{ x: 10, y: 0, z: 0 }} />);

  await expect.element(page.getByText('Boss', { exact: true })).toBeInTheDocument();
});

test('renders directional arrow SVG', async () => {
  const { container } = await render(
    <BossCompass playerX={0} playerZ={0} playerYaw={0} bossPosition={{ x: 10, y: 0, z: 0 }} />,
  );

  const svg = container.querySelector('svg[role="img"]');
  expect(svg).not.toBeNull();
  expect(svg?.getAttribute('aria-label')).toBe('Directional arrow pointing toward boss');
});
