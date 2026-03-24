import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { MinimapMarker } from '../../engine/types';
import { Minimap } from './Minimap';

test('renders canvas element', async () => {
  const { container } = await render(<Minimap playerX={0} playerZ={0} markers={[]} />);

  const canvas = container.querySelector('canvas');
  expect(canvas).not.toBeNull();
  expect(canvas?.getAttribute('width')).toBe('140');
  expect(canvas?.getAttribute('height')).toBe('140');
});

test('renders with markers and reflects counts in aria-label', async () => {
  const markers: MinimapMarker[] = [
    { x: 10, z: 10, type: 'enemy' },
    { x: 20, z: 20, type: 'enemy' },
    { x: 5, z: 5, type: 'chest' },
  ];

  await render(<Minimap playerX={0} playerZ={0} markers={markers} />);

  await expect.element(page.getByRole('img', { name: /2 enemies and 1 chest nearby/ })).toBeInTheDocument();
});

test('renders with no markers showing zero counts', async () => {
  await render(<Minimap playerX={50} playerZ={50} markers={[]} />);

  await expect.element(page.getByRole('img', { name: /0 enemies and 0 chests nearby/ })).toBeInTheDocument();
});
