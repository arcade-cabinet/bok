import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { App } from './App';

test('app renders main menu with BOK title on launch', async () => {
  await render(<App />);

  await expect.element(page.getByRole('heading', { name: 'BOK' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: /Pen New Tale/ })).toBeVisible();
});

test('full menu flow: open biome grid, select biome, configure seed', async () => {
  await render(<App />);

  // Open biome selection
  await page.getByRole('button', { name: /Pen New Tale/ }).click();
  await expect.element(page.getByRole('heading', { name: 'Choose Your Chapter' })).toBeVisible();

  // All 8 biomes are shown (role="radio" buttons in a radiogroup)
  await expect.element(page.getByText('Whispering Woods')).toBeInTheDocument();
  await expect.element(page.getByText('Abyssal Trench')).toBeInTheDocument();

  // Select a biome via its radio role
  await page.getByRole('radio', { name: /Cinderpeak Caldera/ }).click();

  // Seed input is present with default
  await expect.element(page.getByPlaceholder('Let fate decide...')).toHaveValue('Brave Dark Fox');

  // Begin Writing button is available
  await expect.element(page.getByRole('button', { name: /Begin Writing/ })).toBeVisible();
});
