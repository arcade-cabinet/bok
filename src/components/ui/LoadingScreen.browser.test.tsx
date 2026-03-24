import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { LoadingScreen } from './LoadingScreen';

test('renders loading text', async () => {
  await render(<LoadingScreen />);

  await expect.element(page.getByText('Loading')).toBeVisible();
});

test('renders flavor text', async () => {
  await render(<LoadingScreen />);

  await expect.element(page.getByText('Preparing the realm...')).toBeVisible();
});
