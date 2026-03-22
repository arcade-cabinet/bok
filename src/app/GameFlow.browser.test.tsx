/**
 * Browser tests for the complete game flow as defined in the v2 spec.
 * These describe what the game SHOULD do — implementation follows.
 */
import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { App } from './App';

test('main menu shows BOK title, mode toggle, and navigation', async () => {
  await render(<App />);

  await expect.element(page.getByRole('heading', { name: 'BOK' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: /Pen New Tale/ })).toBeVisible();
  await expect.element(page.getByRole('button', { name: /Resume Chapter/ })).toBeVisible();
  await expect.element(page.getByRole('button', { name: /Inscriptions/ })).toBeVisible();
});

test('Pen New Tale shows biome grid with mode toggle', async () => {
  await render(<App />);

  await page.getByRole('button', { name: /Pen New Tale/ }).click();
  await expect.element(page.getByText('Choose Your Chapter')).toBeVisible();

  // Mode buttons exist
  await expect.element(page.getByText('Survival')).toBeInTheDocument();
  await expect.element(page.getByText('Creative')).toBeInTheDocument();

  // Forest is always available
  await expect.element(page.getByText('Whispering Woods')).toBeInTheDocument();

  // Seed input with default
  await expect.element(page.getByPlaceholder('Let fate decide...')).toHaveValue('Brave Dark Fox');
});

test('Creative mode unlocks all 8 biomes', async () => {
  await render(<App />);

  await page.getByRole('button', { name: /Pen New Tale/ }).click();

  // Switch to Creative
  await page.getByText('Creative').click();

  // All biomes should be selectable (no ??? locked cards)
  await expect.element(page.getByText('Whispering Woods')).toBeInTheDocument();
  await expect.element(page.getByText('Sunscorched Dunes')).toBeInTheDocument();
  await expect.element(page.getByText('Frostbite Expanse')).toBeInTheDocument();
  await expect.element(page.getByText('Cinderpeak Caldera')).toBeInTheDocument();
  await expect.element(page.getByText('Rothollow Marsh')).toBeInTheDocument();
  await expect.element(page.getByText('Prismatic Depths')).toBeInTheDocument();
  await expect.element(page.getByText('Stormspire Remnants')).toBeInTheDocument();
  await expect.element(page.getByText('Abyssal Trench')).toBeInTheDocument();
});

test('Survival mode locks biomes behind progression', async () => {
  await render(<App />);

  await page.getByRole('button', { name: /Pen New Tale/ }).click();

  // Survival is default — only forest available
  await expect.element(page.getByText('Whispering Woods')).toBeInTheDocument();
  // Locked biomes show ???
  await expect.element(page.getByText('???').first()).toBeInTheDocument();
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
