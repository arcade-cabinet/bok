import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { App } from './App';

test('full journey: menu → biome select → all 8 biomes visible → select biome → seed input → back to menu', async () => {
  await render(<App />);

  // 1. Main menu loads with BOK title
  await expect.element(page.getByRole('heading', { name: 'BOK' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: /Pen New Tale/ })).toBeVisible();

  // 2. Click "Pen New Tale" to open biome selection
  await page.getByRole('button', { name: /Pen New Tale/ }).click();
  await expect.element(page.getByRole('heading', { name: 'Choose Your Chapter' })).toBeVisible();

  // 3. Verify all 8 biomes are shown
  const biomeNames = [
    'Whispering Woods',
    'Sunscorched Dunes',
    'Frostbite Expanse',
    'Cinderpeak Caldera',
    'Rothollow Marsh',
    'Prismatic Depths',
    'Stormspire Remnants',
    'Abyssal Trench',
  ];
  for (const name of biomeNames) {
    await expect.element(page.getByText(name)).toBeInTheDocument();
  }

  // 4. Select a biome (Sunscorched Dunes) — biomes use role="radio"
  await page.getByRole('radio', { name: /Sunscorched Dunes/ }).click();
  await expect.element(page.getByRole('radio', { name: /Sunscorched Dunes/ })).toBeChecked();

  // 5. Verify seed input is present with default value
  const seedInput = page.getByPlaceholder('Let fate decide...');
  await expect.element(seedInput).toHaveValue('Brave Dark Fox');

  // 6. Type a custom seed
  await seedInput.clear();
  await seedInput.fill('My Custom Seed 42');
  await expect.element(seedInput).toHaveValue('My Custom Seed 42');

  // 7. Click the dice button to randomize seed
  await page.getByLabelText('Randomize world seed').click();
  // Seed should have changed from our custom value
  await expect.element(seedInput).not.toHaveValue('My Custom Seed 42');
  // Seed should not be empty
  await expect.element(seedInput).not.toHaveValue('');

  // 8. Verify "Begin Writing" button is visible
  await expect.element(page.getByRole('button', { name: /Begin Writing/ })).toBeVisible();

  // 9. Close the new game panel (back button) — returns to main menu
  await page.getByRole('button', { name: /Back to main menu/ }).click();
  await expect.element(page.getByRole('heading', { name: 'BOK' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: /Pen New Tale/ })).toBeVisible();
});

test('each biome can be individually selected via radio buttons', async () => {
  await render(<App />);

  await page.getByRole('button', { name: /Pen New Tale/ }).click();
  await expect.element(page.getByRole('heading', { name: 'Choose Your Chapter' })).toBeVisible();

  const biomes = [
    'Whispering Woods',
    'Sunscorched Dunes',
    'Frostbite Expanse',
    'Cinderpeak Caldera',
    'Rothollow Marsh',
    'Prismatic Depths',
    'Stormspire Remnants',
    'Abyssal Trench',
  ];

  for (const name of biomes) {
    const radio = page.getByRole('radio', { name: new RegExp(name) });
    await radio.click();
    await expect.element(radio).toBeChecked();
  }
});

test('Resume Chapter is disabled when no run history exists', async () => {
  await render(<App />);

  // Resume Chapter should be present but disabled (no run history)
  const resumeBtn = page.getByRole('button', { name: /Resume Chapter/ });
  await expect.element(resumeBtn).toBeVisible();
  await expect.element(resumeBtn).toBeDisabled();
});

test('seed input allows typing a custom value', async () => {
  await render(<App />);

  await page.getByRole('button', { name: /Pen New Tale/ }).click();

  const seedInput = page.getByPlaceholder('Let fate decide...');
  await seedInput.clear();
  await seedInput.fill('TestSeed123');
  await expect.element(seedInput).toHaveValue('TestSeed123');

  // Select a biome first (use radio role)
  await page.getByRole('radio', { name: /Frostbite Expanse/ }).click();

  // Begin Writing should be clickable
  await expect.element(page.getByRole('button', { name: /Begin Writing/ })).toBeVisible();
});

test('clicking Begin Writing transitions away from menu', async () => {
  await render(<App />);

  await page.getByRole('button', { name: /Pen New Tale/ }).click();
  // Forest is selected by default, just click Begin Writing
  await page.getByRole('button', { name: /Begin Writing/ }).click();

  // After clicking Begin Writing, the menu heading should no longer be visible
  // (the app transitions to hub view which requires WebGL — loading screen may show)
  await expect.element(page.getByRole('heading', { name: 'BOK' })).not.toBeInTheDocument();
});
