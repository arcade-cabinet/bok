import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { App } from './App';

test('app renders main menu with BOK title on launch', async () => {
  await render(<App />);

  await expect.element(page.getByRole('heading', { name: 'BOK' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: /Pen New Tale/ })).toBeVisible();
});

test('menu flow: open biome grid, select forest (only unlocked biome), configure seed', async () => {
  await render(<App />);

  // Open biome selection
  await page.getByRole('button', { name: /Pen New Tale/ }).click();
  await expect.element(page.getByRole('heading', { name: 'Choose Your Chapter' })).toBeVisible();

  // Forest is the only unlocked biome (no progression)
  await expect.element(page.getByText('Whispering Woods')).toBeInTheDocument();

  // Locked biomes show as ??? (7 of them)
  await expect.element(page.getByText('???').first()).toBeInTheDocument();

  // Forest is already selected by default
  await expect.element(page.getByRole('radio', { name: /Whispering Woods/ })).toBeInTheDocument();

  // Seed input is present with default
  await expect.element(page.getByPlaceholder('Let fate decide...')).toHaveValue('Brave Dark Fox');

  // Begin Writing button is available
  await expect.element(page.getByRole('button', { name: /Begin Writing/ })).toBeVisible();
});
