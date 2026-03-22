import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { App } from './App';

test('full journey: menu → biome select → forest is default → seed input → back to menu', async () => {
  await render(<App />);

  // 1. Main menu
  await expect.element(page.getByRole('heading', { name: 'BOK' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: /Pen New Tale/ })).toBeVisible();

  // 2. Open biome selection
  await page.getByRole('button', { name: /Pen New Tale/ }).click();
  await expect.element(page.getByRole('heading', { name: 'Choose Your Chapter' })).toBeVisible();

  // 3. Forest is available, others are locked
  await expect.element(page.getByText('Whispering Woods')).toBeInTheDocument();
  await expect.element(page.getByText('???').first()).toBeInTheDocument();

  // 4. Forest radio is present and checkable
  const forestRadio = page.getByRole('radio', { name: /Whispering Woods/ });
  await forestRadio.click();
  await expect.element(forestRadio).toBeChecked();

  // 5. Seed input with default
  const seedInput = page.getByPlaceholder('Let fate decide...');
  await expect.element(seedInput).toHaveValue('Brave Dark Fox');

  // 6. Type a custom seed
  await seedInput.clear();
  await seedInput.fill('My Custom Seed 42');
  await expect.element(seedInput).toHaveValue('My Custom Seed 42');

  // 7. Randomize seed
  await page.getByLabelText('Randomize world seed').click();
  await expect.element(seedInput).not.toHaveValue('My Custom Seed 42');
  await expect.element(seedInput).not.toHaveValue('');

  // 8. Begin Writing visible
  await expect.element(page.getByRole('button', { name: /Begin Writing/ })).toBeVisible();

  // 9. Close panel → back to menu
  await page.getByRole('button', { name: /Back to main menu/ }).click();
  await expect.element(page.getByRole('heading', { name: 'BOK' })).toBeVisible();
});

test('Resume Chapter is disabled when no run history exists', async () => {
  await render(<App />);

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

  await expect.element(page.getByRole('button', { name: /Begin Writing/ })).toBeVisible();
});

test('clicking Begin Writing transitions away from menu', async () => {
  await render(<App />);

  await page.getByRole('button', { name: /Pen New Tale/ }).click();
  await page.getByRole('button', { name: /Begin Writing/ }).click();

  await expect.element(page.getByRole('heading', { name: 'BOK' })).not.toBeInTheDocument();
});
