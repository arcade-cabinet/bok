import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { EnemyHealthBars } from './EnemyHealthBars';

const baseCamera = {
  fov: 75,
  aspect: 16 / 9,
  position: { x: 0, y: 1.6, z: 0 },
};

test('renders nothing when no enemies', async () => {
  const { container } = await render(
    <EnemyHealthBars enemies={[]} camera={baseCamera} canvasWidth={800} canvasHeight={600} playerYaw={0} />,
  );

  expect(container.innerHTML).toBe('');
});

test('renders nothing when all enemies are dead', async () => {
  const { container } = await render(
    <EnemyHealthBars
      enemies={[{ x: 0, y: 0, z: -10, health: 0, maxHealth: 100, type: 'skeleton' }]}
      camera={baseCamera}
      canvasWidth={800}
      canvasHeight={600}
      playerYaw={0}
    />,
  );

  expect(container.innerHTML).toBe('');
});

test('renders health bar with enemy name when visible in front of camera', async () => {
  // Place enemy directly in front of the camera (negative Z in camera space)
  await render(
    <EnemyHealthBars
      enemies={[{ x: 0, y: 1.6, z: -10, health: 80, maxHealth: 100, type: 'forest-goblin' }]}
      camera={baseCamera}
      canvasWidth={800}
      canvasHeight={600}
      playerYaw={0}
    />,
  );

  await expect.element(page.getByText('Forest Goblin')).toBeInTheDocument();
});
