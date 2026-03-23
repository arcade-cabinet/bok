/**
 * Browser tests for the complete game flow as defined in the v2 spec.
 * These describe what the game SHOULD do -- implementation follows.
 */
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { App } from './App';

test('main menu shows BOK title and navigation buttons', async () => {
  await render(<App />);

  await expect.element(page.getByRole('heading', { name: 'BOK' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: /New Game/ })).toBeVisible();
  await expect.element(page.getByRole('button', { name: /Inscriptions/ })).toBeVisible();
});

test('New Game shows seed input and mode toggle without biome selection', async () => {
  await render(<App />);

  await page.getByRole('button', { name: /New Game/ }).click();
  await expect.element(page.getByText('Begin a New Tale')).toBeVisible();

  // Mode buttons exist
  await expect.element(page.getByText('Survival')).toBeInTheDocument();
  await expect.element(page.getByText('Creative')).toBeInTheDocument();

  // Seed input with default
  await expect.element(page.getByPlaceholder('Let fate decide...')).toHaveValue('Brave Dark Fox');

  // No biome selection in the new game flow
  expect(page.getByText('Choose Your Chapter').elements()).toHaveLength(0);
  expect(page.getByText('Whispering Woods').elements()).toHaveLength(0);
});

test('Inscriptions button opens tome page browser', async () => {
  await render(<App />);

  await page.getByRole('button', { name: /Inscriptions/ }).click();

  // Tome page browser should open showing all 8 abilities
  // Most should be locked for a new player
  await expect.element(page.getByText('Locked').first()).toBeInTheDocument();
});

test('version badge shows current version', async () => {
  await render(<App />);

  await expect.element(page.getByText(/Edition 0\.\d+\.\d+/)).toBeInTheDocument();
});
